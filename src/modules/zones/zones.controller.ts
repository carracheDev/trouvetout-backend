// src/modules/livraisons/zones.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ZonesService } from './zones.service';
import { CreateZoneDto, UpdateZoneDto, CalculerFraisDto } from './dto/zone.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RoleType } from '@prisma/client';

@Controller('zones-livraison')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ZonesController {
  constructor(private zonesService: ZonesService) {}

  // ─── Mes zones (vendeur) ───────────────────────────────
  @Get('mes-zones')
  @Roles(RoleType.VENDEUR)
  getMesZones(@CurrentUser() user: any) {
    return this.zonesService.getMesZones(user.id);
  }

  // ─── Zones d'un vendeur (public) ──────────────────────
  @Public()
  @Get('vendeur/:vendeurId')
  getZonesVendeur(@Param('vendeurId') vendeurId: string) {
    return this.zonesService.getZonesVendeur(vendeurId);
  }

  // ─── Créer zone ────────────────────────────────────────
  @Post()
  @Roles(RoleType.VENDEUR)
  creer(@CurrentUser() user: any, @Body() dto: CreateZoneDto) {
    return this.zonesService.creerZone(user.id, dto);
  }

  // ─── Modifier zone ─────────────────────────────────────
  @Put(':id')
  @Roles(RoleType.VENDEUR)
  modifier(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateZoneDto,
  ) {
    return this.zonesService.modifierZone(id, user.id, dto);
  }

  // ─── Supprimer zone ────────────────────────────────────
  @Delete(':id')
  @Roles(RoleType.VENDEUR)
  supprimer(@Param('id') id: string, @CurrentUser() user: any) {
    return this.zonesService.supprimerZone(id, user.id);
  }

  // ─── Calculer frais (public) ───────────────────────────
  @Public()
  @Post('calculer-frais')
  calculerFrais(@Body() dto: CalculerFraisDto) {
    return this.zonesService.calculerFrais(dto);
  }

  // ─── Seed zones par défaut ─────────────────────────────
  @Post('seed-defaut')
  @Roles(RoleType.VENDEUR)
  seedDefaut(@CurrentUser() user: any) {
    return this.zonesService.seedZonesDefaut(user.id);
  }
}