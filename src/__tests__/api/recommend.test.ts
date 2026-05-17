import { describe, it, expect, vi } from 'vitest'
import { GET, POST } from '@/app/api/recommend/route'
import * as recommendations from '@/services/recommendations'
import type { RecommendationWithItems } from '@/types'

vi.mock('@/services/recommendations')

const mockRec: RecommendationWithItems = {
  id: 'rec-1',
  item_ids: ['item-1'],
  explanation: 'A great look for spring.',
  color_scheme: 'complementary',
  color_theory_description: 'Colors contrast nicely.',
  palette_colors: ['#FF0000', '#0000FF'],
  recommended_for: '2024-05-15',
  created_at: '2024-05-15T08:00:00Z',
  items: [
    {
      id: 'item-1',
      category: 'tops',
      colors: ['#FF0000'],
      color_names: ['red'],
      description: 'Red shirt',
      tags: ['casual'],
      image_url: '/api/image?url=signed',
      blob_pathname: 'clothing/shirt.jpg',
      created_at: '2024-01-01T00:00:00Z',
    },
  ],
}

describe('GET /api/recommend', () => {
  it('returns 200 with today\'s recommendation', async () => {
    vi.mocked(recommendations.getOrCreateTodaysRecommendation).mockResolvedValue(mockRec)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.id).toBe('rec-1')
    expect(body.items).toHaveLength(1)
  })

  it('returns 404 when wardrobe is empty', async () => {
    vi.mocked(recommendations.getOrCreateTodaysRecommendation)
      .mockRejectedValue(new Error('No clothing items in wardrobe. Upload some items first!'))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toMatch(/Upload/i)
  })

  it('returns 500 on unexpected errors', async () => {
    vi.mocked(recommendations.getOrCreateTodaysRecommendation)
      .mockRejectedValue(new Error('Database unavailable'))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe('Database unavailable')
  })
})

describe('POST /api/recommend', () => {
  it('returns 200 with newly generated recommendation', async () => {
    vi.mocked(recommendations.generateRecommendation).mockResolvedValue(mockRec)

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.id).toBe('rec-1')
    expect(recommendations.generateRecommendation).toHaveBeenCalled()
  })

  it('returns 404 when wardrobe is empty', async () => {
    vi.mocked(recommendations.generateRecommendation)
      .mockRejectedValue(new Error('No clothing items in wardrobe. Upload some items first!'))

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(404)
  })

  it('returns 500 on unexpected errors', async () => {
    vi.mocked(recommendations.generateRecommendation)
      .mockRejectedValue(new Error('AI provider timeout'))

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe('AI provider timeout')
  })
})
