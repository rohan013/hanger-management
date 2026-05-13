import { getBlobUsageBytes } from '@/lib/storage';
import { getClothingItemCount } from '@/lib/db/clothes';
import { STORAGE_CONFIG } from '@/lib/config';
import type { UsageStats } from '@/types';

export async function getUsageStats(): Promise<UsageStats> {
  const [blobUsageBytes, itemCount] = await Promise.all([getBlobUsageBytes(), getClothingItemCount()]);
  return {
    blobUsageBytes,
    maxBlobBytes: STORAGE_CONFIG.MAX_BLOB_USAGE_BYTES,
    itemCount,
    maxItems: STORAGE_CONFIG.MAX_CLOTHING_ITEMS,
    percentUsed: Math.round((blobUsageBytes / STORAGE_CONFIG.MAX_BLOB_USAGE_BYTES) * 100),
  };
}
