import { NextResponse } from 'next/server';
import { getOrCreateTodaysRecommendation, generateRecommendation } from '@/services/recommendations';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    return NextResponse.json(await getOrCreateTodaysRecommendation());
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get recommendation';
    logger.error('GET /api/recommend failed', { error: message });
    return NextResponse.json({ error: message }, { status: message.includes('Upload') ? 404 : 500 });
  }
}

export async function POST() {
  try {
    return NextResponse.json(await generateRecommendation());
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to regenerate recommendation';
    logger.error('POST /api/recommend failed', { error: message });
    return NextResponse.json({ error: message }, { status: message.includes('Upload') ? 404 : 500 });
  }
}
