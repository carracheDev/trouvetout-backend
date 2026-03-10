// src/modules/analytiques/analytiques.service.ts
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalytiquesService {
  constructor(private prisma: PrismaService) {}

  // ─── Helper profil vendeur ─────────────────────────────
  private async getProfilVendeur(userId: string) {
    const profil = await this.prisma.profilVendeur.findUnique({
      where: { utilisateurId: userId },
    });
    if (!profil) throw new ForbiddenException('Profil vendeur introuvable');
    return profil;
  }

  // ─── Dashboard principal vendeur ──────────────────────
  async getDashboard(vendeurUserId: string) {
    const profil = await this.getProfilVendeur(vendeurUserId);

    const aujourd_hui = new Date();
    aujourd_hui.setHours(0, 0, 0, 0);

    const hier = new Date(aujourd_hui);
    hier.setDate(hier.getDate() - 1);

    const ce_mois = new Date();
    ce_mois.setDate(1);
    ce_mois.setHours(0, 0, 0, 0);

    const mois_precedent = new Date(ce_mois);
    mois_precedent.setMonth(mois_precedent.getMonth() - 1);

    const [
      statsAujourdhui,
      statsHier,
      statsMois,
      statsMoisPrec,
      commandesParStatut,
      produitsTopVentes,
      produitsStockFaible,
      dernieresCommandes,
    ] = await Promise.all([
      // Ventes aujourd'hui
      this.prisma.commande.aggregate({
        where: {
          vendeurId: profil.id,
          statut: { notIn: ['EN_ATTENTE_PAIEMENT', 'ANNULEE'] },
          createdAt: { gte: aujourd_hui },
          deletedAt: null,
        },
        _sum: { montantTotal: true },
        _count: true,
      }),

      // Ventes hier
      this.prisma.commande.aggregate({
        where: {
          vendeurId: profil.id,
          statut: { notIn: ['EN_ATTENTE_PAIEMENT', 'ANNULEE'] },
          createdAt: { gte: hier, lt: aujourd_hui },
          deletedAt: null,
        },
        _sum: { montantTotal: true },
        _count: true,
      }),

      // Ventes ce mois
      this.prisma.commande.aggregate({
        where: {
          vendeurId: profil.id,
          statut: { notIn: ['EN_ATTENTE_PAIEMENT', 'ANNULEE'] },
          createdAt: { gte: ce_mois },
          deletedAt: null,
        },
        _sum: { montantTotal: true },
        _count: true,
      }),

      // Ventes mois précédent
      this.prisma.commande.aggregate({
        where: {
          vendeurId: profil.id,
          statut: { notIn: ['EN_ATTENTE_PAIEMENT', 'ANNULEE'] },
          createdAt: { gte: mois_precedent, lt: ce_mois },
          deletedAt: null,
        },
        _sum: { montantTotal: true },
        _count: true,
      }),

      // Commandes par statut
      this.prisma.commande.groupBy({
        by: ['statut'],
        where: { vendeurId: profil.id, deletedAt: null },
        _count: true,
      }),

      // Top 5 produits vendus
      this.prisma.produit.findMany({
        where: { vendeurId: profil.id, deletedAt: null },
        orderBy: { nombreVentes: 'desc' },
        take: 5,
        select: {
          id: true,
          nom: true,
          prix: true,
          nombreVentes: true,
          nombreLikes: true,
          stock: true,
          medias: { take: 1, select: { url: true } },
        },
      }),

      // Produits stock faible (< 5)
      this.prisma.produit.findMany({
        where: {
          vendeurId: profil.id,
          stock: { lt: 5 },
          estDisponible: true,
          deletedAt: null,
        },
        select: { id: true, nom: true, stock: true },
        orderBy: { stock: 'asc' },
      }),

      // 5 dernières commandes
      this.prisma.commande.findMany({
        where: { vendeurId: profil.id, deletedAt: null },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { nom: true, avatar: true } },
          lignes: { select: { quantite: true, prixUnitaire: true } },
        },
      }),
    ]);

    // Calcul variation
    const variationJour = this.calculerVariation(
      statsAujourdhui._sum.montantTotal || 0,
      statsHier._sum.montantTotal || 0,
    );

    const variationMois = this.calculerVariation(
      statsMois._sum.montantTotal || 0,
      statsMoisPrec._sum.montantTotal || 0,
    );

    return {
      resume: {
        aujourd_hui: {
          chiffreAffaires: statsAujourdhui._sum.montantTotal || 0,
          commandes: statsAujourdhui._count,
          variation: variationJour,
        },
        ce_mois: {
          chiffreAffaires: statsMois._sum.montantTotal || 0,
          commandes: statsMois._count,
          variation: variationMois,
        },
        total: {
          chiffreAffaires: profil.totalRevenu,
          commandes: profil.totalVentes,
          noteMoyenne: profil.noteMoyenne,
        },
      },
      commandesParStatut,
      produitsTopVentes,
      produitsStockFaible,
      dernieresCommandes,
    };
  }

  // ─── Évolution ventes (graphique) ─────────────────────
  async getEvolutionVentes(
    vendeurUserId: string,
    periode: '7j' | '30j' | '90j' = '30j',
  ) {
    const profil = await this.getProfilVendeur(vendeurUserId);

    const jours = periode === '7j' ? 7 : periode === '30j' ? 30 : 90;
    const dateDebut = new Date();
    dateDebut.setDate(dateDebut.getDate() - jours);
    dateDebut.setHours(0, 0, 0, 0);

    const commandes = await this.prisma.commande.findMany({
      where: {
        vendeurId: profil.id,
        statut: { notIn: ['EN_ATTENTE_PAIEMENT', 'ANNULEE'] },
        createdAt: { gte: dateDebut },
        deletedAt: null,
      },
      select: {
        montantTotal: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Grouper par jour
    const parJour: Record<string, { date: string; ventes: number; commandes: number }> = {};

    for (let i = 0; i < jours; i++) {
      const date = new Date(dateDebut);
      date.setDate(date.getDate() + i);
      const key = date.toISOString().split('T')[0];
      parJour[key] = { date: key, ventes: 0, commandes: 0 };
    }

    commandes.forEach((c) => {
      const key = c.createdAt.toISOString().split('T')[0];
      if (parJour[key]) {
        parJour[key].ventes += c.montantTotal;
        parJour[key].commandes += 1;
      }
    });

    return {
      periode,
      data: Object.values(parJour),
      total: commandes.reduce((sum, c) => sum + c.montantTotal, 0),
    };
  }

  // ─── Analyse produits ──────────────────────────────────
  async getAnalyseProduits(vendeurUserId: string) {
    const profil = await this.getProfilVendeur(vendeurUserId);

    const [
      totalProduits,
      produitsActifs,
      produitsEnPromo,
      meilleursProduits,
      produitsAvecAvis,
    ] = await Promise.all([
      this.prisma.produit.count({
        where: { vendeurId: profil.id, deletedAt: null },
      }),
      this.prisma.produit.count({
        where: { vendeurId: profil.id, estDisponible: true, deletedAt: null },
      }),
      this.prisma.produit.count({
        where: { vendeurId: profil.id, estEnPromo: true, deletedAt: null },
      }),
      // Top produits par chiffre d'affaires
      this.prisma.ligneCommande.groupBy({
        by: ['produitId'],
        where: {
          commande: {
            vendeurId: profil.id,
            statut: { notIn: ['EN_ATTENTE_PAIEMENT', 'ANNULEE'] },
            deletedAt: null,
          },
        },
        _sum: { sousTotal: true, quantite: true },
        _count: true,
        orderBy: { _sum: { sousTotal: 'desc' } },
        take: 10,
      }),
      // Produits les mieux notés
      this.prisma.produit.findMany({
        where: {
          vendeurId: profil.id,
          nombreAvis: { gt: 0 },
          deletedAt: null,
        },
        orderBy: { noteMoyenne: 'desc' },
        take: 5,
        select: {
          id: true,
          nom: true,
          noteMoyenne: true,
          nombreAvis: true,
          prix: true,
        },
      }),
    ]);

    // Enrichir meilleurs produits
    const produitsEnrichis = await Promise.all(
      meilleursProduits.map(async (p) => {
        const produit = await this.prisma.produit.findUnique({
          where: { id: p.produitId },
          select: { nom: true, prix: true, medias: { take: 1 } },
        });
        return {
          ...produit,
          chiffreAffaires: p._sum.sousTotal || 0,
          quantiteVendue: p._sum.quantite || 0,
        };
      }),
    );

    return {
      resume: {
        total: totalProduits,
        actifs: produitsActifs,
        enPromo: produitsEnPromo,
        inactifs: totalProduits - produitsActifs,
      },
      topParCA: produitsEnrichis,
      mieuxNotes: produitsAvecAvis,
    };
  }

  // ─── Analyse clients ───────────────────────────────────
  async getAnalyseClients(vendeurUserId: string) {
    const profil = await this.getProfilVendeur(vendeurUserId);

    const commandes = await this.prisma.commande.findMany({
      where: {
        vendeurId: profil.id,
        statut: { notIn: ['EN_ATTENTE_PAIEMENT', 'ANNULEE'] },
        deletedAt: null,
      },
      select: {
        clientId: true,
        montantTotal: true,
        createdAt: true,
        client: { select: { nom: true, avatar: true } },
      },
    });

    // Grouper par client
    const parClient: Record<string, any> = {};
    commandes.forEach((c) => {
      if (!parClient[c.clientId]) {
        parClient[c.clientId] = {
          client: c.client,
          totalDepense: 0,
          nombreCommandes: 0,
          derniereCommande: c.createdAt,
        };
      }
      parClient[c.clientId].totalDepense += c.montantTotal;
      parClient[c.clientId].nombreCommandes += 1;
      if (c.createdAt > parClient[c.clientId].derniereCommande) {
        parClient[c.clientId].derniereCommande = c.createdAt;
      }
    });

    const clientsListe = Object.values(parClient).sort(
      (a: any, b: any) => b.totalDepense - a.totalDepense,
    );

    const totalClients = clientsListe.length;
    const clientsFideles = clientsListe.filter(
      (c: any) => c.nombreCommandes >= 2,
    ).length;

    return {
      resume: {
        totalClients,
        clientsFideles,
        tauxFidelite:
          totalClients > 0
            ? Math.round((clientsFideles / totalClients) * 100)
            : 0,
        panierMoyen:
          commandes.length > 0
            ? Math.round(
                commandes.reduce((s, c) => s + c.montantTotal, 0) /
                  commandes.length,
              )
            : 0,
      },
      topClients: clientsListe.slice(0, 10),
    };
  }

  // ─── Dashboard Admin ───────────────────────────────────
  async getDashboardAdmin() {
    const [
      totalUtilisateurs,
      totalVendeurs,
      totalLivreurs,
      statsCommandes,
      chiffreAffaires,
      commissionsTotal,
      nouveauxUtilisateurs,
    ] = await Promise.all([
      this.prisma.utilisateur.count(),
      this.prisma.profilVendeur.count(),
      this.prisma.profilLivreur.count(),
      this.prisma.commande.groupBy({
        by: ['statut'],
        _count: true,
        _sum: { montantTotal: true },
      }),
      this.prisma.commande.aggregate({
        where: { statut: { notIn: ['EN_ATTENTE_PAIEMENT', 'ANNULEE'] } },
        _sum: { montantTotal: true },
      }),
      this.prisma.commande.aggregate({
        where: { statut: { notIn: ['EN_ATTENTE_PAIEMENT', 'ANNULEE'] } },
        _sum: { montantCommission: true },
      }),
      this.prisma.utilisateur.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30)),
          },
        },
      }),
    ]);

    return {
      utilisateurs: {
        total: totalUtilisateurs,
        vendeurs: totalVendeurs,
        livreurs: totalLivreurs,
        nouveaux30j: nouveauxUtilisateurs,
      },
      commandes: {
        parStatut: statsCommandes,
        chiffreAffaires: chiffreAffaires._sum.montantTotal || 0,
        commissions: commissionsTotal._sum.montantCommission || 0,
      },
    };
  }

  // ─── Helper variation ──────────────────────────────────
  private calculerVariation(actuel: number, precedent: number): number {
    if (precedent === 0) return actuel > 0 ? 100 : 0;
    return Math.round(((actuel - precedent) / precedent) * 100);
  }
}