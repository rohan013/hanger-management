import { describe, it, expect, vi } from 'vitest'
import { uploadImage, signImageUrl, deleteImage, getBlobUsageBytes } from '@/lib/storage'

vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
  del: vi.fn(),
  list: vi.fn(),
}))

import { put, del, list } from '@vercel/blob'

describe('uploadImage', () => {
  it('calls put with private access and returns url and pathname', async () => {
    vi.mocked(put).mockResolvedValue({
      url: 'https://abc.blob.vercel-storage.com/clothing/img.jpg',
      pathname: 'clothing/img.jpg',
    } as Awaited<ReturnType<typeof put>>)

    const result = await uploadImage('clothing/img.jpg', Buffer.from('data'))

    expect(put).toHaveBeenCalledWith('clothing/img.jpg', expect.any(Buffer), {
      access: 'private',
      contentType: 'image/jpeg',
    })
    expect(result.url).toBe('https://abc.blob.vercel-storage.com/clothing/img.jpg')
    expect(result.pathname).toBe('clothing/img.jpg')
  })

  it('uses provided contentType when specified', async () => {
    vi.mocked(put).mockResolvedValue({
      url: 'https://abc.blob.vercel-storage.com/clothing/img.png',
      pathname: 'clothing/img.png',
    } as Awaited<ReturnType<typeof put>>)

    await uploadImage('clothing/img.png', Buffer.from('data'), 'image/png')

    expect(put).toHaveBeenCalledWith(
      'clothing/img.png',
      expect.any(Buffer),
      expect.objectContaining({ contentType: 'image/png' })
    )
  })
})

describe('signImageUrl', () => {
  it('returns a proxy URL with the original URL encoded in the query string', () => {
    const blobUrl = 'https://abc.blob.vercel-storage.com/clothing/img.jpg'
    const signed = signImageUrl(blobUrl)
    expect(signed).toBe(`/api/image?url=${encodeURIComponent(blobUrl)}`)
  })

  it('encodes spaces in the blob URL', () => {
    const blobUrl = 'https://abc.blob.vercel-storage.com/clothing/my file.jpg'
    const signed = signImageUrl(blobUrl)
    expect(signed).not.toContain(' ')
    expect(signed).toContain('%20')
    expect(signed).toContain('/api/image?url=')
  })
})

describe('deleteImage', () => {
  it('calls del with the blob pathname', async () => {
    vi.mocked(del).mockResolvedValue(undefined)
    await deleteImage('clothing/img.jpg')
    expect(del).toHaveBeenCalledWith('clothing/img.jpg')
  })
})

describe('getBlobUsageBytes', () => {
  it('returns sum of all blob sizes', async () => {
    vi.mocked(list).mockResolvedValue({
      blobs: [
        { size: 1024 * 100 } as any,
        { size: 1024 * 200 } as any,
        { size: 1024 * 50 } as any,
      ],
      cursor: undefined,
      hasMore: false,
    })

    const result = await getBlobUsageBytes()
    expect(result).toBe(1024 * 350)
    expect(list).toHaveBeenCalledWith({ prefix: 'clothing/' })
  })

  it('returns 0 when blob list is empty', async () => {
    vi.mocked(list).mockResolvedValue({ blobs: [], cursor: undefined, hasMore: false })
    const result = await getBlobUsageBytes()
    expect(result).toBe(0)
  })

  it('returns 0 when list throws an error', async () => {
    vi.mocked(list).mockRejectedValue(new Error('Network error'))
    const result = await getBlobUsageBytes()
    expect(result).toBe(0)
  })
})
