// src/modules/ia/ia.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { IaService } from './ia.service';
import { ChatbotDto, AnalyseProduitDto, SuggestionPrixDto } from './dto/ia.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RoleType } from '@prisma/client';
import { IsString, IsOptional } from 'class-validator';

class GenererDescriptionDto {
  @IsString()
  nom: string;

  @IsString()
  details: string;

  @IsString()
  categorieId: string;
}

@Controller('ia')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IaController {
  constructor(private iaService: IaService) {}

  // ─── Chatbot client (public) ───────────────────────────
  @Public()
  @Post('chat')
  chatbot(@Body() dto: ChatbotDto) {
    return this.iaService.chatbot(null, dto);
  }

  // ─── Analyser mon produit (vendeur) ───────────────────
  @Post('analyser-produit')
  @Roles(RoleType.VENDEUR)
  analyserProduit(@CurrentUser() user: any, @Body() dto: AnalyseProduitDto) {
    return this.iaService.analyserProduit(user.id, dto);
  }

  // ─── Suggérer prix (vendeur) ──────────────────────────
  @Post('suggerer-prix')
  @Roles(RoleType.VENDEUR)
  suggererPrix(@Body() dto: SuggestionPrixDto) {
    return this.iaService.suggererPrix(dto);
  }

  // ─── Générer description (vendeur) ────────────────────
  @Post('generer-description')
  @Roles(RoleType.VENDEUR)
  genererDescription(@Body() dto: GenererDescriptionDto) {
    return this.iaService.genererDescription(
      dto.nom,
      dto.details,
      dto.categorieId,
    );
  }
}