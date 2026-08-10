import { join } from 'path';

export interface UploadConfig {
  uploadDir: string;
  maxFileSize: number;
  maxFiles: number;
  allowedMimeTypes: string[];
}

export const UPLOAD_CONFIG: UploadConfig = {
  uploadDir:
    process.env.NODE_ENV === 'production'
      ? '/tmp/uploads'
      : process.env.UPLOAD_DIR || join(process.cwd(), 'uploads'),
  maxFileSize: 1000 * 1024 * 1024,
  maxFiles: 5,
  allowedMimeTypes: [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',

    // Documents
    'application/pdf',

    // Microsoft Office
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    // Text files
    'text/plain',
    'text/csv',

    // Archives
    'application/zip',
    'application/x-rar-compressed',
  ],
};

export const FILE_TYPE_CATEGORIES = {
  images: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  spreadsheets: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ],
  presentations: [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
  text: ['text/plain'],
  archives: ['application/zip', 'application/x-rar-compressed'],
};

// Helper to get file category
export function getFileCategory(mimetype: string): string {
  for (const [category, mimetypes] of Object.entries(FILE_TYPE_CATEGORIES)) {
    if (mimetypes.includes(mimetype)) {
      return category;
    }
  }
  return 'other';
}

// Helper to check if file type is allowed
export function isFileTypeAllowed(mimetype: string): boolean {
  return UPLOAD_CONFIG.allowedMimeTypes.includes(mimetype);
}
