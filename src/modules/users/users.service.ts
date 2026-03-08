// src/modules/users/users.service.ts
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateVendeurDto } from './dto/update-vendeur.dto';
import { UpdateLivreurDto } from './dto/update-livreur.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ─── Profil complet ────────────────────────────────────
  async getProfile(userId: string) {
    const user = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
      include: {
        roles: true,
        profilVendeur: true,
        profilLivreur: true,
        adresses: {
          where: { deletedAt: null },
          orderBy: { estPrincipale: 'desc' },
        },
        pointsFidelite: true,
        _count: {
          select: {
            commandesClient: true,
            favoris: true,
            avis: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const { motDePasse, ...rest } = user;
    return rest;
  }

  // ─── Modifier profil ───────────────────────────────────
  async updateProfile(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.utilisateur.update({
      where: { id: userId },
      data: dto,
      include: { roles: true },
    });

    const { motDePasse, ...rest } = user;
    return rest;
  }

  // ─── Modifier profil vendeur ───────────────────────────
  async updateProfilVendeur(userId: string, dto: UpdateVendeurDto) {
    const profilVendeur = await this.prisma.profilVendeur.findUnique({
      where: { utilisateurId: userId },
    });

    if (!profilVendeur) {
      throw new NotFoundException('Profil vendeur introuvable');
    }

    return this.prisma.profilVendeur.update({
      where: { utilisateurId: userId },
      data: dto,
    });
  }

  // ─── Modifier profil livreur ───────────────────────────
  async updateProfilLivreur(userId: string, dto: UpdateLivreurDto) {
    const profilLivreur = await this.prisma.profilLivreur.findUnique({
      where: { utilisateurId: userId },
    });

    if (!profilLivreur) {
      throw new NotFoundException('Profil livreur introuvable');
    }

    return this.prisma.profilLivreur.update({
      where: { utilisateurId: userId },
      data: dto,
    });
  }

  // ─── Adresses ──────────────────────────────────────────
  async getAdresses(userId: string) {
    return this.prisma.adresse.findMany({
      where: { utilisateurId: userId, deletedAt: null },
      orderBy: { estPrincipale: 'desc' },
    });
  }

  async addAdresse(
    userId: string,
    data: {
      nom: string;
      rue: string;
      quartier: string;
      ville: string;
      latitude: number;
      longitude: number;
      estPrincipale?: boolean;
    },
  ) {
    if (data.estPrincipale) {
      await this.prisma.adresse.updateMany({
        where: { utilisateurId: userId },
        data: { estPrincipale: false },
      });
    }

    return this.prisma.adresse.create({
      data: { ...data, utilisateurId: userId },
    });
  }

  async deleteAdresse(userId: string, adresseId: string) {
    const adresse = await this.prisma.adresse.findFirst({
      where: { id: adresseId, utilisateurId: userId },
    });

    if (!adresse) throw new NotFoundException('Adresse introuvable');

    await this.prisma.adresse.update({
      where: { id: adresseId },
      data: { deletedAt: new Date() },
    });

    return { message: 'Adresse supprimée' };
  }

  // ─── Favoris ───────────────────────────────────────────
  async getFavoris(userId: string, page = 1, limit = 15) {
    const skip = (page - 1) * limit;

    const [favoris, total] = await Promise.all([
      this.prisma.favori.findMany({
        where: { utilisateurId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          produit: {
            include: {
              medias: {
                orderBy: { ordre: 'asc' },
                take: 1,
              },
              vendeur: {
                select: { nomBoutique: true, logo: true },
              },
            },
          },
        },
      }),
      this.prisma.favori.count({ where: { utilisateurId: userId } }),
    ]);

    return { data: favoris, total, page, limit };
  }

  // ─── Historique commandes ──────────────────────────────
  async getHistoriqueCommandes(userId: string, page = 1, limit = 15) {
    const skip = (page - 1) * limit;

    const [commandes, total] = await Promise.all([
      this.prisma.commande.findMany({
        where: { clientId: userId, deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          lignes: {
            include: {
              produit: {
                include: {
                  medias: { take: 1, orderBy: { ordre: 'asc' } },
                },
              },
            },
          },
          livraison: true,
          vendeur: {
            select: { nomBoutique: true, logo: true },
          },
        },
      }),
      this.prisma.commande.count({
        where: { clientId: userId, deletedAt: null },
      }),
    ]);

    return { data: commandes, total, page, limit };
  }

  // ─── Points fidélité ───────────────────────────────────
  async getPointsFidelite(userId: string) {
    return this.prisma.pointsFidelite.findUnique({
      where: { utilisateurId: userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
  }

  // ─── Admin : liste utilisateurs ────────────────────────
  async getAllUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { nom: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.utilisateur.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { roles: true },
      }),
      this.prisma.utilisateur.count({ where }),
    ]);

    // Exclure le mot de passe de la réponse
    const usersWithoutPassword = users.map(({ motDePasse, ...rest }) => rest);

    return { data: usersWithoutPassword, total, page, limit };
  }

  // ─── Admin : désactiver utilisateur ───────────────────
  async toggleUserStatus(userId: string) {
    const user = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const updatedUser = await this.prisma.utilisateur.update({
      where: { id: userId },
      data: { estActif: !user.estActif },
    });

    const { motDePasse, ...rest } = updatedUser;
    return rest;
  }
}
