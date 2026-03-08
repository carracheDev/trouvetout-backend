// src/modules/auth/auth.service.ts
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RoleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // ─── Inscription ───────────────────────────────────────
  async register(dto: RegisterDto) {
    // Vérifier email existant
    const existingUser = await this.prisma.utilisateur.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(dto.motDePasse, 12);

    // Créer l'utilisateur avec rôle CLIENT par défaut
    const user = await this.prisma.utilisateur.create({
      data: {
        nom: dto.nom,
        email: dto.email,
        motDePasse: hashedPassword,
        telephone: dto.telephone,
        roles: {
          create: { type: RoleType.CLIENT },
        },
        panier: { create: {} },
        pointsFidelite: { create: {} },
      },
      include: { roles: true },
    });

    const tokens = await this.generateTokens(
      user.id,
      user.roles.map((r) => r.type),
    );

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  // ─── Connexion ─────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.prisma.utilisateur.findUnique({
      where: { email: dto.email },
      include: { roles: true },
    });

    if (!user || !user.motDePasse) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    if (!user.estActif) {
      throw new UnauthorizedException('Compte désactivé');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.motDePasse,
      user.motDePasse,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const tokens = await this.generateTokens(
      user.id,
      user.roles.map((r) => r.type),
    );

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  // ─── Refresh Token ─────────────────────────────────────
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const user = await this.prisma.utilisateur.findUnique({
        where: { id: payload.sub },
        include: { roles: true },
      });

      if (!user || !user.estActif) {
        throw new UnauthorizedException('Token invalide');
      }

      const tokens = await this.generateTokens(
        user.id,
        user.roles.map((r) => r.type),
      );

      return tokens;
    } catch {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }
  }

  // ─── Activer Boutique ──────────────────────────────────
  async activerBoutique(userId: string, nomBoutique: string) {
    // Vérifier si déjà vendeur
    const roleExistant = await this.prisma.role.findFirst({
      where: { utilisateurId: userId, type: RoleType.VENDEUR },
    });

    if (roleExistant) {
      throw new ConflictException('Boutique déjà activée');
    }

    // Créer profil vendeur + rôle
    const [profilVendeur] = await this.prisma.$transaction([
      this.prisma.profilVendeur.create({
        data: {
          utilisateurId: userId,
          nomBoutique,
        },
      }),
      this.prisma.role.create({
        data: {
          utilisateurId: userId,
          type: RoleType.VENDEUR,
        },
      }),
    ]);

    // Générer nouveaux tokens avec rôle VENDEUR
    const user = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    const tokens = await this.generateTokens(
      userId,
      user.roles.map((r) => r.type),
    );

    return { profilVendeur, ...tokens };
  }

  // ─── Devenir Livreur ───────────────────────────────────
  async devenirLivreur(userId: string, numeroMobileMoney: string) {
    const roleExistant = await this.prisma.role.findFirst({
      where: { utilisateurId: userId, type: RoleType.LIVREUR },
    });

    if (roleExistant) {
      throw new ConflictException('Déjà inscrit comme livreur');
    }

    const [profilLivreur] = await this.prisma.$transaction([
      this.prisma.profilLivreur.create({
        data: {
          utilisateurId: userId,
          numeroMobileMoney,
        },
      }),
      this.prisma.role.create({
        data: {
          utilisateurId: userId,
          type: RoleType.LIVREUR,
        },
      }),
    ]);

    const user = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    const tokens = await this.generateTokens(
      userId,
      user.roles.map((r) => r.type),
    );

    return { profilLivreur, ...tokens };
  }

  // ─── Update FCM Token ──────────────────────────────────
  async updateFcmToken(userId: string, fcmToken: string) {
    await this.prisma.utilisateur.update({
      where: { id: userId },
      data: { fcmToken },
    });
    return { message: 'FCM token mis à jour' };
  }

  // ─── Utilitaires ───────────────────────────────────────
  private async generateTokens(userId: string, roles: RoleType[]) {
    const payload = { sub: userId, roles };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'default-secret',
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: any) {
    const { motDePasse, ...rest } = user;
    return rest;
  }
}