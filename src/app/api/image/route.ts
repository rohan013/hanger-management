import { NextRequest, NextResponse } from 'next/server';

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

  const response = await fetch(parsed.toString(), {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
  });

  if (!response.ok) return new NextResponse('Failed to fetch image', { status: response.status });

  return new NextResponse(response.body, {
    headers: {
      'Content-Type': response.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
