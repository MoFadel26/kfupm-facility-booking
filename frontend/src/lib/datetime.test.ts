import { describe, expect, it } from 'vitest'
import { calculateDuration, fromInputValue, toInputValue } from '@/lib/datetime'

describe('calculateDuration', () => {
  it('returns null when either value is missing', () => {
    expect(calculateDuration('', '2026-07-10T12:00')).toBeNull()
    expect(calculateDuration('2026-07-10T10:00', '')).toBeNull()
  })

  it('returns null when end is not after start', () => {
    expect(calculateDuration('2026-07-10T10:00', '2026-07-10T10:00')).toBeNull()
    expect(calculateDuration('2026-07-10T12:00', '2026-07-10T10:00')).toBeNull()
  })

  it('returns null for unparseable dates', () => {
    expect(calculateDuration('not a date', '2026-07-10T10:00')).toBeNull()
  })

  it('formats minutes only', () => {
    expect(calculateDuration('2026-07-10T10:00', '2026-07-10T10:45')).toBe('45 min')
  })

  it('formats whole hours', () => {
    expect(calculateDuration('2026-07-10T10:00', '2026-07-10T11:00')).toBe('1 hr')
    expect(calculateDuration('2026-07-10T10:00', '2026-07-10T13:00')).toBe('3 hrs')
  })

  it('formats hours and minutes', () => {
    expect(calculateDuration('2026-07-10T10:00', '2026-07-10T12:30')).toBe('2 hr 30 min')
  })

  it('spans midnight', () => {
    expect(calculateDuration('2026-07-10T23:00', '2026-07-11T01:15')).toBe('2 hr 15 min')
  })
})

describe('toInputValue / fromInputValue', () => {
  it('formats an ISO string as a datetime-local value', () => {
    expect(toInputValue('2026-07-10T10:05:00Z')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })

  it('round-trips through the input value', () => {
    const iso = '2026-07-10T10:05:00.000Z'
    expect(fromInputValue(toInputValue(iso))).toBe(iso)
  })
})
