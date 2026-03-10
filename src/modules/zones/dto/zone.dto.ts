// src/modules/livraisons/dto/zone.dto.ts
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateZoneDto {
  @IsString()
  nom: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  rayonMin: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  rayonMax: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  prix: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  estActif?: boolean;
}

export class UpdateZoneDto {
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  rayonMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  rayonMax?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  prix?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  estActif?: boolean;
}

export class CalculerFraisDto {
  @IsNumber()
  @Type(() => Number)
  latitudeClient: number;

  @IsNumber()
  @Type(() => Number)
  longitudeClient: number;

  @IsString()
  vendeurId: string;
}