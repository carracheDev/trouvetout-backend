// src/modules/produits/produits.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import {
  CreateProduitDto,
  UpdateProduitDto,
  FilterProduitDto,
  CreateCommentaireDto,
  CreateAvisDto,
} from './dto/create-produit.dto';
import { MediaType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProduitsService {
  constructor(private prisma: PrismaService) {}

  // ─── Créer produit ─────────────────────────────────────
  async create(vendeurUserId: string, dto: CreateProduitDto) {
    const profilVendeur = await this.prisma.profilVendeur.findUnique({
      where: { utilisateurId: vendeurUserId },
    });

    if (!profilVendeur) {
      throw new ForbiddenException('Profil vendeur introuvable');
    }

    const produit = await this.prisma.produit.create({
      data: {
        nom: dto.nom,
        description: dto.description,
        prix: dto.prix,
        prixPromo: dto.prixPromo,
        stock: dto.stock,
        estEnPromo: !!dto.prixPromo,
        categorieId: dto.categorieId,
        vendeurId: profilVendeur.id,
      },
    });

    // Créer les médias
    const medias = [];

    if (dto.videoUrl) {
      medias.push({
        produitId: produit.id,
        url: dto.videoUrl,
        type: MediaType.VIDEO,
        ordre: 0,
        thumbnail: dto.videoThumbnail,
        duree: dto.videoDuree,
      });
    }

    if (dto.imageUrls?.length) {
      dto.imageUrls.forEach((url, index) => {
        medias.push({
          produitId: produit.id,
          url,
          type: MediaType.IMAGE,
          ordre: index + 1,
        });
      });
    }

    if (medias.length) {
      await this.prisma.mediaProduit.createMany({ data: medias });
    }

    return this.findOne(produit.id);
  }

  // ─── Voir un produit ───────────────────────────────────
  async findOne(id: string, userId?: string) {
    const produit = await this.prisma.produit.findFirst({
      where: { id, deletedAt: null },
      include: {
        medias: { orderBy: { ordre: 'asc' } },
        categorie: true,
        vendeur: {
          include: {
            utilisateur: {
              select: { nom: true, avatar: true },
            },
          },
        },
        _count: {
          select: {
            likes: true,
            commentaires: true,
            avis: true,
          },
        },
      },
    });

    if (!produit) throw new NotFoundException('Produit introuvable');

    // Vérifier si liké par l'utilisateur connecté
    let estLike = false;
    let estFavori = false;

    if (userId) {
      const [like, favori] = await Promise.all([
        this.prisma.like.findUnique({
          where: {
            utilisateurId_produitId: { utilisateurId: userId, produitId: id },
          },
        }),
        this.prisma.favori.findUnique({
          where: {
            utilisateurId_produitId: { utilisateurId: userId, produitId: id },
          },
        }),
      ]);
      estLike = !!like;
      estFavori = !!favori;
    }

    return { ...produit, estLike, estFavori };
  }

  // ─── Liste produits avec filtres ───────────────────────
  async findAll(dto: FilterProduitDto, userId?: string) {
    const page = dto.page || 1;
    const limit = dto.limit || 15;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      estDisponible: true,
    };

    if (dto.search) {
      where.OR = [
        { nom: { contains: dto.search, mode: 'insensitive' } },
        { description: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    if (dto.categorieId) where.categorieId = dto.categorieId;

    if (dto.categorieSlug) {
      const categorie = await this.prisma.categorie.findUnique({
        where: { slug: dto.categorieSlug },
      });
      if (categorie) where.categorieId = categorie.id;
    }

    if (dto.prixMin || dto.prixMax) {
      where.prix = {};
      if (dto.prixMin) where.prix.gte = dto.prixMin;
      if (dto.prixMax) where.prix.lte = dto.prixMax;
    }

    // Tri
    let orderBy: any = { createdAt: 'desc' };
    if (dto.tri === 'prix_asc') orderBy = { prix: 'asc' };
    if (dto.tri === 'prix_desc') orderBy = { prix: 'desc' };
    if (dto.tri === 'populaire') orderBy = { nombreLikes: 'desc' };
    if (dto.tri === 'note') orderBy = { noteMoyenne: 'desc' };

    const [produits, total] = await Promise.all([
      this.prisma.produit.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          medias: {
            orderBy: { ordre: 'asc' },
            take: 2,
          },
          categorie: {
            select: { nom: true, icone: true, couleur: true },
          },
          vendeur: {
            select: {
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
        },
      }),
      this.prisma.produit.count({ where }),
    ]);

    // Ajouter estLike pour chaque produit
    let produitsAvecLike = produits;
    if (userId) {
      const likes = await this.prisma.like.findMany({
        where: {
          utilisateurId: userId,
          produitId: { in: produits.map((p) => p.id) },
        },
      });
      const likeIds = new Set(likes.map((l) => l.produitId));
      produitsAvecLike = produits.map((p) => ({
        ...p,
        estLike: likeIds.has(p.id),
      }));
    }

    return { data: produitsAvecLike, total, page, limit };
  }

  // ─── Produits d'un vendeur ─────────────────────────────
  async findByVendeur(vendeurId: string, page = 1, limit = 15) {
    const skip = (page - 1) * limit;

    const [produits, total] = await Promise.all([
      this.prisma.produit.findMany({
        where: { vendeurId, deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          medias: { take: 1, orderBy: { ordre: 'asc' } },
          categorie: { select: { nom: true, icone: true } },
          _count: { select: { likes: true, commentaires: true } },
        },
      }),
      this.prisma.produit.count({ where: { vendeurId, deletedAt: null } }),
    ]);

    return { data: produits, total, page, limit };
  }

  // ─── Modifier produit ──────────────────────────────────
  async update(id: string, vendeurUserId: string, dto: UpdateProduitDto) {
    const produit = await this.verifierProprietaire(id, vendeurUserId);

    return this.prisma.produit.update({
      where: { id },
      data: {
        ...dto,
        estEnPromo: dto.prixPromo ? true : produit.estEnPromo,
      },
      include: {
        medias: { orderBy: { ordre: 'asc' } },
        categorie: true,
      },
    });
  }

  // ─── Supprimer produit ─────────────────────────────────
  async delete(id: string, vendeurUserId: string) {
    await this.verifierProprietaire(id, vendeurUserId);

    await this.prisma.produit.update({
      where: { id },
      data: { deletedAt: new Date(), estDisponible: false },
    });

    return { message: 'Produit supprimé' };
  }

  // ─── Liker / Unliker ───────────────────────────────────
  async toggleLike(produitId: string, userId: string) {
    const produit = await this.prisma.produit.findFirst({
      where: { id: produitId, deletedAt: null },
    });

    if (!produit) throw new NotFoundException('Produit introuvable');

    const existingLike = await this.prisma.like.findUnique({
      where: {
        utilisateurId_produitId: { utilisateurId: userId, produitId },
      },
    });

    if (existingLike) {
      // Unliker
      await this.prisma.$transaction([
        this.prisma.like.delete({
          where: {
            utilisateurId_produitId: { utilisateurId: userId, produitId },
          },
        }),
        this.prisma.produit.update({
          where: { id: produitId },
          data: { nombreLikes: { decrement: 1 } },
        }),
      ]);
      return { estLike: false, message: 'Like retiré' };
    } else {
      // Liker
      await this.prisma.$transaction([
        this.prisma.like.create({
          data: { utilisateurId: userId, produitId },
        }),
        this.prisma.produit.update({
          where: { id: produitId },
          data: { nombreLikes: { increment: 1 } },
        }),
      ]);
      return { estLike: true, message: 'Produit liké' };
    }
  }

  // ─── Favori toggle ─────────────────────────────────────
  async toggleFavori(produitId: string, userId: string) {
    const produit = await this.prisma.produit.findFirst({
      where: { id: produitId, deletedAt: null },
    });

    if (!produit) throw new NotFoundException('Produit introuvable');

    const existing = await this.prisma.favori.findUnique({
      where: {
        utilisateurId_produitId: { utilisateurId: userId, produitId },
      },
    });

    if (existing) {
      await this.prisma.favori.delete({
        where: {
          utilisateurId_produitId: { utilisateurId: userId, produitId },
        },
      });
      return { estFavori: false, message: 'Retiré des favoris' };
    } else {
      await this.prisma.favori.create({
        data: { utilisateurId: userId, produitId },
      });
      return { estFavori: true, message: 'Ajouté aux favoris' };
    }
  }

  // ─── Partager ──────────────────────────────────────────
  async partager(produitId: string) {
    const produit = await this.prisma.produit.findFirst({
      where: { id: produitId, deletedAt: null },
      select: { id: true, nom: true },
    });

    if (!produit) throw new NotFoundException('Produit introuvable');

    const shareUrl = `https://trouvetout.app/produits/${produitId}`;
    const shareText = `Découvrez ${produit.nom} sur TrouveTout !`;

    return { url: shareUrl, texte: shareText };
  }

  // ─── Commentaires ──────────────────────────────────────
  async addCommentaire(
    produitId: string,
    userId: string,
    dto: CreateCommentaireDto,
  ) {
    const produit = await this.prisma.produit.findFirst({
      where: { id: produitId, deletedAt: null },
    });

    if (!produit) throw new NotFoundException('Produit introuvable');

    return this.prisma.commentaire.create({
      data: {
        produitId,
        utilisateurId: userId,
        contenu: dto.contenu,
      },
      include: {
        utilisateur: {
          select: { nom: true, avatar: true },
        },
      },
    });
  }

  async getCommentaires(produitId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [commentaires, total] = await Promise.all([
      this.prisma.commentaire.findMany({
        where: { produitId, deletedAt: null, estSignale: false },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          utilisateur: {
            select: { nom: true, avatar: true },
          },
        },
      }),
      this.prisma.commentaire.count({
        where: { produitId, deletedAt: null },
      }),
    ]);

    return { data: commentaires, total, page, limit };
  }

  async deleteCommentaire(commentaireId: string, userId: string) {
    const commentaire = await this.prisma.commentaire.findFirst({
      where: { id: commentaireId, utilisateurId: userId },
    });

    if (!commentaire) throw new NotFoundException('Commentaire introuvable');

    await this.prisma.commentaire.update({
      where: { id: commentaireId },
      data: { deletedAt: new Date() },
    });

    return { message: 'Commentaire supprimé' };
  }

  // ─── Avis ──────────────────────────────────────────────
  async addAvis(
    produitId: string,
    commandeId: string,
    userId: string,
    dto: CreateAvisDto,
  ) {
    const existing = await this.prisma.avis.findUnique({
      where: { commandeId },
    });

    if (existing) throw new ConflictException('Avis déjà soumis');

    const avis = await this.prisma.avis.create({
      data: {
        produitId,
        commandeId,
        utilisateurId: userId,
        note: dto.note,
        commentaire: dto.commentaire,
        photos: dto.photos || [],
      },
    });

    // Recalculer note moyenne
    const stats = await this.prisma.avis.aggregate({
      where: { produitId },
      _avg: { note: true },
      _count: true,
    });

    await this.prisma.produit.update({
      where: { id: produitId },
      data: {
        noteMoyenne: stats._avg.note || 0,
        nombreAvis: stats._count,
      },
    });

    return avis;
  }

  async getAvis(produitId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [avis, total] = await Promise.all([
      this.prisma.avis.findMany({
        where: { produitId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          utilisateur: {
            select: { nom: true, avatar: true },
          },
        },
      }),
      this.prisma.avis.count({ where: { produitId } }),
    ]);

    return { data: avis, total, page, limit };
  }

  // ─── Signaler produit ──────────────────────────────────
  async signaler(produitId: string, userId: string, raison: string) {
    const produit = await this.prisma.produit.findFirst({
      where: { id: produitId, deletedAt: null },
    });

    if (!produit) throw new NotFoundException('Produit introuvable');

    return this.prisma.signalement.create({
      data: { produitId, auteurId: userId, raison },
    });
  }

  // ─── Utilitaires ───────────────────────────────────────
  private async verifierProprietaire(id: string, vendeurUserId: string) {
    const profilVendeur = await this.prisma.profilVendeur.findUnique({
      where: { utilisateurId: vendeurUserId },
    });

    if (!profilVendeur) throw new ForbiddenException('Accès refusé');

    const produit = await this.prisma.produit.findFirst({
      where: { id, vendeurId: profilVendeur.id, deletedAt: null },
    });

    if (!produit) throw new NotFoundException('Produit introuvable');

    return produit;
  }
}