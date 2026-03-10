// src/modules/livraisons/dto/livraison.dto.ts
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StatutLivraison } from '@prisma/client';

export class AccepterLivraisonDto {
  @IsString()
  commandeId: string;
}

export class UpdateStatutLivraisonDto {
  @IsEnum(StatutLivraison)
  statut: StatutLivraison;

  @IsOptional()
  @IsString()
  photo?: string;
}

export class UpdatePositionDto {
  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @IsNumber()
  @Type(() => Number)
  longitude: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  vitesse?: number;
}

export class NoterLivraisonDto {
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  note: number;
}