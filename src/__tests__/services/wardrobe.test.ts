import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listClothingItems, uploadClothingItem, removeClothingItem } from '@/services/wardrobe'
import * as dbClothes from '@/lib/db/clothes'
import * as storage from '@/lib/storage'
import * as image from '@/lib/image'
import * as aiProvider from '@/lib/ai/provider'
import type { ClothingItem } from '@/types'

vi.mock('@/lib/db/clothes')
vi.mock('@/lib/storage')
vi.mock('@/lib/image')
vi.mock('@/lib/ai/provider')

const baseItem: ClothingItem = {
  id: 'item-1',
  category: 'tops',
  colors: ['#FF0000'],
  color_names: ['red'],
  description: 'A red shirt',
  tags: ['casual'],
  image_url: 'https://abc123.blob.vercel-storage.com/clothing/shirt.jpg',
  blob_pathname: 'clothing/shirt.jpg',
  created_at: '2024-01-01T00:00:00Z',
}

describe('listClothingItems', () => {
  it('returns items with signed image URLs', async () => {
    vi.mocked(dbClothes.getAllClothingItems).mockResolvedValue([baseItem])
    vi.mocked(storage.signImageUrl).mockReturnValue('/api/image?url=signed')

    const result = await listClothingItems()

    expect(result).toHaveLength(1)
    expect(result[0].image_url).toBe('/api/image?url=signed')
    expect(storage.signImageUrl).toHaveBeenCalledWith(baseItem.image_url)
  })

  it('returns empty array when wardrobe is empty', async () => {
    vi.mocked(dbClothes.getAllClothingItems).mockResolvedValue([])
    const result = await listClothingItems()
    expect(result).toEqual([])
  })

  it('signs each item URL independently', async () => {
    const item2 = { ...baseItem, id: 'item-2', image_url: 'https://abc123.blob.vercel-storage.com/other.jpg' }
    vi.mocked(dbClothes.getAllClothingItems).mockResolvedValue([baseItem, item2])
    vi.mocked(storage.signImageUrl)
      .mockReturnValueOnce('/api/image?url=url1')
      .mockReturnValueOnce('/api/image?url=url2')

    const result = await listClothingItems()
    expect(result[0].image_url).toBe('/api/image?url=url1')
    expect(result[1].image_url).toBe('/api/image?url=url2')
  })
})

describe('uploadClothingItem', () => {
  const mockAnalyzeClothing = vi.fn()
  const mockAIProvider = { analyzeClothing: mockAnalyzeClothing, recommendOutfit: vi.fn() }

  const blobUrl = 'https://public.blob.vercel-storage.com/clothing/raw/shirt.jpg'
  const blobPathname = 'clothing/raw/shirt.jpg'

  beforeEach(() => {
    vi.mocked(storage.downloadImage).mockResolvedValue(
      new Response(new ArrayBuffer(1024), { status: 200 })
    )
    vi.mocked(image.removeBackground).mockResolvedValue(Buffer.from('no-bg'))
    vi.mocked(image.processImage).mockResolvedValue({ buffer: Buffer.from('compressed'), format: 'jpeg' })
    vi.mocked(storage.uploadImage).mockResolvedValue({
      url: 'https://abc123.blob.vercel-storage.com/clothing/shirt.jpg',
      pathname: 'clothing/shirt.jpg',
    })
    vi.mocked(storage.deleteImage).mockResolvedValue(undefined)
    mockAnalyzeClothing.mockResolvedValue({
      category: 'tops',
      colors: ['#FF0000'],
      color_names: ['red'],
      description: 'A red shirt',
      tags: ['casual'],
    })
    vi.mocked(aiProvider.getAIProvider).mockReturnValue(mockAIProvider)
    vi.mocked(dbClothes.insertClothingItem).mockResolvedValue(baseItem)
    vi.mocked(storage.signImageUrl).mockReturnValue('/api/image?url=signed')
  })

  it('runs full upload pipeline and returns item with signed URL', async () => {
    const result = await uploadClothingItem(blobUrl, blobPathname)

    expect(image.removeBackground).toHaveBeenCalled()
    expect(image.processImage).toHaveBeenCalled()
    expect(storage.uploadImage).toHaveBeenCalled()
    expect(storage.deleteImage).toHaveBeenCalledWith(blobPathname)
    expect(mockAnalyzeClothing).toHaveBeenCalled()
    expect(dbClothes.insertClothingItem).toHaveBeenCalled()
    expect(result.image_url).toBe('/api/image?url=signed')
  })

  it('throws when blob download fails', async () => {
    vi.mocked(storage.downloadImage).mockResolvedValue(new Response('error', { status: 500 }))
    await expect(uploadClothingItem(blobUrl, blobPathname)).rejects.toThrow('Failed to download')
  })

  it('uses .jpg extension for JPEG output', async () => {
    vi.mocked(image.processImage).mockResolvedValue({ buffer: Buffer.from('x'), format: 'jpeg' })
    await uploadClothingItem(blobUrl, blobPathname)
    const [filename] = vi.mocked(storage.uploadImage).mock.calls[0]
    expect(filename).toMatch(/\.jpg$/)
  })

  it('uses .png extension for PNG output', async () => {
    vi.mocked(image.processImage).mockResolvedValue({ buffer: Buffer.from('x'), format: 'png' })
    await uploadClothingItem(blobUrl, blobPathname)
    const [filename] = vi.mocked(storage.uploadImage).mock.calls[0]
    expect(filename).toMatch(/\.png$/)
  })

  it('passes image/jpeg MIME type to AI when processing JPEG', async () => {
    vi.mocked(image.processImage).mockResolvedValue({ buffer: Buffer.from('x'), format: 'jpeg' })
    await uploadClothingItem(blobUrl, blobPathname)
    expect(mockAnalyzeClothing).toHaveBeenCalledWith(expect.any(Buffer), 'image/jpeg')
  })

  it('passes image/png MIME type to AI when processing PNG', async () => {
    vi.mocked(image.processImage).mockResolvedValue({ buffer: Buffer.from('x'), format: 'png' })
    await uploadClothingItem(blobUrl, blobPathname)
    expect(mockAnalyzeClothing).toHaveBeenCalledWith(expect.any(Buffer), 'image/png')
  })

  it('stores AI analysis result in the database', async () => {
    const analysis = {
      category: 'outerwear',
      colors: ['#000000'],
      color_names: ['black'],
      description: 'A black jacket',
      tags: ['formal', 'winter'],
    }
    mockAnalyzeClothing.mockResolvedValue(analysis)

    await uploadClothingItem(blobUrl, blobPathname)

    expect(dbClothes.insertClothingItem).toHaveBeenCalledWith(
      expect.objectContaining(analysis)
    )
  })
})

describe('removeClothingItem', () => {
  it('deletes blob then DB record', async () => {
    vi.mocked(dbClothes.getClothingItemById).mockResolvedValue(baseItem)
    vi.mocked(storage.deleteImage).mockResolvedValue(undefined)
    vi.mocked(dbClothes.deleteClothingItem).mockResolvedValue(undefined)

    await removeClothingItem('item-1')

    expect(storage.deleteImage).toHaveBeenCalledWith(baseItem.blob_pathname)
    expect(dbClothes.deleteClothingItem).toHaveBeenCalledWith('item-1')
  })

  it('throws "Item not found" when item does not exist', async () => {
    vi.mocked(dbClothes.getClothingItemById).mockResolvedValue(null)
    await expect(removeClothingItem('nonexistent')).rejects.toThrow('Item not found')
  })

  it('does not touch blob storage when item is not found', async () => {
    vi.mocked(dbClothes.getClothingItemById).mockResolvedValue(null)
    await expect(removeClothingItem('nonexistent')).rejects.toThrow()
    expect(storage.deleteImage).not.toHaveBeenCalled()
  })
})
