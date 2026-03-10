// src/modules/fidelite/fidelite.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NiveauFidelite } from '@prisma/client';

@Injectable()
export class FideliteService {
  constructor(private prisma: PrismaService) {}

  // ─── Mon profil fidélité ───────────────────────────────
  async getMonProfil(userId: string) {
    let profil = await this.prisma.pointsFidelite.findUnique({
      where: { utilisateurId: userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    // Créer si inexistant
    if (!profil) {
      profil = await this.prisma.pointsFidelite.create({
        data: { utilisateurId: userId },
        include: { transactions: true },
      });
    }

    const prochainNiveau = this.getProchainNiveau(profil.niveau, profil.solde);

    return {
      ...profil,
      prochainNiveau,
      avantages: this.getAvantages(profil.niveau),
    };
  }

  // ─── Historique transactions ───────────────────────────
  async getHistorique(userId: string, page = 1, limit = 20) {
    const profil = await this.prisma.pointsFidelite.findUnique({
      where: { utilisateurId: userId },
    });

    if (!profil) return { data: [], total: 0, page, limit };

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.transactionPoints.findMany({
        where: { pointsFideliteId: profil.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.transactionPoints.count({
        where: { pointsFideliteId: profil.id },
      }),
    ]);

    return { data: transactions, total, page, limit };
  }

  // ─── Utiliser des points ───────────────────────────────
  async utiliserPoints(userId: string, points: number, commandeId: string) {
    const profil = await this.prisma.pointsFidelite.findUnique({
      where: { utilisateurId: userId },
    });

    if (!profil) throw new NotFoundException('Profil fidélité introuvable');
    if (profil.solde < points) {
      throw new BadRequestException(
        `Solde insuffisant. Vous avez ${profil.solde} points.`,
      );
    }

    // Minimum 100 points utilisables
    if (points < 100) {
      throw new BadRequestException('Minimum 100 points pour utiliser');
    }

    // 100 points = 100 FCFA de réduction
    const reduction = points;

    await this.prisma.$transaction(async (tx) => {
      await tx.pointsFidelite.update({
        where: { utilisateurId: userId },
        data: { solde: { decrement: points } },
      });

      await tx.transactionPoints.create({
        data: {
          pointsFideliteId: profil.id,
          commandeId,
          points: -points,
          type: 'UTILISATION',
          description: `Réduction de ${reduction} FCFA sur commande`,
        },
      });
    });

    return {
      pointsUtilises: points,
      reductionObtenue: reduction,
      nouveauSolde: profil.solde - points,
    };
  }

  // ─── Ajouter points manuellement (admin) ──────────────
  async ajouterPoints(
    userId: string,
    points: number,
    description: string,
  ) {
    let profil = await this.prisma.pointsFidelite.findUnique({
      where: { utilisateurId: userId },
    });

    if (!profil) {
      profil = await this.prisma.pointsFidelite.create({
        data: { utilisateurId: userId },
      });
    }

    const nouveauSolde = profil.solde + points;
    const niveau = this.calculerNiveau(nouveauSolde);

    await this.prisma.$transaction(async (tx) => {
      await tx.pointsFidelite.update({
        where: { utilisateurId: userId },
        data: { solde: nouveauSolde, niveau },
      });

      await tx.transactionPoints.create({
        data: {
          pointsFideliteId: profil.id,
          points,
          type: 'BONUS',
          description,
        },
      });
    });

    return {
      message: `${points} points ajoutés`,
      nouveauSolde,
      niveau,
    };
  }

  // ─── Classement fidélité (leaderboard) ────────────────
  async getClassement(limit = 10) {
    const tops = await this.prisma.pointsFidelite.findMany({
      take: limit,
      orderBy: { solde: 'desc' },
      include: {
        utilisateur: {
          select: { nom: true, avatar: true },
        },
      },
    });

    return tops.map((p, index) => ({
      rang: index + 1,
      nom: p.utilisateur.nom,
      avatar: p.utilisateur.avatar,
      solde: p.solde,
      niveau: p.niveau,
    }));
  }

  // ─── Stats fidélité (admin) ────────────────────────────
  async getStats() {
    const [total, parNiveau, pointsDistribues] = await Promise.all([
      this.prisma.pointsFidelite.count(),
      this.prisma.pointsFidelite.groupBy({
        by: ['niveau'],
        _count: true,
      }),
      this.prisma.transactionPoints.aggregate({
        where: { type: 'GAIN' },
        _sum: { points: true },
      }),
    ]);

    return {
      totalMembres: total,
      parNiveau,
      pointsDistribues: pointsDistribues._sum.points || 0,
    };
  }

  // ─── Helpers ───────────────────────────────────────────
  private calculerNiveau(solde: number): NiveauFidelite {
    if (solde >= 10000) return NiveauFidelite.PLATINE;
    if (solde >= 5000) return NiveauFidelite.OR;
    if (solde >= 1000) return NiveauFidelite.ARGENT;
    return NiveauFidelite.BRONZE;
  }

  private getProchainNiveau(niveau: NiveauFidelite, solde: number) {
    const paliers = {
      BRONZE: { prochain: 'ARGENT', pointsRequis: 1000 },
      ARGENT: { prochain: 'OR', pointsRequis: 5000 },
      OR: { prochain: 'PLATINE', pointsRequis: 10000 },
      PLATINE: { prochain: null, pointsRequis: null },
    };

    const info = paliers[niveau];
    if (!info.prochain) return { prochain: null, pointsManquants: 0 };

    return {
      prochain: info.prochain,
      pointsManquants: info.pointsRequis - solde,
      progression: Math.round((solde / info.pointsRequis) * 100),
    };
  }

  private getAvantages(niveau: NiveauFidelite) {
    const avantages = {
      BRONZE: [
        '1 point par 100 FCFA dépensé',
        'Accès aux offres de base',
      ],
      ARGENT: [
        '1.5 points par 100 FCFA dépensé',
        'Livraison gratuite sur zone 1',
        'Accès aux ventes privées',
      ],
      OR: [
        '2 points par 100 FCFA dépensé',
        'Livraison prioritaire',
        'Support client dédié',
        'Accès anticipé aux nouvelles collections',
      ],
      PLATINE: [
        '3 points par 100 FCFA dépensé',
        'Livraison gratuite partout',
        'Conseiller personnel',
        'Invitations événements exclusifs',
        'Cashback 2% sur chaque achat',
      ],
    };

    return avantages[niveau];
  }
}