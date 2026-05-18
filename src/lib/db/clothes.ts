import { sql } from '@vercel/postgres';
import { ensureInitialized } from './schema';
import type { ClothingItem } from '@/types';

export async function getAllClothingItems(): Promise<ClothingItem[]> {
  await ensureInitialized();
  const { rows } = await sql`
    SELECT id, category, colors, color_names, description, tags, image_url, blob_pathname,
           created_at::text AS created_at
    FROM clothing_items
    ORDER BY created_at DESC
  `;
  return rows as ClothingItem[];
}

export async function getClothingItemById(id: string): Promise<ClothingItem | null> {
  await ensureInitialized();
  const { rows } = await sql`
    SELECT id, category, colors, color_names, description, tags, image_url, blob_pathname,
           created_at::text AS created_at
    FROM clothing_items
    WHERE id = ${id}
  `;
  return (rows[0] as ClothingItem) || null;
}

export async function insertClothingItem(data: {
  category: string;
  colors: string[];
  color_names: string[];
  description: string;
  tags: string[];
  image_url: string;
  blob_pathname: string;
}): Promise<ClothingItem> {
  await ensureInitialized();
  const { rows } = await sql`
    INSERT INTO clothing_items (category, colors, color_names, description, tags, image_url, blob_pathname)
    VALUES (
      ${data.category},
      ${JSON.stringify(data.colors)}::jsonb,
      ${JSON.stringify(data.color_names)}::jsonb,
      ${data.description},
      ${JSON.stringify(data.tags)}::jsonb,
      ${data.image_url},
      ${data.blob_pathname}
    )
    RETURNING id, category, colors, color_names, description, tags, image_url, blob_pathname,
              created_at::text AS created_at
  `;
  return rows[0] as ClothingItem;
}

export async function updateClothingItem(
  id: string,
  data: {
    category: string;
    colors: string[];
    color_names: string[];
    description: string | null;
    tags: string[];
  }
): Promise<ClothingItem | null> {
  await ensureInitialized();
  const { rows } = await sql`
    UPDATE clothing_items
    SET category = ${data.category},
        colors = ${JSON.stringify(data.colors)}::jsonb,
        color_names = ${JSON.stringify(data.color_names)}::jsonb,
        description = ${data.description},
        tags = ${JSON.stringify(data.tags)}::jsonb
    WHERE id = ${id}
    RETURNING id, category, colors, color_names, description, tags, image_url, blob_pathname,
              created_at::text AS created_at
  `;
  return (rows[0] as ClothingItem) || null;
}

export async function deleteClothingItem(id: string): Promise<void> {
  await ensureInitialized();
  await sql`DELETE FROM clothing_items WHERE id = ${id}`;
}

