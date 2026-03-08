// src/modules/produits/dto/create-produit.dto.ts
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  Min,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProduitDto {
  @IsString()
  nom: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  prix: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  prixPromo?: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  stock: number;

  @IsString()
  categorieId: string;

  // Médias — URLs Cloudinary déjà uploadées
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  videoThumbnail?: string;

  @IsOptional()
  @IsInt()
  videoDuree?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];
}

export class UpdateProduitDto {
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  prix?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  prixPromo?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  stock?: number;

  @IsOptional()
  @IsBoolean()
  estDisponible?: boolean;

  @IsOptional()
  @IsBoolean()
  estEnPromo?: boolean;

  @IsOptional()
  @IsString()
  categorieId?: string;
}

export class FilterProduitDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  categorieId?: string;

  @IsOptional()
  @IsString()
  categorieSlug?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  prixMin?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  prixMax?: number;

  @IsOptional()
  @IsString()
  tri?: 'recent' | 'prix_asc' | 'prix_desc' | 'populaire' | 'note';

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number;
}

export class CreateCommentaireDto {
  @IsString()
  contenu: string;
}

export class CreateAvisDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  note: number;

  @IsOptional()
  @IsString()
  commentaire?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
}