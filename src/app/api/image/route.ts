import { NextRequest, NextResponse } from 'next/server';
import { downloadImage } from '@/lib/storage';

const ALLOWED_HOST = '.blob.vercel-storage.com';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) return new NextResponse('Missing url', { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse('Invalid url', { status: 400 });
  }

  if (!parsed.hostname.endsWith(ALLOWED_HOST)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  let result: { stream: ReadableStream; contentType: string };
  try {
    result = await downloadImage(parsed.toString());
  } catch {
    return new NextResponse('Failed to fetch image', { status: 502 });
  }

  return new NextResponse(result.stream, {
    headers: {
      'Content-Type': result.contentType || 'image/jpeg',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
