// src/modules/categories/dto/create-categorie.dto.ts
import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator';

export class CreateCategorieDto {
  @IsString()
  nom: string;

  @IsString()
  slug: string;

  @IsString()
  icone: string;

  @IsOptional()
  @IsString()
  couleur?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsInt()
  ordre?: number;
}

export class UpdateCategorieDto {
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  icone?: string;

  @IsOptional()
  @IsString()
  couleur?: string;

  @IsOptional()
  @IsBoolean()
  estActif?: boolean;

  @IsOptional()
  @IsInt()
  ordre?: number;
}