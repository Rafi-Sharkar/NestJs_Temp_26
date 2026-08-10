import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { compressImageIfRequired } from '@/common/utils/file-compression.util';

export interface FileUploadResult {
  filename: string;
  url: string;
  size: number;
}

export interface MultipleUploadResult {
  files: string[];
  total: number;
  success: number;
  failed: number;
  errors?: Array<{ filename: string; error: string }>;
}

@Injectable()
export class VpsFileUploadService {
  private readonly uploadsPath: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.uploadsPath =
      this.configService.get<string>('UPLOAD_PATH') ||
      path.join(process.cwd(), 'uploads');
    this.baseUrl =
      this.configService.get<string>('BASE_URL') || 'https://api.naqel.app';

    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadsPath);
    } catch {
      await fs.mkdir(this.uploadsPath, { recursive: true });
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<FileUploadResult> {
    const processedFile = await compressImageIfRequired(file);
    const filename = `${Date.now()}_${processedFile.originalname.replace(/\s+/g, '_')}`;
    const filepath = path.join(this.uploadsPath, filename);

    try {
      await fs.writeFile(filepath, processedFile.buffer);

      return {
        filename,
        url: `${this.baseUrl}/uploads/${filename}`,
        size: processedFile.size,
      };
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Failed to upload file: ${error.message}`,
      );
    }
  }

  async uploadMultiple(
    files: Express.Multer.File[],
  ): Promise<MultipleUploadResult> {
    const results: FileUploadResult[] = [];
    const errors: Array<{ filename: string; error: string }> = [];

    await Promise.allSettled(files.map((file) => this.uploadFile(file))).then(
      (outcomes) => {
        outcomes.forEach((outcome, index) => {
          if (outcome.status === 'fulfilled') {
            results.push(outcome.value);
          } else {
            errors.push({
              filename: files[index].originalname,
              error: outcome.reason?.message || 'Upload failed',
            });
          }
        });
      },
    );

    return {
      // only files url are returned to the user
      files: results.map((file) => file.url),
      total: files.length,
      success: results.length,
      failed: errors.length,
      ...(errors.length > 0 && { errors }),
    };
  }

  async deleteFile(filename: string): Promise<void> {
    const filepath = path.join(this.uploadsPath, filename);

    try {
      await fs.access(filepath);
      await fs.unlink(filepath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw new InternalServerErrorException(
          `Failed to delete file: ${error.message}`,
        );
      }
    }
  }

  async deleteMultiple(filenames: string[]): Promise<{
    deleted: number;
    failed: number;
    errors?: Array<{ filename: string; error: string }>;
  }> {
    const errors: Array<{ filename: string; error: string }> = [];
    let deleted = 0;

    await Promise.allSettled(
      filenames.map((filename) => this.deleteFile(filename)),
    ).then((outcomes) => {
      outcomes.forEach((outcome, index) => {
        if (outcome.status === 'fulfilled') {
          deleted++;
        } else {
          errors.push({
            filename: filenames[index],
            error: outcome.reason?.message || 'Deletion failed',
          });
        }
      });
    });

    return {
      deleted,
      failed: errors.length,
      ...(errors.length > 0 && { errors }),
    };
  }

  extractFilename(url: string): string {
    return url.split('/').pop() || '';
  }
}
