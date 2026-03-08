// src/modules/commandes/commandes.controller.ts
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
import { CommandesService } from './commandes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RoleType, StatutCommande } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { CalculerLivraisonDto, CreateCommandeDto } from '../commandes/dto/commande.dto';

class UpdateStatutDto {
  @IsEnum(StatutCommande)
  statut: StatutCommande;
}

@Controller('commandes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommandesController {
  constructor(private commandesService: CommandesService) {}

  @Public()
  @Post('calculer-livraison')
  calculerLivraison(@Body() dto: CalculerLivraisonDto) {
    return this.commandesService.calculerLivraison(dto);
  }

  @Post()
  creerCommande(@CurrentUser() user: any, @Body() dto: CreateCommandeDto) {
    return this.commandesService.creerCommande(user.id, dto);
  }

  @Get('mes-commandes')
  mesCommandes(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 15,
  ) {
    return this.commandesService.mesCommandes(user.id, +page, +limit);
  }

  @Get('vendeur')
  @Roles(RoleType.VENDEUR)
  commandesVendeur(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 15,
  ) {
    return this.commandesService.commandesVendeur(user.id, +page, +limit);
  }

  @Get(':id')
  getCommande(@Param('id') id: string, @CurrentUser() user: any) {
    return this.commandesService.getCommande(id, user.id);
  }

  @Put(':id/statut')
  @Roles(RoleType.VENDEUR)
  updateStatut(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateStatutDto,
  ) {
    return this.commandesService.updateStatut(id, user.id, dto.statut);
  }

  @Put(':id/annuler')
  annuler(@Param('id') id: string, @CurrentUser() user: any) {
    return this.commandesService.annulerCommande(id, user.id);
  }
}