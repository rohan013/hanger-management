import { NextRequest, NextResponse } from 'next/server';
import { removeClothingItem } from '@/services/wardrobe';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await removeClothingItem(params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete failed';
    return NextResponse.json({ error: message }, { status: message === 'Item not found' ? 404 : 500 });
  }
}
