import { sql } from '@vercel/postgres';

let initialized = false;

export async function ensureInitialized(): Promise<void> {
  if (initialized) return;
  await sql`CREATE TABLE IF NOT EXISTS clothing_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,
    colors JSONB NOT NULL,
    color_names JSONB NOT NULL,
    description TEXT,
    tags JSONB,
    image_url TEXT NOT NULL,
    blob_pathname TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS outfit_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_ids JSONB NOT NULL,
    explanation TEXT NOT NULL,
    color_scheme VARCHAR(50),
    color_theory_description TEXT,
    palette_colors JSONB,
    recommended_for DATE NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  initialized = true;
}
