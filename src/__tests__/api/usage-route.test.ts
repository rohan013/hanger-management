import { describe, it, expect, vi } from 'vitest'
import { GET } from '@/app/api/usage/route'
import * as usage from '@/services/usage'
import { STORAGE_CONFIG } from '@/lib/config'

vi.mock('@/services/usage')

describe('GET /api/usage', () => {
  it('returns 200 with usage stats', async () => {
    vi.mocked(usage.getUsageStats).mockResolvedValue({
      blobUsageBytes: 1024 * 1024 * 100,
      maxBlobBytes: STORAGE_CONFIG.MAX_BLOB_USAGE_BYTES,
      itemCount: 42,
      maxItems: STORAGE_CONFIG.MAX_CLOTHING_ITEMS,
      percentUsed: 11,
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.itemCount).toBe(42)
    expect(body.percentUsed).toBe(11)
    expect(body.maxItems).toBe(STORAGE_CONFIG.MAX_CLOTHING_ITEMS)
  })

  it('returns 500 when service throws', async () => {
    vi.mocked(usage.getUsageStats).mockRejectedValue(new Error('DB error'))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe('Failed to fetch usage')
  })
})
