import { STORAGE_CONFIG } from './config';
import { logger } from './logger';

export type ProcessedImage = { buffer: Buffer; format: 'png' | 'jpeg' };

export async function removeBackground(inputBuffer: Buffer): Promise<Buffer> {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    logger.info('remove.bg API key not set, skipping background removal');
    return inputBuffer;
  }

  const formData = new FormData();
  formData.append('image_file', new Blob([new Uint8Array(inputBuffer)]), 'image.jpg');
  formData.append('size', 'auto');

  logger.info('calling remove.bg API');
  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error('remove.bg API error', { status: response.status, body: text.substring(0, 200) });
    throw new Error(`Remove.bg API error ${response.status}: ${text}`);
  }

  logger.info('remove.bg API: background removed');
  return Buffer.from(await response.arrayBuffer());
}

export async function processImage(inputBuffer: Buffer): Promise<ProcessedImage> {
  const sharp = (await import('sharp')).default;

  const metadata = await sharp(inputBuffer).metadata();
  const hasAlpha = metadata.channels === 4 || metadata.hasAlpha === true;

  if (hasAlpha) {
    logger.info('processing image', { hasAlpha: true, outputFormat: 'png' });
    const buffer = await sharp(inputBuffer)
      .resize({ width: STORAGE_CONFIG.TARGET_IMAGE_WIDTH, withoutEnlargement: true, fit: 'inside' })
      .png({ compressionLevel: 8 })
      .toBuffer();
    return { buffer, format: 'png' };
  }

  logger.info('processing image', { hasAlpha: false, outputFormat: 'jpeg' });
  const buffer = await sharp(inputBuffer)
    .resize({ width: STORAGE_CONFIG.TARGET_IMAGE_WIDTH, withoutEnlargement: true, fit: 'inside' })
    .jpeg({ quality: STORAGE_CONFIG.TARGET_IMAGE_QUALITY })
    .toBuffer();
  return { buffer, format: 'jpeg' };
}
