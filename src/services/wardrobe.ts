import { logger } from '@/lib/logger';
import { processImage, removeBackground } from '@/lib/image';
import { uploadImage, downloadImage, deleteImage, signImageUrl } from '@/lib/storage';
import { getAIProvider } from '@/lib/ai/provider';
import {
  getAllClothingItems,
  getClothingItemById,
  insertClothingItem,
  updateClothingItem,
  deleteClothingItem,
} from '@/lib/db/clothes';
import type { ClothingItem } from '@/types';

export async function listClothingItems(): Promise<ClothingItem[]> {
  const items = await getAllClothingItems();
  return items.map(item => ({ ...item, image_url: signImageUrl(item.image_url) }));
}

export async function uploadClothingItem(blobUrl: string, blobPathname: string): Promise<ClothingItem> {
  logger.info('downloading raw upload', { blobPathname });
  const { stream } = await downloadImage(blobUrl).catch((err) => {
    logger.error('blob download failed', { blobPathname, error: err?.message });
    throw new Error('Failed to download blob');
  });
  const rawBuffer = Buffer.from(await new Response(stream).arrayBuffer());

  logger.info('removing background', { blobPathname });
  const withoutBg = await removeBackground(rawBuffer);

  logger.info('processing image', { blobPathname });
  const { buffer: compressed, format } = await processImage(withoutBg);

  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const filename = `clothing/${Date.now()}.${format === 'png' ? 'png' : 'jpg'}`;
  logger.info('uploading processed image to blob storage', { filename });
  const { url, pathname } = await uploadImage(filename, compressed, mimeType);

  await deleteImage(blobPathname);
  logger.info('analyzing clothing with AI', { filename });
  const analysis = await getAIProvider().analyzeClothing(compressed, mimeType);
  const item = await insertClothingItem({ ...analysis, image_url: url, blob_pathname: pathname });
  logger.info('clothing item created', { id: item.id, category: item.category });
  return { ...item, image_url: signImageUrl(item.image_url) };
}

export async function editClothingItem(
  id: string,
  data: { category: string; colors: string[]; color_names: string[]; description: string | null; tags: string[] }
): Promise<ClothingItem> {
  const item = await updateClothingItem(id, data);
  if (!item) throw new Error('Item not found');
  return { ...item, image_url: signImageUrl(item.image_url) };
}

export async function removeClothingItem(id: string): Promise<void> {
  const item = await getClothingItemById(id);
  if (!item) throw new Error('Item not found');
  await deleteImage(item.blob_pathname);
  await deleteClothingItem(id);
}
