// src/modules/upload/upload.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  // ─── Upload image ──────────────────────────────────────
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'trouvetout',
  ): Promise<{ url: string; publicId: string }> {
    if (!file) throw new BadRequestException('Aucun fichier fourni');

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('Image trop lourde (max 5MB)');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Format non supporté (jpg, png, webp)');
    }

    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            transformation: [
              { quality: 'auto', fetch_format: 'auto' },
              { width: 1200, crop: 'limit' },
            ],
          },
          (error, result) => {
            if (error) reject(new BadRequestException(error.message));
            else resolve({ url: result.secure_url, publicId: result.public_id });
          },
        )
        .end(file.buffer);
    });
  }

  // ─── Upload vidéo ──────────────────────────────────────
  async uploadVideo(
    file: Express.Multer.File,
    folder: string = 'trouvetout/videos',
  ): Promise<{ url: string; publicId: string; thumbnail: string; duree: number }> {
    if (!file) throw new BadRequestException('Aucun fichier fourni');

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new BadRequestException('Vidéo trop lourde (max 50MB)');
    }

    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Format non supporté (mp4, mov, webm)');
    }

    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type: 'video',
            transformation: [
              { quality: 'auto' },
              { width: 720, crop: 'limit' },
            ],
          },
          (error, result) => {
            if (error) reject(new BadRequestException(error.message));
            else {
              const thumbnail = cloudinary.url(result.public_id, {
                resource_type: 'video',
                format: 'jpg',
                transformation: [{ width: 400, crop: 'limit' }],
              });
              resolve({
                url: result.secure_url,
                publicId: result.public_id,
                thumbnail,
                duree: Math.round(result.duration || 0),
              });
            }
          },
        )
        .end(file.buffer);
    });
  }

  // ─── Upload multiple images ────────────────────────────
  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: string = 'trouvetout',
  ): Promise<{ url: string; publicId: string }[]> {
    if (!files?.length) throw new BadRequestException('Aucun fichier fourni');
    if (files.length > 5) throw new BadRequestException('Maximum 5 images');

    return Promise.all(files.map((file) => this.uploadImage(file, folder)));
  }

  // ─── Supprimer fichier ─────────────────────────────────
  async deleteFile(publicId: string, resourceType: 'image' | 'video' = 'image') {
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
    } catch (error) {
      console.error('Erreur suppression Cloudinary:', error);
    }
  }
}