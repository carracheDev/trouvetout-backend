// src/modules/upload/upload.controller.ts
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private uploadService: UploadService) {}

  // ─── Upload une image ──────────────────────────────────
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage() }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fichier manquant');
    return this.uploadService.uploadImage(file, 'trouvetout/images');
  }

  // ─── Upload avatar ─────────────────────────────────────
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage() }),
  )
  uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fichier manquant');
    return this.uploadService.uploadImage(file, 'trouvetout/avatars');
  }

  // ─── Upload plusieurs images ───────────────────────────
  @Post('images')
  @UseInterceptors(
    FilesInterceptor('files', 5, { storage: memoryStorage() }),
  )
  uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('Fichiers manquants');
    return this.uploadService.uploadMultipleImages(files, 'trouvetout/produits');
  }

  // ─── Upload vidéo ──────────────────────────────────────
  @Post('video')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  uploadVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fichier manquant');
    return this.uploadService.uploadVideo(file, 'trouvetout/videos');
  }
}