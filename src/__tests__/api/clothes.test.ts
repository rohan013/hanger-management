import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/clothes/route'
import * as wardrobe from '@/services/wardrobe'
import type { ClothingItem } from '@/types'

vi.mock('@/services/wardrobe')

const baseItem: ClothingItem = {
  id: 'item-1',
  category: 'tops',
  colors: ['#FF0000'],
  color_names: ['red'],
  description: 'A red shirt',
  tags: ['casual'],
  image_url: '/api/image?url=signed',
  blob_pathname: 'clothing/shirt.jpg',
  created_at: '2024-01-01T00:00:00Z',
}

describe('GET /api/clothes', () => {
  it('returns 200 with array of clothing items', async () => {
    vi.mocked(wardrobe.listClothingItems).mockResolvedValue([baseItem])

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toHaveLength(1)
    expect(body[0].id).toBe('item-1')
  })

  it('returns 200 with empty array when wardrobe is empty', async () => {
    vi.mocked(wardrobe.listClothingItems).mockResolvedValue([])

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual([])
  })

  it('returns 500 when service throws', async () => {
    vi.mocked(wardrobe.listClothingItems).mockRejectedValue(new Error('DB connection failed'))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe('DB connection failed')
  })
})

describe('POST /api/clothes', () => {
  const makeRequest = (formData: { get: ReturnType<typeof vi.fn> }) =>
    ({ formData: vi.fn().mockResolvedValue(formData) }) as unknown as NextRequest

  it('returns 201 with uploaded item on success', async () => {
    const mockFile = new File(['data'], 'shirt.jpg', { type: 'image/jpeg' })
    const req = makeRequest({ get: vi.fn().mockReturnValue(mockFile) })
    vi.mocked(wardrobe.uploadClothingItem).mockResolvedValue(baseItem)

    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.id).toBe('item-1')
    expect(wardrobe.uploadClothingItem).toHaveBeenCalledWith(mockFile)
  })

  it('returns 400 when no file is provided', async () => {
    const req = makeRequest({ get: vi.fn().mockReturnValue(null) })

    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('No file provided')
    expect(wardrobe.uploadClothingItem).not.toHaveBeenCalled()
  })

  it('returns 413 when file is too large', async () => {
    const mockFile = new File(['data'], 'huge.jpg', { type: 'image/jpeg' })
    const req = makeRequest({ get: vi.fn().mockReturnValue(mockFile) })
    vi.mocked(wardrobe.uploadClothingItem).mockRejectedValue(new Error('File too large. Maximum size is 10MB'))

    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(413)
    expect(body.error).toMatch(/too large/i)
  })

  it('returns 429 when wardrobe is full', async () => {
    const mockFile = new File(['data'], 'shirt.jpg', { type: 'image/jpeg' })
    const req = makeRequest({ get: vi.fn().mockReturnValue(mockFile) })
    vi.mocked(wardrobe.uploadClothingItem).mockRejectedValue(new Error('Wardrobe is full. Maximum 150 items allowed.'))

    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body.error).toMatch(/full/i)
  })

  it('returns 500 on unexpected error', async () => {
    const mockFile = new File(['data'], 'shirt.jpg', { type: 'image/jpeg' })
    const req = makeRequest({ get: vi.fn().mockReturnValue(mockFile) })
    vi.mocked(wardrobe.uploadClothingItem).mockRejectedValue(new Error('Unexpected database error'))

    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe('Unexpected database error')
  })
})
