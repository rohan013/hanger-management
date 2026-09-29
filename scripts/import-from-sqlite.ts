/**
 * One-off import of the self-hosted SQLite wardrobe into Postgres and Vercel Blob.
 *
 * Usage:
 *   node --env-file=.env.vercel.local scripts/import-from-sqlite.ts [--dry-run] [data-dir]
 *
 * Requires POSTGRES_URL and BLOB_READ_WRITE_TOKEN. data-dir defaults to ./data
 * and must contain wardrobe.db and images/.
 *
 * Row ids are kept, since recommendations reference items by id. Images are
 * stored at clothing/<id>.<ext> and rows are inserted with ON CONFLICT DO
 * NOTHING, so the script can be re-run after a partial failure.
 */
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { sql } from '@vercel/postgres';
import { put } from '@vercel/blob';
import { ensureInitialized } from '../src/lib/db/schema.ts';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const dataDir = args.find((a) => !a.startsWith('--')) ?? path.join(process.cwd(), 'data');

interface ItemRow {
  id: string;
  category: string;
  colors: string;
  color_names: string;
  description: string | null;
  tags: string;
  image_path: string;
  created_at: string;
}

interface RecommendationRow {
  id: string;
  item_ids: string;
  explanation: string;
  color_scheme: string | null;
  color_theory_description: string | null;
  palette_colors: string | null;
  recommended_for: string;
  created_at: string;
}

function contentTypeFor(name: string): string {
  return name.endsWith('.png') ? 'image/png' : 'image/jpeg';
}

async function main(): Promise<void> {
  const db = new DatabaseSync(path.join(dataDir, 'wardrobe.db'), { readOnly: true });
  const items = db.prepare('SELECT * FROM clothing_items ORDER BY created_at').all() as unknown as ItemRow[];
  const recs = db
    .prepare('SELECT * FROM outfit_recommendations ORDER BY recommended_for')
    .all() as unknown as RecommendationRow[];
  db.close();

  console.log(`Found ${items.length} clothing items and ${recs.length} recommendations in ${dataDir}`);

  // Read every image before writing anything, so a missing file stops the
  // import before it has touched Postgres or Blob.
  const images = new Map<string, Buffer>();
  for (const item of items) {
    images.set(item.id, await readFile(path.join(dataDir, 'images', item.image_path)));
  }

  if (dryRun) {
    const bytes = [...images.values()].reduce((n, b) => n + b.length, 0);
    console.log(`Dry run: all ${images.size} images present, ${(bytes / 1024 / 1024).toFixed(1)} MB total`);
    return;
  }

  await ensureInitialized();

  let inserted = 0;
  for (const [i, item] of items.entries()) {
    const ext = path.extname(item.image_path);
    const blob = await put(`clothing/${item.id}${ext}`, images.get(item.id)!, {
      access: 'private',
      contentType: contentTypeFor(item.image_path),
      allowOverwrite: true,
    });
    const { rowCount } = await sql`
      INSERT INTO clothing_items
        (id, category, colors, color_names, description, tags, image_url, blob_pathname, created_at)
      VALUES (
        ${item.id}::uuid,
        ${item.category},
        ${item.colors}::jsonb,
        ${item.color_names}::jsonb,
        ${item.description},
        ${item.tags}::jsonb,
        ${blob.url},
        ${blob.pathname},
        ${item.created_at}::timestamptz
      )
      ON CONFLICT (id) DO NOTHING
    `;
    inserted += rowCount ?? 0;
    console.log(`[${i + 1}/${items.length}] ${item.category} -> ${blob.pathname}`);
  }
  console.log(`Clothing items: ${inserted} inserted, ${items.length - inserted} already present`);

  let recsInserted = 0;
  for (const rec of recs) {
    const { rowCount } = await sql`
      INSERT INTO outfit_recommendations
        (id, item_ids, explanation, color_scheme, color_theory_description, palette_colors,
         recommended_for, created_at)
      VALUES (
        ${rec.id}::uuid,
        ${rec.item_ids}::jsonb,
        ${rec.explanation},
        ${rec.color_scheme},
        ${rec.color_theory_description},
        ${rec.palette_colors}::jsonb,
        ${rec.recommended_for}::date,
        ${rec.created_at}::timestamptz
      )
      ON CONFLICT DO NOTHING
    `;
    recsInserted += rowCount ?? 0;
  }
  console.log(`Recommendations: ${recsInserted} inserted, ${recs.length - recsInserted} already present`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
