// src/modules/panier/panier.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AddPanierDto, UpdateQuantiteDto } from './dto/panier.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PanierService {
  constructor(private prisma: PrismaService) {}

  async getPanier(userId: string) {
    const panier = await this.prisma.panier.findUnique({
      where: { utilisateurId: userId },
      include: {
        lignes: {
          include: {
            produit: {
              include: {
                medias: { take: 1, orderBy: { ordre: 'asc' } },
                vendeur: {
                  select: { id: true, nomBoutique: true, logo: true },
                },
              },
            },
          },
        },
      },
    });

    if (!panier) return { lignes: [], total: 0, nombreArticles: 0 };

    const total = panier.lignes.reduce(
      (acc, ligne) =>
        acc + (ligne.produit.prixPromo || ligne.produit.prix) * ligne.quantite,
      0,
    );

    const nombreArticles = panier.lignes.reduce(
      (acc, ligne) => acc + ligne.quantite,
      0,
    );

    return { ...panier, total, nombreArticles };
  }

  async addItem(userId: string, dto: AddPanierDto) {
    const produit = await this.prisma.produit.findFirst({
      where: { id: dto.produitId, deletedAt: null, estDisponible: true },
    });

    if (!produit) throw new NotFoundException('Produit introuvable');
    if (produit.stock < dto.quantite) {
      throw new BadRequestException(
        `Stock insuffisant (disponible: ${produit.stock})`,
      );
    }

    let panier = await this.prisma.panier.findUnique({
      where: { utilisateurId: userId },
    });

    if (!panier) {
      panier = await this.prisma.panier.create({
        data: { utilisateurId: userId },
      });
    }

    const ligneExistante = await this.prisma.lignePanier.findUnique({
      where: {
        panierId_produitId: { panierId: panier.id, produitId: dto.produitId },
      },
    });

    if (ligneExistante) {
      const nouvelleQte = ligneExistante.quantite + dto.quantite;
      if (produit.stock < nouvelleQte) {
        throw new BadRequestException(
          `Stock insuffisant (disponible: ${produit.stock})`,
        );
      }
      await this.prisma.lignePanier.update({
        where: { id: ligneExistante.id },
        data: { quantite: nouvelleQte },
      });
    } else {
      await this.prisma.lignePanier.create({
        data: {
          panierId: panier.id,
          produitId: dto.produitId,
          quantite: dto.quantite,
          // ✅ pas de prixUnitaire — champ inexistant dans le schéma
        },
      });
    }

    return this.getPanier(userId);
  }

  async updateQuantite(userId: string, ligneId: string, dto: UpdateQuantiteDto) {
    const panier = await this.prisma.panier.findUnique({
      where: { utilisateurId: userId },
    });

    if (!panier) throw new NotFoundException('Panier introuvable');

    const ligne = await this.prisma.lignePanier.findFirst({
      where: { id: ligneId, panierId: panier.id },
      include: { produit: true },
    });

    if (!ligne) throw new NotFoundException('Article introuvable');

    if (ligne.produit.stock < dto.quantite) {
      throw new BadRequestException(
        `Stock insuffisant (disponible: ${ligne.produit.stock})`,
      );
    }

    await this.prisma.lignePanier.update({
      where: { id: ligneId },
      data: { quantite: dto.quantite },
    });

    return this.getPanier(userId);
  }

  async removeItem(userId: string, ligneId: string) {
    const panier = await this.prisma.panier.findUnique({
      where: { utilisateurId: userId },
    });

    if (!panier) throw new NotFoundException('Panier introuvable');

    await this.prisma.lignePanier.deleteMany({
      where: { id: ligneId, panierId: panier.id },
    });

    return this.getPanier(userId);
  }

  async clearPanier(userId: string) {
    const panier = await this.prisma.panier.findUnique({
      where: { utilisateurId: userId },
    });

    if (panier) {
      await this.prisma.lignePanier.deleteMany({
        where: { panierId: panier.id },
      });
    }

    return { message: 'Panier vidé' };
  }
}