import { getAIProvider } from '@/lib/ai/provider';
import { getAllClothingItems, getClothingItemById } from '@/lib/db/clothes';
import { signImageUrl } from '@/lib/storage';
import {
  getTodaysRecommendation,
  insertRecommendation,
  deleteTodaysRecommendation,
} from '@/lib/db/recommendations';
import type { ClothingItem, OutfitRecommendation, RecommendationWithItems } from '@/types';

async function hydrateItems(rec: OutfitRecommendation): Promise<RecommendationWithItems> {
  const items: ClothingItem[] = (
    await Promise.all(rec.item_ids.map(id => getClothingItemById(id)))
  )
    .filter((item): item is ClothingItem => item !== null)
    .map(item => ({ ...item, image_url: signImageUrl(item.image_url) }));
  return { ...rec, items };
}

export async function getOrCreateTodaysRecommendation(): Promise<RecommendationWithItems> {
  const cached = await getTodaysRecommendation();
  if (cached) return hydrateItems(cached);
  return generateRecommendation();
}

export async function generateRecommendation(): Promise<RecommendationWithItems> {
  const allItems = await getAllClothingItems();
  if (allItems.length === 0) throw new Error('No clothing items in wardrobe. Upload some items first!');
  await deleteTodaysRecommendation();
  const result = await getAIProvider().recommendOutfit(allItems);
  const rec = await insertRecommendation(result);
  return hydrateItems(rec);
}
