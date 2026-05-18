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
    const { blobUrl, blobPathname } = await request.json();
    if (!blobUrl || !blobPathname) {
      return NextResponse.json({ error: 'blobUrl and blobPathname are required' }, { status: 400 });
    }
    const item = await uploadClothingItem(blobUrl, blobPathname);
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    logger.error('POST /api/clothes failed', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
