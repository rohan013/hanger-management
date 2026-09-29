import { describe, it, expect } from 'vitest'
import { today, APP_TIMEZONE } from '@/lib/config'

describe('today()', () => {
  it('reports the Pacific date, not the UTC one', () => {
    // 06:30 UTC on the 23rd is still 23:30 on the 22nd in Los Angeles. This is
    // the bug that made "today's outfit" roll over at 5pm local time.
    expect(today(new Date('2026-08-23T06:30:00Z'))).toBe('2026-08-22')
  })

  it('rolls over at local midnight', () => {
    expect(today(new Date('2026-08-23T06:59:59Z'))).toBe('2026-08-22')
    expect(today(new Date('2026-08-23T07:00:00Z'))).toBe('2026-08-23')
  })

  it('handles standard time, where the offset is one hour larger', () => {
    // 07:30 UTC in January is 23:30 the previous day in PST (UTC-8).
    expect(today(new Date('2026-01-15T07:30:00Z'))).toBe('2026-01-14')
    expect(today(new Date('2026-01-15T08:00:00Z'))).toBe('2026-01-15')
  })

  it('formats as YYYY-MM-DD so it sorts and compares as text', () => {
    expect(today(new Date('2026-03-05T20:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('is not affected by the host timezone', () => {
    expect(APP_TIMEZONE).toBe('America/Los_Angeles')
  })
})
