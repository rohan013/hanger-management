import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getOrCreateTodaysRecommendation, generateRecommendation } from '@/services/recommendations'
import * as dbClothes from '@/lib/db/clothes'
import * as dbRec from '@/lib/db/recommendations'
import * as storage from '@/lib/storage'
import * as aiProvider from '@/lib/ai/provider'
import type { ClothingItem, OutfitRecommendation } from '@/types'

vi.mock('@/lib/db/clothes')
vi.mock('@/lib/db/recommendations')
vi.mock('@/lib/storage')
vi.mock('@/lib/ai/provider')

const item1: ClothingItem = {
  id: 'item-1',
  category: 'tops',
  colors: ['#FF0000'],
  color_names: ['red'],
  description: 'Red shirt',
  tags: ['casual'],
  image_url: 'https://blob.vercel-storage.com/shirt.jpg',
  blob_pathname: 'clothing/shirt.jpg',
  created_at: '2024-01-01T00:00:00Z',
}

const item2: ClothingItem = {
  id: 'item-2',
  category: 'bottoms',
  colors: ['#0000FF'],
  color_names: ['blue'],
  description: 'Blue jeans',
  tags: ['casual'],
  image_url: 'https://blob.vercel-storage.com/jeans.jpg',
  blob_pathname: 'clothing/jeans.jpg',
  created_at: '2024-01-01T00:00:00Z',
}

const baseRec: OutfitRecommendation = {
  id: 'rec-1',
  item_ids: ['item-1', 'item-2'],
  explanation: 'A great casual look',
  color_scheme: 'complementary',
  color_theory_description: 'Red and blue complement each other',
  palette_colors: ['#FF0000', '#0000FF'],
  recommended_for: '2024-05-15',
  created_at: '2024-05-15T08:00:00Z',
}

const mockRecommendOutfit = vi.fn()
const mockAIProvider = { analyzeClothing: vi.fn(), recommendOutfit: mockRecommendOutfit }

describe('getOrCreateTodaysRecommendation', () => {
  beforeEach(() => {
    vi.mocked(storage.signImageUrl).mockImplementation(url => `/api/image?url=${encodeURIComponent(url)}`)
    vi.mocked(aiProvider.getAIProvider).mockReturnValue(mockAIProvider)
  })

  it('returns cached recommendation when one exists for today', async () => {
    vi.mocked(dbRec.getTodaysRecommendation).mockResolvedValue(baseRec)
    vi.mocked(dbClothes.getClothingItemById)
      .mockResolvedValueOnce(item1)
      .mockResolvedValueOnce(item2)

    const result = await getOrCreateTodaysRecommendation()

    expect(result.id).toBe('rec-1')
    expect(result.items).toHaveLength(2)
    expect(dbRec.deleteTodaysRecommendation).not.toHaveBeenCalled()
    expect(mockRecommendOutfit).not.toHaveBeenCalled()
  })

  it('generates new recommendation when none exists for today', async () => {
    vi.mocked(dbRec.getTodaysRecommendation).mockResolvedValue(null)
    vi.mocked(dbClothes.getAllClothingItems).mockResolvedValue([item1, item2])
    vi.mocked(dbRec.deleteTodaysRecommendation).mockResolvedValue(undefined)
    mockRecommendOutfit.mockResolvedValue({
      item_ids: ['item-1'],
      explanation: 'Fresh look',
      color_scheme: 'monochromatic',
      color_theory_description: 'Clean and simple',
      palette_colors: ['#FF0000'],
    })
    vi.mocked(dbRec.insertRecommendation).mockResolvedValue(baseRec)
    vi.mocked(dbClothes.getClothingItemById)
      .mockResolvedValueOnce(item1)
      .mockResolvedValueOnce(item2)

    const result = await getOrCreateTodaysRecommendation()

    expect(mockRecommendOutfit).toHaveBeenCalled()
    expect(result.id).toBe('rec-1')
  })
})

describe('generateRecommendation', () => {
  beforeEach(() => {
    vi.mocked(storage.signImageUrl).mockImplementation(url => `/api/image?url=${encodeURIComponent(url)}`)
    vi.mocked(aiProvider.getAIProvider).mockReturnValue(mockAIProvider)
  })

  it('generates and returns recommendation with hydrated items', async () => {
    vi.mocked(dbClothes.getAllClothingItems).mockResolvedValue([item1, item2])
    vi.mocked(dbRec.deleteTodaysRecommendation).mockResolvedValue(undefined)
    mockRecommendOutfit.mockResolvedValue({
      item_ids: ['item-1', 'item-2'],
      explanation: 'A great look',
      color_scheme: 'complementary',
      color_theory_description: 'Contrasting colors',
      palette_colors: ['#FF0000', '#0000FF'],
    })
    vi.mocked(dbRec.insertRecommendation).mockResolvedValue(baseRec)
    vi.mocked(dbClothes.getClothingItemById)
      .mockResolvedValueOnce(item1)
      .mockResolvedValueOnce(item2)

    const result = await generateRecommendation()

    expect(result.items).toHaveLength(2)
    expect(result.items[0].id).toBe('item-1')
    expect(result.items[1].id).toBe('item-2')
    expect(result.explanation).toBe('A great casual look')
  })

  it('throws when wardrobe is empty', async () => {
    vi.mocked(dbClothes.getAllClothingItems).mockResolvedValue([])
    await expect(generateRecommendation()).rejects.toThrow('No clothing items in wardrobe')
  })

  it('deletes existing recommendation before generating new one', async () => {
    const callOrder: string[] = []
    vi.mocked(dbClothes.getAllClothingItems).mockResolvedValue([item1])
    vi.mocked(dbRec.deleteTodaysRecommendation).mockImplementation(async () => { callOrder.push('delete') })
    mockRecommendOutfit.mockResolvedValue({
      item_ids: ['item-1'],
      explanation: 'Fresh',
      color_scheme: 'neutral',
      color_theory_description: 'Neutral tones',
      palette_colors: ['#FF0000'],
    })
    vi.mocked(dbRec.insertRecommendation).mockImplementation(async () => {
      callOrder.push('insert')
      return { ...baseRec, item_ids: ['item-1'] }
    })
    vi.mocked(dbClothes.getClothingItemById).mockResolvedValueOnce(item1)

    await generateRecommendation()

    expect(callOrder).toEqual(['delete', 'insert'])
  })

  it('filters out items that no longer exist in DB during hydration', async () => {
    vi.mocked(dbClothes.getAllClothingItems).mockResolvedValue([item1, item2])
    vi.mocked(dbRec.deleteTodaysRecommendation).mockResolvedValue(undefined)
    mockRecommendOutfit.mockResolvedValue({
      item_ids: ['item-1', 'item-2'],
      explanation: 'Nice',
      color_scheme: 'neutral',
      color_theory_description: 'Neutral',
      palette_colors: [],
    })
    vi.mocked(dbRec.insertRecommendation).mockResolvedValue(baseRec)
    vi.mocked(dbClothes.getClothingItemById)
      .mockResolvedValueOnce(item1)
      .mockResolvedValueOnce(null) // item-2 deleted between recommendation creation and hydration

    const result = await generateRecommendation()
    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe('item-1')
  })

  it('signs image URLs on hydrated items', async () => {
    vi.mocked(dbClothes.getAllClothingItems).mockResolvedValue([item1])
    vi.mocked(dbRec.deleteTodaysRecommendation).mockResolvedValue(undefined)
    mockRecommendOutfit.mockResolvedValue({
      item_ids: ['item-1'],
      explanation: 'Nice',
      color_scheme: 'neutral',
      color_theory_description: 'Neutral',
      palette_colors: [],
    })
    vi.mocked(dbRec.insertRecommendation).mockResolvedValue({ ...baseRec, item_ids: ['item-1'] })
    vi.mocked(dbClothes.getClothingItemById).mockResolvedValueOnce(item1)
    vi.mocked(storage.signImageUrl).mockReturnValue('/api/image?url=proxied')

    const result = await generateRecommendation()
    expect(result.items[0].image_url).toBe('/api/image?url=proxied')
  })
})
