// src/modules/auth/dto/update-fcm.dto.ts
import { IsString } from 'class-validator';

export class UpdateFcmDto {
  @IsString()
  fcmToken: string;
}