import { describe, it, expect } from 'vitest'
import { getTimeDigits, formatTime } from '../clock'

describe('getTimeDigits', () => {
  describe('24h format', () => {
    it('returns correct digits for 14:35:09 in 24h format', () => {
      const date = new Date(2024, 0, 1, 14, 35, 9)
      const result = getTimeDigits(date, '24h', true)

      expect(result).toEqual({
        h1: '1',
        h2: '4',
        m1: '3',
        m2: '5',
        s1: '0',
        s2: '9',
        ampm: '',
      })
    })

    it('returns correct digits for 00:00:00 in 24h format (midnight)', () => {
      const date = new Date(2024, 0, 1, 0, 0, 0)
      const result = getTimeDigits(date, '24h', true)

      expect(result).toEqual({
        h1: '0',
        h2: '0',
        m1: '0',
        m2: '0',
        s1: '0',
        s2: '0',
        ampm: '',
      })
    })

    it('returns correct digits for 23:59:59 in 24h format', () => {
      const date = new Date(2024, 0, 1, 23, 59, 59)
      const result = getTimeDigits(date, '24h', true)

      expect(result).toEqual({
        h1: '2',
        h2: '3',
        m1: '5',
        m2: '9',
        s1: '5',
        s2: '9',
        ampm: '',
      })
    })

    it('returns empty ampm in 24h format', () => {
      const date = new Date(2024, 0, 1, 14, 0, 0)
      const result = getTimeDigits(date, '24h', true)

      expect(result.ampm).toBe('')
    })
  })

  describe('12h format', () => {
    it('returns correct digits for 14:35 in 12h format (2 PM)', () => {
      const date = new Date(2024, 0, 1, 14, 35, 9)
      const result = getTimeDigits(date, '12h', true)

      expect(result).toEqual({
        h1: '0',
        h2: '2',
        m1: '3',
        m2: '5',
        s1: '0',
        s2: '9',
        ampm: 'PM',
      })
    })

    it('returns 12:00 AM for midnight (00:00) in 12h format', () => {
      const date = new Date(2024, 0, 1, 0, 0, 0)
      const result = getTimeDigits(date, '12h', true)

      expect(result.h1).toBe('1')
      expect(result.h2).toBe('2')
      expect(result.ampm).toBe('AM')
    })

    it('returns 12:00 PM for noon (12:00) in 12h format', () => {
      const date = new Date(2024, 0, 1, 12, 0, 0)
      const result = getTimeDigits(date, '12h', true)

      expect(result.h1).toBe('1')
      expect(result.h2).toBe('2')
      expect(result.ampm).toBe('PM')
    })

    it('returns correct AM for hours before noon', () => {
      const date = new Date(2024, 0, 1, 9, 30, 0)
      const result = getTimeDigits(date, '12h', true)

      expect(result.h1).toBe('0')
      expect(result.h2).toBe('9')
      expect(result.ampm).toBe('AM')
    })

    it('returns correct PM for hours after noon', () => {
      const date = new Date(2024, 0, 1, 23, 0, 0)
      const result = getTimeDigits(date, '12h', true)

      expect(result.h1).toBe('1')
      expect(result.h2).toBe('1')
      expect(result.ampm).toBe('PM')
    })
  })

  describe('showSeconds', () => {
    it('returns empty string for s1 and s2 when showSeconds is false', () => {
      const date = new Date(2024, 0, 1, 10, 30, 45)
      const result = getTimeDigits(date, '24h', false)

      expect(result.s1).toBe('')
      expect(result.s2).toBe('')
    })

    it('returns correct seconds when showSeconds is true', () => {
      const date = new Date(2024, 0, 1, 10, 30, 45)
      const result = getTimeDigits(date, '24h', true)

      expect(result.s1).toBe('4')
      expect(result.s2).toBe('5')
    })
  })
})

describe('formatTime', () => {
  it('formats time in 24h with seconds', () => {
    const date = new Date(2024, 0, 1, 14, 35, 9)
    const result = formatTime(date, '24h', true)

    expect(result).toBe('14:35:09')
  })

  it('formats time in 24h without seconds', () => {
    const date = new Date(2024, 0, 1, 14, 35, 9)
    const result = formatTime(date, '24h', false)

    expect(result).toBe('14:35')
  })

  it('formats time in 12h with seconds and AM', () => {
    const date = new Date(2024, 0, 1, 9, 5, 3)
    const result = formatTime(date, '12h', true)

    expect(result).toBe('09:05:03 AM')
  })

  it('formats time in 12h with seconds and PM', () => {
    const date = new Date(2024, 0, 1, 14, 35, 9)
    const result = formatTime(date, '12h', true)

    expect(result).toBe('02:35:09 PM')
  })

  it('formats time in 12h without seconds', () => {
    const date = new Date(2024, 0, 1, 14, 35, 9)
    const result = formatTime(date, '12h', false)

    expect(result).toBe('02:35 PM')
  })

  it('formats midnight as 12:00 AM in 12h format', () => {
    const date = new Date(2024, 0, 1, 0, 0, 0)
    const result = formatTime(date, '12h', false)

    expect(result).toBe('12:00 AM')
  })

  it('formats noon as 12:00 PM in 12h format', () => {
    const date = new Date(2024, 0, 1, 12, 0, 0)
    const result = formatTime(date, '12h', false)

    expect(result).toBe('12:00 PM')
  })
})
