import { put, del, get } from '@vercel/blob';

export async function uploadImage(pathname: string, buffer: Buffer, contentType = 'image/jpeg'): Promise<{ url: string; pathname: string }> {
  const blob = await put(pathname, buffer, { access: 'private', contentType });
  return { url: blob.url, pathname: blob.pathname };
}

export function signImageUrl(url: string): string {
  return `/api/image?url=${encodeURIComponent(url)}`;
}

export async function downloadImage(url: string): Promise<Response> {
  const result = await get(url, { access: 'private' });
  if (!result) return new Response('Not found', { status: 404 });
  return new Response(result.stream, { status: result.statusCode });
}

export async function deleteImage(pathname: string): Promise<void> {
  await del(pathname);
}
