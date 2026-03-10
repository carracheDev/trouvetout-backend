// src/modules/paiements/dto/paiement.dto.ts
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { MethodePaiement } from '@prisma/client';

export class InitierPaiementDto {
  @IsString()
  commandeId: string;

  @IsEnum(MethodePaiement)
  methode: MethodePaiement;
}

export class WebhookKKiaPayDto {
  @IsString()
  transactionId: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsOptional()
  amount?: number;

  @IsOptional()
  data?: any;
}