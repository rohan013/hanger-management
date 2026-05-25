import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/image/route'

vi.mock('@vercel/blob')
import { get } from '@vercel/blob'
const mockGet = vi.mocked(get)

beforeEach(() => {
  process.env.BLOB_READ_WRITE_TOKEN = 'test-token'
})

afterEach(() => {
  vi.clearAllMocks()
  delete process.env.BLOB_READ_WRITE_TOKEN
})

const blobUrl = 'https://abc123.blob.vercel-storage.com/clothing/shirt.jpg'

const makeRequest = (url?: string) => {
  const searchParam = url ? `?url=${encodeURIComponent(url)}` : ''
  return new NextRequest(`http://localhost/api/image${searchParam}`)
}

describe('GET /api/image', () => {
  it('returns 400 when url query parameter is missing', async () => {
    const response = await GET(makeRequest())
    expect(response.status).toBe(400)
    const text = await response.text()
    expect(text).toMatch(/Missing url/i)
  })

  it('returns 400 when url is not a valid URL', async () => {
    const response = await GET(makeRequest('not-a-valid-url'))
    expect(response.status).toBe(400)
    const text = await response.text()
    expect(text).toMatch(/Invalid url/i)
  })

  it('returns 403 when hostname is not a Vercel Blob URL', async () => {
    const response = await GET(makeRequest('https://evil.com/steal.jpg'))
    expect(response.status).toBe(403)
    const text = await response.text()
    expect(text).toMatch(/Forbidden/i)
  })

  it('returns 403 for URLs that contain but do not end with the allowed domain', async () => {
    const response = await GET(makeRequest('https://blob.vercel-storage.com.evil.com/img.jpg'))
    expect(response.status).toBe(403)
  })

  it('proxies private blob and returns correct cache headers on success', async () => {
    mockGet.mockResolvedValue({
      statusCode: 200,
      stream: new ReadableStream(),
      headers: new Headers({ 'content-type': 'image/jpeg' }),
      blob: { contentType: 'image/jpeg', url: blobUrl, downloadUrl: blobUrl, pathname: 'clothing/shirt.jpg', contentDisposition: '', cacheControl: '', uploadedAt: new Date(), etag: '"abc"', size: 100 },
    } as any)

    const response = await GET(makeRequest(blobUrl))

    expect(mockGet).toHaveBeenCalledWith(blobUrl, { access: 'private' })
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('private, max-age=3600')
    expect(response.headers.get('Content-Type')).toBe('image/jpeg')
  })

  it('falls back to image/jpeg content-type when upstream omits it', async () => {
    mockGet.mockResolvedValue({
      statusCode: 200,
      stream: new ReadableStream(),
      headers: new Headers(),
      blob: { contentType: '', url: blobUrl, downloadUrl: blobUrl, pathname: 'clothing/shirt.jpg', contentDisposition: '', cacheControl: '', uploadedAt: new Date(), etag: '"abc"', size: 100 },
    } as any)

    const response = await GET(makeRequest(blobUrl))
    expect(response.headers.get('Content-Type')).toBe('image/jpeg')
  })

  it('returns 404 when blob is not found', async () => {
    mockGet.mockResolvedValue(null)
    const response = await GET(makeRequest(blobUrl))
    expect(response.status).toBe(404)
  })
})
