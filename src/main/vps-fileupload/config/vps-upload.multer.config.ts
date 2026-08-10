import { BadRequestException } from '@nestjs/common';
import { MulterModuleOptions } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UPLOAD_CONFIG } from './vps-upload.config';

export function createMulterOptions(): MulterModuleOptions {
  return {
    storage: diskStorage({
      destination: (req, file, callback) => {
        try {
          if (!existsSync(UPLOAD_CONFIG.uploadDir)) {
            mkdirSync(UPLOAD_CONFIG.uploadDir, {
              recursive: true,
              mode: 0o755,
            });
          }
          callback(null, UPLOAD_CONFIG.uploadDir);
        } catch {
          callback(
            new BadRequestException('Failed to create upload directory'),
            '',
          );
        }
      },
      filename: (req, file, callback) => {
        try {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const fileExt = extname(file.originalname);
          callback(null, `${uniqueSuffix}${fileExt}`);
        } catch {
          callback(new BadRequestException('Failed to generate filename'), '');
        }
      },
    }),
    limits: {
      files: UPLOAD_CONFIG.maxFiles,
      fileSize: UPLOAD_CONFIG.maxFileSize,
    },
    fileFilter: (req, file, callback) => {
      if (UPLOAD_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
        callback(null, true);
      } else {
        callback(
          new BadRequestException(
            `File type "${file.mimetype}" is not allowed. Allowed types: images, documents, spreadsheets, presentations`,
          ),
          false,
        );
      }
    },
  };
}
