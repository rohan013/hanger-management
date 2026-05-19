import { put, del, get } from '@vercel/blob';

export async function uploadImage(pathname: string, buffer: Buffer, contentType = 'image/jpeg'): Promise<{ url: string; pathname: string }> {
  const blob = await put(pathname, buffer, { access: 'private', contentType });
  return { url: blob.url, pathname: blob.pathname };
}

export function signImageUrl(url: string): string {
  return `/api/image?url=${encodeURIComponent(url)}`;
}

export async function downloadImage(url: string): Promise<{ stream: ReadableStream; contentType: string }> {
  const result = await get(url, { access: 'private' });
  if (result?.statusCode !== 200) throw new Error(`Blob fetch failed: ${JSON.stringify(result)}`);
  return { stream: result.stream, contentType: result.blob.contentType };
}

export async function deleteImage(pathname: string): Promise<void> {
  await del(pathname);
}
