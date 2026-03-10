// src/modules/livraisons/livraisons.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AccepterLivraisonDto,
  UpdateStatutLivraisonDto,
  UpdatePositionDto,
  NoterLivraisonDto,
} from './dto/livraison.dto';
import { StatutLivraison, StatutCommande } from '@prisma/client';

@Injectable()
export class LivraisonsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ─── Livraisons disponibles (livreur) ─────────────────
  async getLivraisonsDisponibles(livreurUserId: string) {
    const profil = await this.getProfilLivreur(livreurUserId);

    if (!profil.estDisponible) {
      throw new BadRequestException(
        'Activez votre disponibilité pour voir les livraisons',
      );
    }

    return this.prisma.commande.findMany({
      where: {
        statut: StatutCommande.PRETE,
        livraison: null,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        adresse: true,
        vendeur: {
          select: {
            nomBoutique: true,
            utilisateur: {
              select: {
                nom: true,
                telephone: true,
                adresses: {
                  where: { estPrincipale: true },
                  take: 1,
                },
              },
            },
          },
        },
        lignes: {
          include: {
            produit: {
              include: { medias: { take: 1 } },
            },
          },
        },
      },
    });
  }

  // ─── Accepter une livraison ────────────────────────────
  async accepterLivraison(livreurUserId: string, dto: AccepterLivraisonDto) {
    const profil = await this.getProfilLivreur(livreurUserId);

    const commande = await this.prisma.commande.findFirst({
      where: {
        id: dto.commandeId,
        statut: StatutCommande.PRETE,
        livraison: null,
        deletedAt: null,
      },
      include: {
        adresse: true,
        vendeur: {
          include: {
            utilisateur: {
              include: {
                adresses: { where: { estPrincipale: true }, take: 1 },
              },
            },
          },
        },
        client: { select: { id: true, nom: true } },
      },
    });

    if (!commande) {
      throw new NotFoundException('Commande introuvable ou déjà prise');
    }

    const adresseVendeur = commande.vendeur.utilisateur.adresses[0];

    const livraison = await this.prisma.livraison.create({
      data: {
        commandeId: dto.commandeId,
        livreurId: profil.id,
        statut: StatutLivraison.ACCEPTEE,
        adresseDepart: adresseVendeur
          ? `${adresseVendeur.rue}, ${adresseVendeur.quartier}, ${adresseVendeur.ville}`
          : commande.vendeur.nomBoutique,
        adresseArrivee: `${commande.adresse.rue}, ${commande.adresse.quartier}, ${commande.adresse.ville}`,
        latitudeDepart: adresseVendeur?.latitude,
        longitudeDepart: adresseVendeur?.longitude,
        latitudeArrivee: commande.adresse.latitude,
        longitudeArrivee: commande.adresse.longitude,
        montant: 1000,
      },
    });

    // Mettre à jour statut commande
    await this.prisma.commande.update({
      where: { id: dto.commandeId },
      data: { statut: StatutCommande.EN_LIVRAISON },
    });

    // Notifier client
    await this.notifications.notifStatutCommande(
      commande.client.id,
      commande.numero,
      'EN_LIVRAISON',
    );

    return livraison;
  }

  // ─── Mes livraisons (livreur) ──────────────────────────
  async mesLivraisons(livreurUserId: string, page = 1, limit = 15) {
    const profil = await this.getProfilLivreur(livreurUserId);
    const skip = (page - 1) * limit;

    const [livraisons, total] = await Promise.all([
      this.prisma.livraison.findMany({
        where: { livreurId: profil.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          commande: {
            include: {
              client: { select: { nom: true, telephone: true, avatar: true } },
              vendeur: { select: { nomBoutique: true } },
              lignes: {
                include: {
                  produit: { include: { medias: { take: 1 } } },
                },
              },
            },
          },
        },
      }),
      this.prisma.livraison.count({ where: { livreurId: profil.id } }),
    ]);

    return { data: livraisons, total, page, limit };
  }

  // ─── Détail livraison ──────────────────────────────────
  async getLivraison(livraisonId: string, userId: string) {
    const livraison = await this.prisma.livraison.findFirst({
      where: {
        id: livraisonId,
        OR: [
          { livreur: { utilisateurId: userId } },
          { commande: { clientId: userId } },
          { commande: { vendeur: { utilisateurId: userId } } },
        ],
      },
      include: {
        commande: {
          include: {
            client: { select: { nom: true, telephone: true, avatar: true } },
            vendeur: {
              select: {
                nomBoutique: true,
                utilisateur: { select: { telephone: true } },
              },
            },
            adresse: true,
            lignes: {
              include: {
                produit: { include: { medias: { take: 1 } } },
              },
            },
          },
        },
        livreur: {
          select: {
            noteMoyenne: true,
            utilisateur: {
              select: { nom: true, telephone: true, avatar: true },
            },
          },
        },
        positions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!livraison) throw new NotFoundException('Livraison introuvable');
    return livraison;
  }

  // ─── Mettre à jour statut livraison ───────────────────
  async updateStatut(
    livraisonId: string,
    livreurUserId: string,
    dto: UpdateStatutLivraisonDto,
  ) {
    const profil = await this.getProfilLivreur(livreurUserId);

    const livraison = await this.prisma.livraison.findFirst({
      where: { id: livraisonId, livreurId: profil.id },
      include: {
        commande: {
          include: {
            client: { select: { id: true } },
            vendeur: { select: { utilisateurId: true } },
          },
        },
      },
    });

    if (!livraison) throw new NotFoundException('Livraison introuvable');

    const updateData: any = { statut: dto.statut };

    if (dto.statut === StatutLivraison.COLIS_RECUPERE) {
      updateData.photoRecuperation = dto.photo;
    }

    if (dto.statut === StatutLivraison.LIVREE) {
      updateData.photoLivraison = dto.photo;

      // Mettre à jour commande
      await this.prisma.commande.update({
        where: { id: livraison.commandeId },
        data: { statut: StatutCommande.LIVREE },
      });

      // Stats livreur
      await this.prisma.profilLivreur.update({
        where: { id: profil.id },
        data: {
          totalLivraisons: { increment: 1 },
          totalRevenu: { increment: livraison.montant },
        },
      });

      // Notifier client
      await this.notifications.notifStatutCommande(
        livraison.commande.client.id,
        livraison.commande.numero,
        'LIVREE',
      );
    }

    if (dto.statut === StatutLivraison.EN_ROUTE_VENDEUR) {
      await this.notifications.sendToUser(
        livraison.commande.vendeur.utilisateurId,
        '🚴 Livreur en route',
        'Le livreur arrive pour récupérer votre colis',
        'LIVRAISON' as any,
      );
    }

    return this.prisma.livraison.update({
      where: { id: livraisonId },
      data: updateData,
    });
  }

  // ─── Mettre à jour position GPS ───────────────────────
  async updatePosition(
    livraisonId: string,
    livreurUserId: string,
    dto: UpdatePositionDto,
  ) {
    const profil = await this.getProfilLivreur(livreurUserId);

    const livraison = await this.prisma.livraison.findFirst({
      where: { id: livraisonId, livreurId: profil.id },
    });

    if (!livraison) throw new NotFoundException('Livraison introuvable');

    // Sauvegarder position
    await this.prisma.positionGPS.create({
      data: {
        livreurId: profil.id,
        livraisonId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        vitesse: dto.vitesse,
      },
    });

    // Mettre à jour position actuelle
    await Promise.all([
      this.prisma.livraison.update({
        where: { id: livraisonId },
        data: {
          latitudeActuelle: dto.latitude,
          longitudeActuelle: dto.longitude,
        },
      }),
      this.prisma.profilLivreur.update({
        where: { id: profil.id },
        data: {
          latitudeActuelle: dto.latitude,
          longitudeActuelle: dto.longitude,
        },
      }),
    ]);

    return { latitude: dto.latitude, longitude: dto.longitude };
  }

  // ─── Position actuelle livreur ─────────────────────────
  async getPositionActuelle(livraisonId: string, userId: string) {
    const livraison = await this.prisma.livraison.findFirst({
      where: {
        id: livraisonId,
        OR: [
          { commande: { clientId: userId } },
          { livreur: { utilisateurId: userId } },
        ],
      },
      select: {
        latitudeActuelle: true,
        longitudeActuelle: true,
        statut: true,
        adresseArrivee: true,
        livreur: {
          select: {
            utilisateur: { select: { nom: true, avatar: true, telephone: true } },
          },
        },
      },
    });

    if (!livraison) throw new NotFoundException('Livraison introuvable');
    return livraison;
  }

  // ─── Historique positions ──────────────────────────────
  async getHistoriquePositions(livraisonId: string) {
    return this.prisma.positionGPS.findMany({
      where: { livraisonId },
      orderBy: { createdAt: 'asc' },
      select: {
        latitude: true,
        longitude: true,
        vitesse: true,
        createdAt: true,
      },
    });
  }

  // ─── Disponibilité livreur ─────────────────────────────
  async toggleDisponibilite(livreurUserId: string) {
    const profil = await this.getProfilLivreur(livreurUserId);

    return this.prisma.profilLivreur.update({
      where: { id: profil.id },
      data: { estDisponible: !profil.estDisponible },
    });
  }

  // ─── Gains livreur ─────────────────────────────────────
  async getGains(livreurUserId: string) {
    const profil = await this.getProfilLivreur(livreurUserId);

    const aujourd_hui = new Date();
    aujourd_hui.setHours(0, 0, 0, 0);

    const ce_mois = new Date();
    ce_mois.setDate(1);
    ce_mois.setHours(0, 0, 0, 0);

    const [gainJour, gainMois, totalLivraisons] = await Promise.all([
      this.prisma.livraison.aggregate({
        where: {
          livreurId: profil.id,
          statut: StatutLivraison.LIVREE,
          updatedAt: { gte: aujourd_hui },
        },
        _sum: { montant: true },
        _count: true,
      }),
      this.prisma.livraison.aggregate({
        where: {
          livreurId: profil.id,
          statut: StatutLivraison.LIVREE,
          updatedAt: { gte: ce_mois },
        },
        _sum: { montant: true },
        _count: true,
      }),
      this.prisma.livraison.count({
        where: { livreurId: profil.id, statut: StatutLivraison.LIVREE },
      }),
    ]);

    return {
      aujourd_hui: {
        montant: gainJour._sum.montant || 0,
        livraisons: gainJour._count,
      },
      ce_mois: {
        montant: gainMois._sum.montant || 0,
        livraisons: gainMois._count,
      },
      total: {
        montant: profil.totalRevenu,
        livraisons: totalLivraisons,
      },
      noteMoyenne: profil.noteMoyenne,
    };
  }

  // ─── Utilitaire ────────────────────────────────────────
  private async getProfilLivreur(userId: string) {
    const profil = await this.prisma.profilLivreur.findUnique({
      where: { utilisateurId: userId },
    });
    if (!profil) throw new ForbiddenException('Profil livreur introuvable');
    return profil;
  }
}