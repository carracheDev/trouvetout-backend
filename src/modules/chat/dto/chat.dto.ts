// src/modules/chat/dto/chat.dto.ts
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { TypeMessage } from '@prisma/client';

export class EnvoyerMessageDto {
  @IsString()
  conversationId: string;

  @IsString()
  contenu: string;

  @IsEnum(TypeMessage)
  @IsOptional()
  type?: TypeMessage;
}

export class CreerConversationDto {
  @IsString()
  destinataireId: string;

  @IsOptional()
  @IsString()
  commandeId?: string;

  @IsOptional()
  @IsString()
  premierMessage?: string;
}