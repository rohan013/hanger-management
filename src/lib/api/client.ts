import { upload } from '@vercel/blob/client';
import type { ClothingItem, RecommendationWithItems } from '@/types';

export async function fetchWardrobe(): Promise<ClothingItem[]> {
  const res = await fetch('/api/clothes');
  if (!res.ok) throw new Error('Failed to fetch wardrobe');
  return res.json();
}

export async function uploadClothing(file: File): Promise<ClothingItem> {
  const blob = await upload(file.name, file, {
    access: 'private',
    handleUploadUrl: '/api/upload',
  });
  const res = await fetch('/api/clothes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blobUrl: blob.url, blobPathname: blob.pathname }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

export async function updateClothing(
  id: string,
  data: { category: string; colors: string[]; color_names: string[]; description: string | null; tags: string[] }
): Promise<ClothingItem> {
  const res = await fetch(`/api/clothes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Update failed');
  return json as ClothingItem;
}

export async function deleteClothing(id: string): Promise<void> {
  const res = await fetch(`/api/clothes/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Delete failed');
  }
}

export async function fetchRecommendation(): Promise<RecommendationWithItems> {
  const res = await fetch('/api/recommend');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to get recommendation');
  return data;
}

export async function regenerateRecommendation(): Promise<RecommendationWithItems> {
  const res = await fetch('/api/recommend', { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to regenerate recommendation');
  return data;
}

