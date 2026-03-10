// src/modules/livraisons/livraisons.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LivraisonsService } from './livraisons.service';
import {
  AccepterLivraisonDto,
  UpdateStatutLivraisonDto,
  UpdatePositionDto,
  NoterLivraisonDto,
} from './dto/livraison.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleType } from '@prisma/client';

@Controller('livraisons')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LivraisonsController {
  constructor(private livraisonsService: LivraisonsService) {}

  // ─── Disponibles (livreur) ─────────────────────────────
  @Get('disponibles')
  @Roles(RoleType.LIVREUR)
  getDisponibles(@CurrentUser() user: any) {
    return this.livraisonsService.getLivraisonsDisponibles(user.id);
  }

  // ─── Accepter livraison ────────────────────────────────
  @Post('accepter')
  @Roles(RoleType.LIVREUR)
  accepter(@CurrentUser() user: any, @Body() dto: AccepterLivraisonDto) {
    return this.livraisonsService.accepterLivraison(user.id, dto);
  }

  // ─── Mes livraisons ────────────────────────────────────
  @Get('mes-livraisons')
  @Roles(RoleType.LIVREUR)
  mesLivraisons(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 15,
  ) {
    return this.livraisonsService.mesLivraisons(user.id, +page, +limit);
  }

  // ─── Gains livreur ─────────────────────────────────────
  @Get('gains')
  @Roles(RoleType.LIVREUR)
  getGains(@CurrentUser() user: any) {
    return this.livraisonsService.getGains(user.id);
  }

  // ─── Toggle disponibilité ──────────────────────────────
  @Put('disponibilite')
  @Roles(RoleType.LIVREUR)
  toggleDisponibilite(@CurrentUser() user: any) {
    return this.livraisonsService.toggleDisponibilite(user.id);
  }

  // ─── Détail livraison ──────────────────────────────────
  @Get(':id')
  getLivraison(@Param('id') id: string, @CurrentUser() user: any) {
    return this.livraisonsService.getLivraison(id, user.id);
  }

  // ─── Statut livraison (livreur) ────────────────────────
  @Put(':id/statut')
  @Roles(RoleType.LIVREUR)
  updateStatut(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateStatutLivraisonDto,
  ) {
    return this.livraisonsService.updateStatut(id, user.id, dto);
  }

  // ─── Position GPS (HTTP fallback) ──────────────────────
  @Put(':id/position')
  @Roles(RoleType.LIVREUR)
  updatePosition(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdatePositionDto,
  ) {
    return this.livraisonsService.updatePosition(id, user.id, dto);
  }

  // ─── Position actuelle ─────────────────────────────────
  @Get(':id/position')
  getPosition(@Param('id') id: string, @CurrentUser() user: any) {
    return this.livraisonsService.getPositionActuelle(id, user.id);
  }

  // ─── Historique positions ──────────────────────────────
  @Get(':id/positions')
  getHistorique(@Param('id') id: string) {
    return this.livraisonsService.getHistoriquePositions(id);
  }
}