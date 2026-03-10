// src/modules/fidelite/fidelite.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { FideliteService } from './fidelite.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RoleType } from '@prisma/client';
import { IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

class UtiliserPointsDto {
  @IsNumber()
  @Min(100)
  @Type(() => Number)
  points: number;

  @IsString()
  commandeId: string;
}

class AjouterPointsDto {
  @IsString()
  userId: string;

  @IsNumber()
  @Type(() => Number)
  points: number;

  @IsString()
  description: string;
}

@Controller('fidelite')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FideliteController {
  constructor(private fideliteService: FideliteService) {}

  // ─── Mon profil fidélité ───────────────────────────────
  @Get('mon-profil')
  getMonProfil(@CurrentUser() user: any) {
    return this.fideliteService.getMonProfil(user.id);
  }

  // ─── Historique transactions ───────────────────────────
  @Get('historique')
  getHistorique(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.fideliteService.getHistorique(user.id, +page, +limit);
  }

  // ─── Utiliser points ───────────────────────────────────
  @Post('utiliser')
  utiliserPoints(@CurrentUser() user: any, @Body() dto: UtiliserPointsDto) {
    return this.fideliteService.utiliserPoints(
      user.id,
      dto.points,
      dto.commandeId,
    );
  }

  // ─── Classement (public) ───────────────────────────────
  @Public()
  @Get('classement')
  getClassement(@Query('limit') limit = 10) {
    return this.fideliteService.getClassement(+limit);
  }

  // ─── Stats (admin) ─────────────────────────────────────
  @Get('stats')
  @Roles(RoleType.ADMIN)
  getStats() {
    return this.fideliteService.getStats();
  }

  // ─── Ajouter points (admin) ────────────────────────────
  @Post('admin/ajouter')
  @Roles(RoleType.ADMIN)
  ajouterPoints(@Body() dto: AjouterPointsDto) {
    return this.fideliteService.ajouterPoints(
      dto.userId,
      dto.points,
      dto.description,
    );
  }
}