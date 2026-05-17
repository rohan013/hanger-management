import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { removeBackground, processImage } from '@/lib/image'
import { STORAGE_CONFIG } from '@/lib/config'

// Hoisted so they can be referenced inside the vi.mock factory
const { mockMetadata, mockToBuffer } = vi.hoisted(() => ({
  mockMetadata: vi.fn(),
  mockToBuffer: vi.fn(),
}))

vi.mock('sharp', () => {
  const instance: Record<string, unknown> = {}
  instance.metadata = mockMetadata
  instance.toBuffer = mockToBuffer
  instance.resize = vi.fn().mockReturnValue(instance)
  instance.jpeg = vi.fn().mockReturnValue(instance)
  instance.png = vi.fn().mockReturnValue(instance)
  return { default: vi.fn().mockReturnValue(instance) }
})

const mockFetch = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('removeBackground', () => {
  const input = Buffer.from('original image data')

  it('returns original buffer when REMOVE_BG_API_KEY is not set', async () => {
    delete process.env.REMOVE_BG_API_KEY
    const result = await removeBackground(input)
    expect(result).toBe(input)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('calls remove.bg API and returns processed buffer when key is set', async () => {
    process.env.REMOVE_BG_API_KEY = 'test-key'
    const processed = Buffer.from('no background image')
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(processed.buffer),
    })

    const result = await removeBackground(input)

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.remove.bg/v1.0/removebg',
      expect.objectContaining({
        method: 'POST',
        headers: { 'X-Api-Key': 'test-key' },
      })
    )
    expect(Buffer.from(result)).toEqual(Buffer.from(processed.buffer))
    delete process.env.REMOVE_BG_API_KEY
  })

  it('throws when remove.bg API returns an error response', async () => {
    process.env.REMOVE_BG_API_KEY = 'test-key'
    mockFetch.mockResolvedValue({
      ok: false,
      status: 402,
      text: vi.fn().mockResolvedValue('Insufficient credits'),
    })

    await expect(removeBackground(input)).rejects.toThrow('Remove.bg API error 402')
    delete process.env.REMOVE_BG_API_KEY
  })
})

describe('processImage', () => {
  const input = Buffer.from('raw image')
  const compressed = Buffer.from('compressed')

  it('produces JPEG output for images without alpha channel', async () => {
    mockMetadata.mockResolvedValue({ channels: 3, hasAlpha: false })
    mockToBuffer.mockResolvedValue(compressed)

    const result = await processImage(input)

    expect(result.format).toBe('jpeg')
    expect(result.buffer).toEqual(compressed)
  })

  it('produces PNG output for images with alpha channel via channels === 4', async () => {
    mockMetadata.mockResolvedValue({ channels: 4, hasAlpha: false })
    mockToBuffer.mockResolvedValue(compressed)

    const result = await processImage(input)

    expect(result.format).toBe('png')
  })

  it('produces PNG output for images with hasAlpha flag', async () => {
    mockMetadata.mockResolvedValue({ channels: 3, hasAlpha: true })
    mockToBuffer.mockResolvedValue(compressed)

    const result = await processImage(input)

    expect(result.format).toBe('png')
  })

  it('resizes to TARGET_IMAGE_WIDTH without enlarging', async () => {
    mockMetadata.mockResolvedValue({ channels: 3, hasAlpha: false })
    mockToBuffer.mockResolvedValue(compressed)

    const sharp = (await import('sharp')).default as unknown as ReturnType<typeof vi.fn>
    await processImage(input)

    const instance = sharp.mock.results[0].value
    expect(instance.resize).toHaveBeenCalledWith(
      expect.objectContaining({
        width: STORAGE_CONFIG.TARGET_IMAGE_WIDTH,
        withoutEnlargement: true,
      })
    )
  })

  it('applies configured JPEG quality', async () => {
    mockMetadata.mockResolvedValue({ channels: 3, hasAlpha: false })
    mockToBuffer.mockResolvedValue(compressed)

    const sharp = (await import('sharp')).default as unknown as ReturnType<typeof vi.fn>
    await processImage(input)

    const instance = sharp.mock.results[0].value
    expect(instance.jpeg).toHaveBeenCalledWith(
      expect.objectContaining({ quality: STORAGE_CONFIG.TARGET_IMAGE_QUALITY })
    )
  })
})
