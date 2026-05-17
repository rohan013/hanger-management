import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GeminiProvider } from '@/lib/ai/gemini'

const mockGenerateContent = vi.hoisted(() => vi.fn())

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(function () {
    return {
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    }
  }),
}))

const makeResponse = (text: string) => ({
  response: { text: () => text },
})

const validAnalysis = {
  category: 'tops',
  colors: ['#FF5733', '#FFFFFF'],
  color_names: ['coral red', 'white'],
  description: 'A striped cotton t-shirt',
  tags: ['casual', 'summer', 'cotton'],
}

const validOutfit = {
  item_ids: ['id-1', 'id-2'],
  explanation: 'These items complement each other nicely.',
  color_scheme: 'complementary',
  color_theory_description: 'Red and blue create visual contrast.',
  palette_colors: ['#FF5733', '#0000FF'],
}

describe('GeminiProvider', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-api-key'
    process.env.AI_MODEL = 'gemini-test-model'
  })

  describe('constructor', () => {
    it('throws when GEMINI_API_KEY is missing', () => {
      delete process.env.GEMINI_API_KEY
      expect(() => new GeminiProvider()).toThrow('GEMINI_API_KEY')
    })

    it('initializes successfully with API key set', () => {
      expect(() => new GeminiProvider()).not.toThrow()
    })
  })

  describe('analyzeClothing', () => {
    it('parses and returns valid JSON response', async () => {
      mockGenerateContent.mockResolvedValue(makeResponse(JSON.stringify(validAnalysis)))
      const provider = new GeminiProvider()
      const result = await provider.analyzeClothing(Buffer.from('image'), 'image/jpeg')

      expect(result.category).toBe('tops')
      expect(result.colors).toEqual(['#FF5733', '#FFFFFF'])
      expect(result.color_names).toEqual(['coral red', 'white'])
      expect(result.description).toBe('A striped cotton t-shirt')
      expect(result.tags).toEqual(['casual', 'summer', 'cotton'])
    })

    it('strips markdown code blocks before parsing', async () => {
      const wrapped = '```json\n' + JSON.stringify(validAnalysis) + '\n```'
      mockGenerateContent.mockResolvedValue(makeResponse(wrapped))
      const provider = new GeminiProvider()
      const result = await provider.analyzeClothing(Buffer.from('image'), 'image/jpeg')
      expect(result.category).toBe('tops')
    })

    it('strips plain code blocks without json label', async () => {
      const wrapped = '```\n' + JSON.stringify(validAnalysis) + '\n```'
      mockGenerateContent.mockResolvedValue(makeResponse(wrapped))
      const provider = new GeminiProvider()
      const result = await provider.analyzeClothing(Buffer.from('image'), 'image/jpeg')
      expect(result.category).toBe('tops')
    })

    it('defaults category to "other" when missing from response', async () => {
      const partial = { ...validAnalysis, category: undefined }
      mockGenerateContent.mockResolvedValue(makeResponse(JSON.stringify(partial)))
      const provider = new GeminiProvider()
      const result = await provider.analyzeClothing(Buffer.from('image'), 'image/jpeg')
      expect(result.category).toBe('other')
    })

    it('defaults colors and tags to empty arrays when not arrays', async () => {
      const partial = { ...validAnalysis, colors: 'red', color_names: null, tags: undefined }
      mockGenerateContent.mockResolvedValue(makeResponse(JSON.stringify(partial)))
      const provider = new GeminiProvider()
      const result = await provider.analyzeClothing(Buffer.from('image'), 'image/jpeg')
      expect(result.colors).toEqual([])
      expect(result.color_names).toEqual([])
      expect(result.tags).toEqual([])
    })

    it('throws on invalid JSON response', async () => {
      mockGenerateContent.mockResolvedValue(makeResponse('not valid json at all'))
      const provider = new GeminiProvider()
      await expect(provider.analyzeClothing(Buffer.from('image'), 'image/jpeg'))
        .rejects.toThrow('Failed to parse Gemini response as JSON')
    })
  })

  describe('recommendOutfit', () => {
    const items = [
      { id: 'id-1', category: 'tops', colors: ['#FF0000'], color_names: ['red'], description: 'Red shirt', tags: ['casual'], image_url: '', blob_pathname: '', created_at: '' },
      { id: 'id-2', category: 'bottoms', colors: ['#0000FF'], color_names: ['blue'], description: 'Blue jeans', tags: ['casual'], image_url: '', blob_pathname: '', created_at: '' },
    ]

    it('parses and returns valid outfit recommendation', async () => {
      mockGenerateContent.mockResolvedValue(makeResponse(JSON.stringify(validOutfit)))
      const provider = new GeminiProvider()
      const result = await provider.recommendOutfit(items)

      expect(result.item_ids).toEqual(['id-1', 'id-2'])
      expect(result.explanation).toBe('These items complement each other nicely.')
      expect(result.color_scheme).toBe('complementary')
      expect(result.palette_colors).toEqual(['#FF5733', '#0000FF'])
    })

    it('strips markdown code blocks before parsing', async () => {
      const wrapped = '```json\n' + JSON.stringify(validOutfit) + '\n```'
      mockGenerateContent.mockResolvedValue(makeResponse(wrapped))
      const provider = new GeminiProvider()
      const result = await provider.recommendOutfit(items)
      expect(result.item_ids).toEqual(['id-1', 'id-2'])
    })

    it('filters out item IDs not present in wardrobe', async () => {
      const withBadIds = { ...validOutfit, item_ids: ['id-1', 'nonexistent-id'] }
      mockGenerateContent.mockResolvedValue(makeResponse(JSON.stringify(withBadIds)))
      const provider = new GeminiProvider()
      const result = await provider.recommendOutfit(items)
      expect(result.item_ids).toEqual(['id-1'])
      expect(result.item_ids).not.toContain('nonexistent-id')
    })

    it('falls back to first item when all returned IDs are invalid', async () => {
      const allBad = { ...validOutfit, item_ids: ['ghost-1', 'ghost-2'] }
      mockGenerateContent.mockResolvedValue(makeResponse(JSON.stringify(allBad)))
      const provider = new GeminiProvider()
      const result = await provider.recommendOutfit(items)
      expect(result.item_ids).toEqual(['id-1'])
    })

    it('applies defaults for missing explanation and color_scheme', async () => {
      const minimal = { item_ids: ['id-1'] }
      mockGenerateContent.mockResolvedValue(makeResponse(JSON.stringify(minimal)))
      const provider = new GeminiProvider()
      const result = await provider.recommendOutfit(items)
      expect(result.explanation).toBe('A stylish outfit for today.')
      expect(result.color_scheme).toBe('neutral')
      expect(result.color_theory_description).toBe('Colors work harmoniously together.')
      expect(result.palette_colors).toEqual([])
    })

    it('throws on invalid JSON response', async () => {
      mockGenerateContent.mockResolvedValue(makeResponse('{broken json'))
      const provider = new GeminiProvider()
      await expect(provider.recommendOutfit(items))
        .rejects.toThrow('Failed to parse Gemini recommendation response')
    })
  })
})
