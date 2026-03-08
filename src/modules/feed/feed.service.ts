// src/modules/feed/feed.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedService {
  constructor(private prisma: PrismaService) {}

  // ─── Sélecteur de produit commun ──────────────────────
  private produitSelect = {
    id: true,
    nom: true,
    description: true,
    prix: true,
    prixPromo: true,
    stock: true,
    estEnPromo: true,
    nombreLikes: true,
    noteMoyenne: true,
    nombreAvis: true,
    createdAt: true,
    medias: {
      orderBy: { ordre: 'asc' as const },
      take: 3,
    },
    categorie: {
      select: { nom: true, icone: true, couleur: true },
    },
    vendeur: {
      select: {
        id: true,
        nomBoutique: true,
        logo: true,
        estVerifie: true,
        utilisateur: {
          select: { nom: true, avatar: true },
        },
      },
    },
    _count: {
      select: { likes: true, commentaires: true },
    },
  };

  // ─── Feed principal ────────────────────────────────────
  async getFeed(userId?: string, page = 1) {
    const baseWhere = { deletedAt: null, estDisponible: true };

    // 5 récents
    const recents = await this.prisma.produit.findMany({
      where: baseWhere,
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: this.produitSelect,
    });

    // 4 populaires (les plus likés)
    const populaires = await this.prisma.produit.findMany({
      where: baseWhere,
      orderBy: { nombreLikes: 'desc' },
      take: 4,
      select: this.produitSelect,
    });

    // 3 promos
    const promos = await this.prisma.produit.findMany({
      where: { ...baseWhere, estEnPromo: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: this.produitSelect,
    });

    // 3 suivis (boutiques que l'utilisateur a déjà commandé)
    let suivis: any[] = [];
    if (userId) {
      const commandesIds = await this.prisma.commande.findMany({
        where: { clientId: userId, deletedAt: null },
        select: { vendeurId: true },
        distinct: ['vendeurId'],
        take: 5,
      });

      if (commandesIds.length) {
        const vendeurIds = commandesIds.map((c) => c.vendeurId);
        suivis = await this.prisma.produit.findMany({
          where: {
            ...baseWhere,
            vendeurId: { in: vendeurIds },
          },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: this.produitSelect,
        });
      }

      // Compléter avec populaires si pas assez de suivis
      if (suivis.length < 3) {
        const extra = await this.prisma.produit.findMany({
          where: baseWhere,
          orderBy: { noteMoyenne: 'desc' },
          take: 3 - suivis.length,
          select: this.produitSelect,
        });
        suivis = [...suivis, ...extra];
      }
    } else {
      suivis = await this.prisma.produit.findMany({
        where: baseWhere,
        orderBy: { noteMoyenne: 'desc' },
        take: 3,
        select: this.produitSelect,
      });
    }

    // Assembler le feed selon le pattern :
    // Produit → Produit → Promo → Produit → Vidéo/Populaire → Suivi → ...
    const feedBrut = this.assemblerFeed(recents, populaires, promos, suivis);

    // Dédupliquer
    const vus = new Set<string>();
    const feed = feedBrut.filter((p) => {
      if (vus.has(p.id)) return false;
      vus.add(p.id);
      return true;
    });

    // Enrichir avec estLike / estFavori
    let feedEnrichi = feed;
    if (userId) {
      const ids = feed.map((p) => p.id);
      const [likes, favoris] = await Promise.all([
        this.prisma.like.findMany({
          where: { utilisateurId: userId, produitId: { in: ids } },
          select: { produitId: true },
        }),
        this.prisma.favori.findMany({
          where: { utilisateurId: userId, produitId: { in: ids } },
          select: { produitId: true },
        }),
      ]);

      const likeSet = new Set(likes.map((l) => l.produitId));
      const favoriSet = new Set(favoris.map((f) => f.produitId));

      feedEnrichi = feed.map((p) => ({
        ...p,
        estLike: likeSet.has(p.id),
        estFavori: favoriSet.has(p.id),
      }));
    }

    return {
      data: feedEnrichi,
      total: feedEnrichi.length,
      page,
      hasMore: feedEnrichi.length === 15,
    };
  }

  // ─── Assembler le feed selon le pattern ───────────────
  private assemblerFeed(
    recents: any[],
    populaires: any[],
    promos: any[],
    suivis: any[],
  ) {
    const result = [];
    const r = [...recents];
    const pop = [...populaires];
    const promo = [...promos];
    const suivi = [...suivis];

    // Pattern : récent, récent, promo, populaire, récent, suivi,
    //           récent, populaire, promo, récent, suivi, populaire,
    //           récent, promo, populaire
    const pattern = [
      () => r.shift(),
      () => r.shift(),
      () => promo.shift() || r.shift(),
      () => pop.shift(),
      () => r.shift(),
      () => suivi.shift() || pop.shift(),
      () => r.shift() || pop.shift(),
      () => pop.shift() || r.shift(),
      () => promo.shift() || suivi.shift(),
      () => r.shift() || pop.shift(),
      () => suivi.shift() || pop.shift(),
      () => pop.shift() || r.shift(),
      () => r.shift() || pop.shift(),
      () => promo.shift() || pop.shift(),
      () => pop.shift() || r.shift(),
    ];

    for (const fn of pattern) {
      const item = fn();
      if (item) result.push(item);
    }

    return result;
  }

  // ─── Feed par catégorie ────────────────────────────────
  async getFeedCategorie(categorieSlug: string, userId?: string, page = 1) {
    const limite = 15;
    const skip = (page - 1) * limite;

    const categorie = await this.prisma.categorie.findUnique({
      where: { slug: categorieSlug },
    });

    if (!categorie) return { data: [], total: 0, page };

    const where = {
      categorieId: categorie.id,
      deletedAt: null,
      estDisponible: true,
    };

    const [produits, total] = await Promise.all([
      this.prisma.produit.findMany({
        where,
        skip,
        take: limite,
        orderBy: [{ nombreLikes: 'desc' }, { createdAt: 'desc' }],
        select: this.produitSelect,
      }),
      this.prisma.produit.count({ where }),
    ]);

    let produitsEnrichis = produits;
    if (userId) {
      const ids = produits.map((p) => p.id);
      const [likes, favoris] = await Promise.all([
        this.prisma.like.findMany({
          where: { utilisateurId: userId, produitId: { in: ids } },
          select: { produitId: true },
        }),
        this.prisma.favori.findMany({
          where: { utilisateurId: userId, produitId: { in: ids } },
          select: { produitId: true },
        }),
      ]);
      const likeSet = new Set(likes.map((l) => l.produitId));
      const favoriSet = new Set(favoris.map((f) => f.produitId));
      produitsEnrichis = produits.map((p) => ({
        ...p,
        estLike: likeSet.has(p.id),
        estFavori: favoriSet.has(p.id),
      }));
    }

    return {
      data: produitsEnrichis,
      total,
      page,
      hasMore: skip + produits.length < total,
    };
  }

  // ─── Produits similaires ───────────────────────────────
  async getSimilaires(produitId: string, limit = 6) {
    const produit = await this.prisma.produit.findUnique({
      where: { id: produitId },
      select: { categorieId: true, vendeurId: true },
    });

    if (!produit) return [];

    return this.prisma.produit.findMany({
      where: {
        categorieId: produit.categorieId,
        id: { not: produitId },
        deletedAt: null,
        estDisponible: true,
      },
      take: limit,
      orderBy: { nombreLikes: 'desc' },
      select: this.produitSelect,
    });
  }

  // ─── Recherche ─────────────────────────────────────────
  async rechercher(query: string, userId?: string) {
    if (!query || query.length < 2) return { data: [], total: 0 };

    const where = {
      deletedAt: null,
      estDisponible: true,
      OR: [
        { nom: { contains: query, mode: 'insensitive' as const } },
        { description: { contains: query, mode: 'insensitive' as const } },
        {
          vendeur: {
            nomBoutique: { contains: query, mode: 'insensitive' as const },
          },
        },
        {
          categorie: {
            nom: { contains: query, mode: 'insensitive' as const },
          },
        },
      ],
    };

    const [produits, total] = await Promise.all([
      this.prisma.produit.findMany({
        where,
        take: 20,
        orderBy: { nombreLikes: 'desc' },
        select: this.produitSelect,
      }),
      this.prisma.produit.count({ where }),
    ]);

    return { data: produits, total };
  }

  // ─── Tendances ─────────────────────────────────────────
  async getTendances() {
    const hier = new Date();
    hier.setDate(hier.getDate() - 1);

    return this.prisma.produit.findMany({
      where: {
        deletedAt: null,
        estDisponible: true,
        updatedAt: { gte: hier },
      },
      orderBy: { nombreLikes: 'desc' },
      take: 10,
      select: this.produitSelect,
    });
  }
}