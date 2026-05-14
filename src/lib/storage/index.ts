import { put, del, list } from '@vercel/blob';

export async function uploadImage(pathname: string, buffer: Buffer): Promise<{ url: string; pathname: string }> {
  const blob = await put(pathname, buffer, { access: 'private', contentType: 'image/jpeg' });
  return { url: blob.url, pathname: blob.pathname };
}

export function signImageUrl(url: string): string {
  return `/api/image?url=${encodeURIComponent(url)}`;
}

export async function deleteImage(pathname: string): Promise<void> {
  await del(pathname);
}

export async function getBlobUsageBytes(): Promise<number> {
  try {
    const { blobs } = await list({ prefix: 'clothing/' });
    return blobs.reduce((sum, blob) => sum + blob.size, 0);
  } catch {
    return 0;
  }
}
