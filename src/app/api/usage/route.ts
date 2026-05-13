import { NextResponse } from 'next/server';
import { getUsageStats } from '@/services/usage';

export async function GET() {
  try {
    return NextResponse.json(await getUsageStats());
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
  }
}
