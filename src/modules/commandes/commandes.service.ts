// src/modules/commandes/commandes.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { StatutCommande } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CalculerLivraisonDto, CreateCommandeDto } from '../commandes/dto/commande.dto';

@Injectable()
export class CommandesService {
  constructor(private prisma: PrismaService) {}

  async calculerLivraison(dto: CalculerLivraisonDto) {
    const zones = await this.prisma.zoneLivraison.findMany({
      where: { vendeurId: dto.vendeurId, estActif: true },
      orderBy: { rayonMax: 'asc' }, // ✅ rayonMax
    });

    if (!zones.length) {
      return { disponible: false, message: 'Vendeur sans zones de livraison' };
    }

    const zone = zones[0];

    return {
      disponible: true,
      zone: zone.nom,
      frais: zone.prix,           // ✅ prix
      distanceMax: zone.rayonMax, // ✅ rayonMax
    };
  }

  async creerCommande(userId: string, dto: CreateCommandeDto) {
    const adresse = await this.prisma.adresse.findFirst({
      where: { id: dto.adresseId, utilisateurId: userId, deletedAt: null },
    });

    if (!adresse) throw new NotFoundException('Adresse introuvable');

    const panier = await this.prisma.panier.findUnique({
      where: { utilisateurId: userId },
      include: {
        lignes: {
          include: {
            produit: { include: { vendeur: true } },
          },
        },
      },
    });

    if (!panier || panier.lignes.length === 0) {
      throw new BadRequestException('Panier vide');
    }

    let sousTotal = 0;
    for (const ligne of panier.lignes) {
      if (!ligne.produit.estDisponible || ligne.produit.deletedAt) {
        throw new BadRequestException(
          `"${ligne.produit.nom}" n'est plus disponible`,
        );
      }
      if (ligne.produit.stock < ligne.quantite) {
        throw new BadRequestException(
          `Stock insuffisant pour "${ligne.produit.nom}"`,
        );
      }
      sousTotal +=
        (ligne.produit.prixPromo || ligne.produit.prix) * ligne.quantite;
    }

    let reduction = 0;
    let codePromoId: string | undefined;

    if (dto.codePromo) {
      const promo = await this.prisma.codePromo.findUnique({
        where: { code: dto.codePromo },
      });

      if (
        promo &&
        promo.estActif &&
        promo.usagesActuels < promo.usagesMax &&   // ✅ usagesActuels / usagesMax
        new Date() < promo.dateExpiration
      ) {
        if (promo.type === 'POURCENTAGE') {
          reduction = (sousTotal * promo.valeur) / 100;
        } else {
          reduction = promo.valeur;
        }
        codePromoId = promo.id;
      }
    }

    const montantLivraison = 1000;
    const montantCommission = (sousTotal * 8) / 100;
    const montantTotal = sousTotal - reduction + montantLivraison;

    const vendeurId = panier.lignes[0].produit.vendeurId;
    const numero = `TT-${Date.now().toString(36).toUpperCase()}`;

    const commande = await this.prisma.$transaction(async (tx) => {
      const cmd = await tx.commande.create({
        data: {
          numero,
          clientId: userId,
          vendeurId,
          adresseId: dto.adresseId,
          montantTotal,               // ✅
          montantLivraison,           // ✅
          reductionAppliquee: reduction, // ✅
          montantCommission,          // ✅
          codePromoId,
          lignes: {
            create: panier.lignes.map((ligne) => ({
              produitId: ligne.produitId,
              quantite: ligne.quantite,
              prixUnitaire:
                ligne.produit.prixPromo || ligne.produit.prix,
              sousTotal:
                (ligne.produit.prixPromo || ligne.produit.prix) *
                ligne.quantite,
            })),
          },
        },
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
          vendeur: { select: { nomBoutique: true, logo: true } },
          adresse: true,
        },
      });

      for (const ligne of panier.lignes) {
        await tx.produit.update({
          where: { id: ligne.produitId },
          data: { stock: { decrement: ligne.quantite } },
        });
      }

      await tx.lignePanier.deleteMany({ where: { panierId: panier.id } });

      if (codePromoId) {
        await tx.codePromo.update({
          where: { id: codePromoId },
          data: { usagesActuels: { increment: 1 } }, // ✅
        });
      }

      return cmd;
    });

    return commande;
  }

  async mesCommandes(userId: string, page = 1, limit = 15) {
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
          vendeur: { select: { nomBoutique: true, logo: true } },
        },
      }),
      this.prisma.commande.count({
        where: { clientId: userId, deletedAt: null },
      }),
    ]);

    return { data: commandes, total, page, limit };
  }

  async commandesVendeur(vendeurUserId: string, page = 1, limit = 15) {
    const profil = await this.prisma.profilVendeur.findUnique({
      where: { utilisateurId: vendeurUserId },
    });

    if (!profil) throw new ForbiddenException('Profil vendeur introuvable');

    const skip = (page - 1) * limit;

    const [commandes, total] = await Promise.all([
      this.prisma.commande.findMany({
        where: { vendeurId: profil.id, deletedAt: null },
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
          client: { select: { nom: true, telephone: true, avatar: true } },
          adresse: true,
          livraison: true,
        },
      }),
      this.prisma.commande.count({
        where: { vendeurId: profil.id, deletedAt: null },
      }),
    ]);

    return { data: commandes, total, page, limit };
  }

  async getCommande(commandeId: string, userId: string) {
    const commande = await this.prisma.commande.findFirst({
      where: {
        id: commandeId,
        deletedAt: null,
        OR: [
          { clientId: userId },
          { vendeur: { utilisateurId: userId } },
        ],
      },
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
        client: { select: { nom: true, telephone: true, avatar: true } },
        vendeur: {
          select: {
            nomBoutique: true,
            logo: true,
            utilisateur: { select: { telephone: true } },
          },
        },
        adresse: true,
        livraison: true,
        paiement: true,
      },
    });

    if (!commande) throw new NotFoundException('Commande introuvable');
    return commande;
  }

  async updateStatut(
    commandeId: string,
    vendeurUserId: string,
    statut: StatutCommande,
  ) {
    const profil = await this.prisma.profilVendeur.findUnique({
      where: { utilisateurId: vendeurUserId },
    });

    if (!profil) throw new ForbiddenException('Accès refusé');

    const commande = await this.prisma.commande.findFirst({
      where: { id: commandeId, vendeurId: profil.id, deletedAt: null },
    });

    if (!commande) throw new NotFoundException('Commande introuvable');

    return this.prisma.commande.update({
      where: { id: commandeId },
      data: { statut },
    });
  }

  async annulerCommande(commandeId: string, userId: string) {
    const commande = await this.prisma.commande.findFirst({
      where: {
        id: commandeId,
        clientId: userId,
        deletedAt: null,
        statut: { in: ['EN_ATTENTE_PAIEMENT', 'PAYEE'] },
      },
      include: { lignes: true },
    });

    if (!commande) {
      throw new NotFoundException(
        'Commande introuvable ou ne peut pas être annulée',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.commande.update({
        where: { id: commandeId },
        data: { statut: 'ANNULEE' },
      });

      for (const ligne of commande.lignes) {
        await tx.produit.update({
          where: { id: ligne.produitId },
          data: { stock: { increment: ligne.quantite } },
        });
      }
    });

    return { message: 'Commande annulée' };
  }
}