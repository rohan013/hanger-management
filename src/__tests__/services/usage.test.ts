import { describe, it, expect, vi } from 'vitest'
import { getUsageStats } from '@/services/usage'
import * as storage from '@/lib/storage'
import * as dbClothes from '@/lib/db/clothes'
import { STORAGE_CONFIG } from '@/lib/config'

vi.mock('@/lib/storage')
vi.mock('@/lib/db/clothes')

describe('getUsageStats', () => {
  it('returns correct usage stats with percentUsed', async () => {
    const usedBytes = STORAGE_CONFIG.MAX_BLOB_USAGE_BYTES / 2
    vi.mocked(storage.getBlobUsageBytes).mockResolvedValue(usedBytes)
    vi.mocked(dbClothes.getClothingItemCount).mockResolvedValue(75)

    const result = await getUsageStats()

    expect(result.blobUsageBytes).toBe(usedBytes)
    expect(result.maxBlobBytes).toBe(STORAGE_CONFIG.MAX_BLOB_USAGE_BYTES)
    expect(result.itemCount).toBe(75)
    expect(result.maxItems).toBe(STORAGE_CONFIG.MAX_CLOTHING_ITEMS)
    expect(result.percentUsed).toBe(50)
  })

  it('returns 0 percentUsed when no blobs stored', async () => {
    vi.mocked(storage.getBlobUsageBytes).mockResolvedValue(0)
    vi.mocked(dbClothes.getClothingItemCount).mockResolvedValue(0)

    const result = await getUsageStats()

    expect(result.blobUsageBytes).toBe(0)
    expect(result.percentUsed).toBe(0)
    expect(result.itemCount).toBe(0)
  })

  it('returns 100 percentUsed when at storage limit', async () => {
    vi.mocked(storage.getBlobUsageBytes).mockResolvedValue(STORAGE_CONFIG.MAX_BLOB_USAGE_BYTES)
    vi.mocked(dbClothes.getClothingItemCount).mockResolvedValue(STORAGE_CONFIG.MAX_CLOTHING_ITEMS)

    const result = await getUsageStats()

    expect(result.percentUsed).toBe(100)
  })

  it('rounds percentUsed to nearest integer', async () => {
    // 1/3 of max → 33.33% → rounds to 33
    const oneThird = Math.floor(STORAGE_CONFIG.MAX_BLOB_USAGE_BYTES / 3)
    vi.mocked(storage.getBlobUsageBytes).mockResolvedValue(oneThird)
    vi.mocked(dbClothes.getClothingItemCount).mockResolvedValue(0)

    const result = await getUsageStats()

    expect(Number.isInteger(result.percentUsed)).toBe(true)
    expect(result.percentUsed).toBe(Math.round((oneThird / STORAGE_CONFIG.MAX_BLOB_USAGE_BYTES) * 100))
  })
})
