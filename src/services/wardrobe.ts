import { STORAGE_CONFIG } from '@/lib/config';
import { processImage, removeBackground } from '@/lib/image';
import { uploadImage, deleteImage, signImageUrl } from '@/lib/storage';
import { getAIProvider } from '@/lib/ai/provider';
import {
  getAllClothingItems,
  getClothingItemById,
  insertClothingItem,
  updateClothingItem,
  deleteClothingItem,
  getClothingItemCount,
} from '@/lib/db/clothes';
import type { ClothingItem } from '@/types';

export async function listClothingItems(): Promise<ClothingItem[]> {
  const items = await getAllClothingItems();
  return items.map(item => ({ ...item, image_url: signImageUrl(item.image_url) }));
}

export async function uploadClothingItem(file: File): Promise<ClothingItem> {
  if (file.size > STORAGE_CONFIG.MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error(`File too large. Maximum size is ${STORAGE_CONFIG.MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)}MB`);
  }
  const count = await getClothingItemCount();
  if (count >= STORAGE_CONFIG.MAX_CLOTHING_ITEMS) {
    throw new Error(`Wardrobe is full. Maximum ${STORAGE_CONFIG.MAX_CLOTHING_ITEMS} items allowed.`);
  }
  const rawBuffer = Buffer.from(await file.arrayBuffer());
  const withoutBg = await removeBackground(rawBuffer);
  const { buffer: compressed, format } = await processImage(withoutBg);
  const sanitized = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const filename = `clothing/${Date.now()}-${sanitized}.${format === 'png' ? 'png' : 'jpg'}`;
  const { url, pathname } = await uploadImage(filename, compressed);
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const analysis = await getAIProvider().analyzeClothing(compressed, mimeType);
  const item = await insertClothingItem({ ...analysis, image_url: url, blob_pathname: pathname });
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
