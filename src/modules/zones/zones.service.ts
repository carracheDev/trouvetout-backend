// src/modules/livraisons/zones.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateZoneDto, UpdateZoneDto, CalculerFraisDto } from './dto/zone.dto';

@Injectable()
export class ZonesService {
  constructor(private prisma: PrismaService) {}

  // ─── Obtenir profil vendeur ────────────────────────────
  private async getProfilVendeur(userId: string) {
    const profil = await this.prisma.profilVendeur.findUnique({
      where: { utilisateurId: userId },
    });
    if (!profil) throw new ForbiddenException('Profil vendeur introuvable');
    return profil;
  }

  // ─── Mes zones ─────────────────────────────────────────
  async getMesZones(vendeurUserId: string) {
    const profil = await this.getProfilVendeur(vendeurUserId);

    return this.prisma.zoneLivraison.findMany({
      where: { vendeurId: profil.id },
      orderBy: { rayonMax: 'asc' },
    });
  }

  // ─── Zones d'un vendeur (public) ──────────────────────
  async getZonesVendeur(vendeurId: string) {
    return this.prisma.zoneLivraison.findMany({
      where: { vendeurId, estActif: true },
      orderBy: { rayonMax: 'asc' },
    });
  }

  // ─── Créer zone ────────────────────────────────────────
  async creerZone(vendeurUserId: string, dto: CreateZoneDto) {
    const profil = await this.getProfilVendeur(vendeurUserId);

    // Vérifier pas de chevauchement
    const chevauchement = await this.prisma.zoneLivraison.findFirst({
      where: {
        vendeurId: profil.id,
        OR: [
          {
            rayonMin: { lte: dto.rayonMax },
            rayonMax: { gte: dto.rayonMin },
          },
        ],
      },
    });

    if (chevauchement) {
      throw new BadRequestException(
        `Chevauchement avec la zone "${chevauchement.nom}" (${chevauchement.rayonMin}-${chevauchement.rayonMax} km)`,
      );
    }

    return this.prisma.zoneLivraison.create({
      data: {
        vendeurId: profil.id,
        nom: dto.nom,
        rayonMin: dto.rayonMin,
        rayonMax: dto.rayonMax,
        prix: dto.prix,
        description: dto.description,
        estActif: dto.estActif ?? true,
      },
    });
  }

  // ─── Modifier zone ─────────────────────────────────────
  async modifierZone(
    zoneId: string,
    vendeurUserId: string,
    dto: UpdateZoneDto,
  ) {
    const profil = await this.getProfilVendeur(vendeurUserId);

    const zone = await this.prisma.zoneLivraison.findFirst({
      where: { id: zoneId, vendeurId: profil.id },
    });

    if (!zone) throw new NotFoundException('Zone introuvable');

    return this.prisma.zoneLivraison.update({
      where: { id: zoneId },
      data: dto,
    });
  }

  // ─── Supprimer zone ────────────────────────────────────
  async supprimerZone(zoneId: string, vendeurUserId: string) {
    const profil = await this.getProfilVendeur(vendeurUserId);

    const zone = await this.prisma.zoneLivraison.findFirst({
      where: { id: zoneId, vendeurId: profil.id },
    });

    if (!zone) throw new NotFoundException('Zone introuvable');

    await this.prisma.zoneLivraison.delete({ where: { id: zoneId } });

    return { message: 'Zone supprimée' };
  }

  // ─── Calculer frais selon position client ─────────────
  async calculerFrais(dto: CalculerFraisDto) {
    // Récupérer la position du vendeur via son profil
    const profil = await this.prisma.profilVendeur.findUnique({
      where: { id: dto.vendeurId },
      include: {
        utilisateur: {
          include: {
            adresses: {
              where: { estPrincipale: true, deletedAt: null },
              take: 1,
            },
          },
        },
      },
    });

    if (!profil) throw new NotFoundException('Vendeur introuvable');

    const zones = await this.prisma.zoneLivraison.findMany({
      where: { vendeurId: dto.vendeurId, estActif: true },
      orderBy: { rayonMax: 'asc' },
    });

    if (!zones.length) {
      return {
        disponible: false,
        message: 'Ce vendeur ne livre pas encore',
        zones: [],
      };
    }

    // Calculer distance avec Haversine
    let distance = 0;
    const adresseVendeur = profil.utilisateur.adresses[0];

    if (adresseVendeur) {
      distance = this.haversine(
        adresseVendeur.latitude,
        adresseVendeur.longitude,
        dto.latitudeClient,
        dto.longitudeClient,
      );
    }

    // Trouver la zone correspondante
    const zoneApplicable = zones.find(
      (z) => distance >= z.rayonMin && distance <= z.rayonMax,
    );

    if (!zoneApplicable) {
      return {
        disponible: false,
        distance: Math.round(distance * 10) / 10,
        message: `Hors zone de livraison (distance: ${Math.round(distance * 10) / 10} km)`,
        zonesDisponibles: zones.map((z) => ({
          nom: z.nom,
          jusqu_a: `${z.rayonMax} km`,
          prix: z.prix,
        })),
      };
    }

    return {
      disponible: true,
      distance: Math.round(distance * 10) / 10,
      zone: zoneApplicable.nom,
      frais: zoneApplicable.prix,
      description: zoneApplicable.description,
      message:
        zoneApplicable.prix === 0
          ? 'Livraison gratuite !'
          : `Frais de livraison : ${zoneApplicable.prix.toLocaleString()} FCFA`,
    };
  }

  // ─── Seed zones par défaut pour un vendeur ─────────────
  async seedZonesDefaut(vendeurUserId: string) {
    const profil = await this.getProfilVendeur(vendeurUserId);

    const existantes = await this.prisma.zoneLivraison.count({
      where: { vendeurId: profil.id },
    });

    if (existantes > 0) {
      throw new BadRequestException('Vous avez déjà des zones configurées');
    }

    const zonesDefaut = [
      {
        nom: 'Zone 1 — Gratuit',
        rayonMin: 0,
        rayonMax: 3,
        prix: 0,
        description: 'Livraison gratuite dans un rayon de 3 km',
      },
      {
        nom: 'Zone 2 — Standard',
        rayonMin: 3,
        rayonMax: 7,
        prix: 500,
        description: 'Livraison à 500 FCFA jusqu\'à 7 km',
      },
      {
        nom: 'Zone 3 — Étendue',
        rayonMin: 7,
        rayonMax: 15,
        prix: 1000,
        description: 'Livraison à 1000 FCFA jusqu\'à 15 km',
      },
    ];

    await this.prisma.zoneLivraison.createMany({
      data: zonesDefaut.map((z) => ({ ...z, vendeurId: profil.id })),
    });

    return this.getMesZones(vendeurUserId);
  }

  // ─── Formule Haversine (distance en km) ───────────────
  private haversine(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Rayon terre en km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}