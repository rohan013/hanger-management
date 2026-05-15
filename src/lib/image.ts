import { STORAGE_CONFIG } from './config';

export type ProcessedImage = { buffer: Buffer; format: 'png' | 'jpeg' };

export async function removeBackground(inputBuffer: Buffer): Promise<Buffer> {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) return inputBuffer;

  const formData = new FormData();
  formData.append('image_file', new Blob([new Uint8Array(inputBuffer)]), 'image.jpg');
  formData.append('size', 'auto');

  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Remove.bg API error ${response.status}: ${text}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function processImage(inputBuffer: Buffer): Promise<ProcessedImage> {
  const sharp = (await import('sharp')).default;

  const metadata = await sharp(inputBuffer).metadata();
  const hasAlpha = metadata.channels === 4 || metadata.hasAlpha === true;

  if (hasAlpha) {
    const buffer = await sharp(inputBuffer)
      .resize({ width: STORAGE_CONFIG.TARGET_IMAGE_WIDTH, withoutEnlargement: true, fit: 'inside' })
      .png({ compressionLevel: 8 })
      .toBuffer();
    return { buffer, format: 'png' };
  }

  const buffer = await sharp(inputBuffer)
    .resize({ width: STORAGE_CONFIG.TARGET_IMAGE_WIDTH, withoutEnlargement: true, fit: 'inside' })
    .jpeg({ quality: STORAGE_CONFIG.TARGET_IMAGE_QUALITY })
    .toBuffer();
  return { buffer, format: 'jpeg' };
}
