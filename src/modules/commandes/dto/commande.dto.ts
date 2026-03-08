// src/modules/commandes/dto/commande.dto.ts
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MethodePaiement } from '@prisma/client';

export class CreateCommandeDto {
  @IsString()
  adresseId: string;

  @IsEnum(MethodePaiement)
  methodePaiement: MethodePaiement;

  @IsOptional()
  @IsString()
  codePromo?: string;

}

export class CalculerLivraisonDto {
  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @IsNumber()
  @Type(() => Number)
  longitude: number;

  @IsString()
  vendeurId: string;
}