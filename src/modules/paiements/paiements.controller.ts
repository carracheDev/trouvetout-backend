// src/modules/paiements/paiements.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PaiementsService } from './paiements.service';
import { InitierPaiementDto } from './dto/paiement.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { IsString } from 'class-validator';

class ConfirmerDto {
  @IsString()
  paiementId: string;

  @IsString()
  transactionId: string;
}

@Controller('paiements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaiementsController {
  constructor(private paiementsService: PaiementsService) {}

  // ─── Initier paiement ──────────────────────────────────
  @Post('initier')
  initier(@CurrentUser() user: any, @Body() dto: InitierPaiementDto) {
    return this.paiementsService.initierPaiement(user.id, dto);
  }

  // ─── Confirmer après SDK Flutter ──────────────────────
  @Post('confirmer')
  confirmer(@CurrentUser() user: any, @Body() dto: ConfirmerDto) {
    return this.paiementsService.confirmerPaiement(
      user.id,
      dto.paiementId,
      dto.transactionId,
    );
  }

  // ─── Libérer escrow ────────────────────────────────────
  @Post('escrow/:commandeId/liberer')
  libererEscrow(
    @Param('commandeId') commandeId: string,
    @CurrentUser() user: any,
  ) {
    return this.paiementsService.libererEscrow(commandeId, user.id);
  }

  // ─── Historique paiements ──────────────────────────────
  @Get('historique')
  getHistorique(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 15,
  ) {
    return this.paiementsService.getHistorique(user.id, +page, +limit);
  }

  // ─── Webhook KKiaPay ───────────────────────────────────
  @Public()
  @Post('webhook/kkiapay')
  @HttpCode(HttpStatus.OK)
  webhook(
    @Body() payload: any,
    @Headers('x-kkiapay-signature') signature: string,
  ) {
    return this.paiementsService.handleWebhook(payload, signature);
  }
}