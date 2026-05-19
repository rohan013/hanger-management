import { put, del, getDownloadUrl } from '@vercel/blob';

export async function uploadImage(pathname: string, buffer: Buffer, contentType = 'image/jpeg'): Promise<{ url: string; pathname: string }> {
  const blob = await put(pathname, buffer, { access: 'private', contentType });
  return { url: blob.url, pathname: blob.pathname };
}

export function signImageUrl(url: string): string {
  return `/api/image?url=${encodeURIComponent(url)}`;
}

export async function downloadImage(url: string): Promise<Response> {
  const signedUrl = await getDownloadUrl(url);
  return fetch(signedUrl);
}

export async function deleteImage(pathname: string): Promise<void> {
  await del(pathname);
}
