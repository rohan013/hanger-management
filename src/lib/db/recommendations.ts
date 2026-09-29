import { sql } from '@vercel/postgres';
import { ensureInitialized } from './schema';
import type { OutfitRecommendation } from '@/types';
import { today } from '@/lib/config';

export async function getTodaysRecommendation(): Promise<OutfitRecommendation | null> {
  await ensureInitialized();
  const { rows } = await sql`
    SELECT id, item_ids, explanation, color_scheme, color_theory_description, palette_colors,
           recommended_for::text AS recommended_for, created_at::text AS created_at
    FROM outfit_recommendations
    WHERE recommended_for = ${today()}::date
  `;
  return (rows[0] as OutfitRecommendation) || null;
}

export async function insertRecommendation(data: {
  item_ids: string[];
  explanation: string;
  color_scheme: string;
  color_theory_description: string;
  palette_colors: string[];
}): Promise<OutfitRecommendation> {
  await ensureInitialized();
  const { rows } = await sql`
    INSERT INTO outfit_recommendations
      (item_ids, explanation, color_scheme, color_theory_description, palette_colors, recommended_for)
    VALUES (
      ${JSON.stringify(data.item_ids)}::jsonb,
      ${data.explanation},
      ${data.color_scheme},
      ${data.color_theory_description},
      ${JSON.stringify(data.palette_colors)}::jsonb,
      ${today()}::date
    )
    RETURNING id, item_ids, explanation, color_scheme, color_theory_description, palette_colors,
              recommended_for::text AS recommended_for, created_at::text AS created_at
  `;
  return rows[0] as OutfitRecommendation;
}

export async function deleteTodaysRecommendation(): Promise<void> {
  await ensureInitialized();
  await sql`DELETE FROM outfit_recommendations WHERE recommended_for = ${today()}::date`;
}
