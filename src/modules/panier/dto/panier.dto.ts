// src/modules/panier/dto/panier.dto.ts
import { IsString, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AddPanierDto {
  @IsString()
  produitId: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantite: number;
}

export class UpdateQuantiteDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantite: number;
}