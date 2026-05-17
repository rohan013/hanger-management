import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { DELETE } from '@/app/api/clothes/[id]/route'
import * as wardrobe from '@/services/wardrobe'

vi.mock('@/services/wardrobe')

describe('DELETE /api/clothes/[id]', () => {
  const makeRequest = () =>
    new NextRequest('http://localhost/api/clothes/item-1', { method: 'DELETE' })

  it('returns 200 with success on successful deletion', async () => {
    vi.mocked(wardrobe.removeClothingItem).mockResolvedValue(undefined)

    const response = await DELETE(makeRequest(), { params: { id: 'item-1' } })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(wardrobe.removeClothingItem).toHaveBeenCalledWith('item-1')
  })

  it('returns 404 when item is not found', async () => {
    vi.mocked(wardrobe.removeClothingItem).mockRejectedValue(new Error('Item not found'))

    const response = await DELETE(makeRequest(), { params: { id: 'nonexistent' } })
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe('Item not found')
  })

  it('returns 500 on unexpected errors', async () => {
    vi.mocked(wardrobe.removeClothingItem).mockRejectedValue(new Error('DB error'))

    const response = await DELETE(makeRequest(), { params: { id: 'item-1' } })
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe('DB error')
  })
})
