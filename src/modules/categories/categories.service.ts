// src/modules/categories/categories.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategorieDto, UpdateCategorieDto } from './dto/create-categorie.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  // ─── Toutes les catégories ─────────────────────────────
  async findAll() {
    return this.prisma.categorie.findMany({
      where: { estActif: true, parentId: null },
      orderBy: { ordre: 'asc' },
      include: {
        enfants: {
          where: { estActif: true },
          orderBy: { ordre: 'asc' },
        },
        _count: {
          select: { produits: true },
        },
      },
    });
  }

  // ─── Une catégorie ─────────────────────────────────────
  async findOne(id: string) {
    const categorie = await this.prisma.categorie.findUnique({
      where: { id },
      include: {
        enfants: { where: { estActif: true } },
        _count: { select: { produits: true } },
      },
    });

    if (!categorie) throw new NotFoundException('Catégorie introuvable');
    return categorie;
  }

  // ─── Créer catégorie (Admin) ───────────────────────────
  async create(dto: CreateCategorieDto) {
    const existing = await this.prisma.categorie.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) throw new ConflictException('Slug déjà utilisé');

    return this.prisma.categorie.create({ data: dto });
  }

  // ─── Modifier catégorie (Admin) ────────────────────────
  async update(id: string, dto: UpdateCategorieDto) {
    await this.findOne(id);
    return this.prisma.categorie.update({
      where: { id },
      data: dto,
    });
  }

  // ─── Supprimer catégorie (Admin) ───────────────────────
  async delete(id: string) {
    await this.findOne(id);
    await this.prisma.categorie.update({
      where: { id },
      data: { estActif: false },
    });
    return { message: 'Catégorie désactivée' };
  }

  // ─── Seed catégories de base ───────────────────────────
  async seedCategories() {
    const categories = [
      { nom: 'Mode & Vêtements', slug: 'mode-vetements', icone: '👗', couleur: '#EC4899', ordre: 1 },
      { nom: 'Beauté & Cosmétiques', slug: 'beaute-cosmetiques', icone: '💄', couleur: '#F59E0B', ordre: 2 },
      { nom: 'Téléphones & Tech', slug: 'telephones-tech', icone: '📱', couleur: '#2563EB', ordre: 3 },
      { nom: 'Alimentation', slug: 'alimentation', icone: '🍎', couleur: '#22C55E', ordre: 4 },
      { nom: 'Maison & Déco', slug: 'maison-deco', icone: '🏠', couleur: '#8B5CF6', ordre: 5 },
      { nom: 'Chaussures', slug: 'chaussures', icone: '👟', couleur: '#F97316', ordre: 6 },
      { nom: 'Sacs & Accessoires', slug: 'sacs-accessoires', icone: '👜', couleur: '#EF4444', ordre: 7 },
      { nom: 'Sport & Loisirs', slug: 'sport-loisirs', icone: '⚽', couleur: '#14B8A6', ordre: 8 },
      { nom: 'Enfants & Bébés', slug: 'enfants-bebes', icone: '🧸', couleur: '#F43F5E', ordre: 9 },
      { nom: 'Autres', slug: 'autres', icone: '📦', couleur: '#94A3B8', ordre: 10 },
    ];

    let created = 0;
    for (const cat of categories) {
      const existing = await this.prisma.categorie.findUnique({
        where: { slug: cat.slug },
      });
      if (!existing) {
        await this.prisma.categorie.create({ data: cat });
        created++;
      }
    }

    return { message: `${created} catégories créées` };
  }
}