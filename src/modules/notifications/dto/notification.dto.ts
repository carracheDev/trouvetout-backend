// src/modules/notifications/dto/notification.dto.ts
import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { TypeNotification } from '@prisma/client';

export class SendNotificationDto {
  @IsString()
  userId: string;

  @IsString()
  titre: string;

  @IsString()
  contenu: string;

  @IsEnum(TypeNotification)
  type: TypeNotification;

  @IsOptional()
  @IsObject()
  data?: Record<string, string>;
}

export class SendMultipleDto {
  @IsString({ each: true })
  userIds: string[];

  @IsString()
  titre: string;

  @IsString()
  contenu: string;

  @IsEnum(TypeNotification)
  type: TypeNotification;

  @IsOptional()
  @IsObject()
  data?: Record<string, string>;
}