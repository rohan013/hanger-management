import { STORAGE_CONFIG } from './config';

/**
 * Resize and compress an image buffer using sharp.
 * Returns a JPEG buffer at the configured target width and quality.
 */
export async function processImage(inputBuffer: Buffer): Promise<Buffer> {
  // Dynamic import to respect serverExternalPackages
  const sharp = (await import('sharp')).default;

  const compressed = await sharp(inputBuffer)
    .resize({
      width: STORAGE_CONFIG.TARGET_IMAGE_WIDTH,
      withoutEnlargement: true, // don't upscale smaller images
      fit: 'inside',
    })
    .jpeg({ quality: STORAGE_CONFIG.TARGET_IMAGE_QUALITY })
    .toBuffer();

  return compressed;
}
