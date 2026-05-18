import { NextRequest, NextResponse } from 'next/server';
import { listClothingItems, uploadClothingItem } from '@/services/wardrobe';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    return NextResponse.json(await listClothingItems());
  } catch (err) {
    logger.error('GET /api/clothes failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to fetch wardrobe' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    const item = await uploadClothingItem(file);
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    const status = message.includes('too large') ? 413 : message.includes('full') ? 429 : 500;
    logger.error('POST /api/clothes failed', { error: message, status });
    return NextResponse.json({ error: message }, { status });
  }
}
