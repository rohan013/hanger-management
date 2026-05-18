import { NextRequest, NextResponse } from 'next/server';
import { editClothingItem, removeClothingItem } from '@/services/wardrobe';
import { logger } from '@/lib/logger';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { category, colors, color_names, description, tags } = body;
    if (
      typeof category !== 'string' || !category ||
      !Array.isArray(colors) || !Array.isArray(color_names) ||
      colors.length !== color_names.length ||
      !Array.isArray(tags)
    ) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const item = await editClothingItem(params.id, { category, colors, color_names, description: description ?? null, tags });
    return NextResponse.json(item);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed';
    logger.error('PATCH /api/clothes/[id] failed', { id: params.id, error: message });
    return NextResponse.json({ error: message }, { status: message === 'Item not found' ? 404 : 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await removeClothingItem(params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete failed';
    logger.error('DELETE /api/clothes/[id] failed', { id: params.id, error: message });
    return NextResponse.json({ error: message }, { status: message === 'Item not found' ? 404 : 500 });
  }
}
