// src/modules/ia/dto/ia.dto.ts
import { IsString, IsOptional, IsArray } from 'class-validator';

export class ChatbotDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  produitId?: string;

  @IsOptional()
  @IsArray()
  historique?: { role: 'user' | 'assistant'; content: string }[];
}

export class AnalyseProduitDto {
  @IsString()
  produitId: string;
}

export class SuggestionPrixDto {
  @IsString()
  nom: string;

  @IsString()
  description: string;

  @IsString()
  categorieId: string;
}