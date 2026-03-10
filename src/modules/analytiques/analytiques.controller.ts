// src/modules/analytiques/analytiques.controller.ts
import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AnalytiquesService } from './analytiques.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleType } from '@prisma/client';

@Controller('analytiques')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalytiquesController {
  constructor(private analytiquesService: AnalytiquesService) {}

  // ─── Dashboard vendeur ─────────────────────────────────
  @Get('dashboard')
  @Roles(RoleType.VENDEUR)
  getDashboard(@CurrentUser() user: any) {
    return this.analytiquesService.getDashboard(user.id);
  }

  // ─── Évolution ventes ──────────────────────────────────
  @Get('evolution')
  @Roles(RoleType.VENDEUR)
  getEvolution(
    @CurrentUser() user: any,
    @Query('periode') periode: '7j' | '30j' | '90j' = '30j',
  ) {
    return this.analytiquesService.getEvolutionVentes(user.id, periode);
  }

  // ─── Analyse produits ──────────────────────────────────
  @Get('produits')
  @Roles(RoleType.VENDEUR)
  getAnalyseProduits(@CurrentUser() user: any) {
    return this.analytiquesService.getAnalyseProduits(user.id);
  }

  // ─── Analyse clients ───────────────────────────────────
  @Get('clients')
  @Roles(RoleType.VENDEUR)
  getAnalyseClients(@CurrentUser() user: any) {
    return this.analytiquesService.getAnalyseClients(user.id);
  }

  // ─── Dashboard admin ───────────────────────────────────
  @Get('admin/dashboard')
  @Roles(RoleType.ADMIN)
  getDashboardAdmin() {
    return this.analytiquesService.getDashboardAdmin();
  }
}