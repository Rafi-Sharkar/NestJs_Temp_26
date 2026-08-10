import sharp from 'sharp';

/**
 * Compresses an image to WebP format with 80% quality.
 * If the file is not a compressible image, returns it unchanged.
 */
export async function compressImageIfRequired(
  file: Express.Multer.File,
): Promise<Express.Multer.File> {
  // We only compress images (excluding svg)
  if (
    !file.mimetype.startsWith('image/') ||
    file.mimetype === 'image/svg+xml'
  ) {
    return file;
  }

  try {
    const webpBuffer = await sharp(file.buffer)
      .webp({ quality: 80 })
      .toBuffer();

    // Replace the original extension with .webp
    const lastDotIndex = file.originalname.lastIndexOf('.');
    const originalNameWithoutExt =
      lastDotIndex !== -1
        ? file.originalname.substring(0, lastDotIndex)
        : file.originalname;
    const webpOriginalName = `${originalNameWithoutExt}.webp`;

    return {
      ...file,
      buffer: webpBuffer,
      originalname: webpOriginalName,
      mimetype: 'image/webp',
      size: webpBuffer.length,
    };
  } catch (error) {
    console.error(
      'Failed to compress image, uploading original file. Error:',
      error,
    );
    return file;
  }
}
