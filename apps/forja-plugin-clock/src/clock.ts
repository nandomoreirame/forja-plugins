import type { TimeDigits, ClockFormat } from './types'

/**
 * Extracts individual time digits from a Date for display in the clock UI.
 * Handles 12h/24h format conversion and optionally omits seconds.
 */
export function getTimeDigits(date: Date, format: ClockFormat, showSeconds: boolean): TimeDigits {
  let h = date.getHours()
  const m = date.getMinutes()
  const s = date.getSeconds()
  let ampm = ''

  if (format === '12h') {
    ampm = h >= 12 ? 'PM' : 'AM'
    h = h % 12
    if (h === 0) h = 12 // midnight and noon show as 12
  }

  const hStr = h.toString().padStart(2, '0')
  const mStr = m.toString().padStart(2, '0')
  const sStr = s.toString().padStart(2, '0')

  return {
    h1: hStr[0],
    h2: hStr[1],
    m1: mStr[0],
    m2: mStr[1],
    s1: showSeconds ? sStr[0] : '',
    s2: showSeconds ? sStr[1] : '',
    ampm,
  }
}

/**
 * Formats a Date as a time string for the digital/minimal clock display.
 */
export function formatTime(date: Date, format: ClockFormat, showSeconds: boolean): string {
  const digits = getTimeDigits(date, format, true)

  const hh = digits.h1 + digits.h2
  const mm = digits.m1 + digits.m2
  const ss = digits.s1 + digits.s2

  let result = `${hh}:${mm}`
  if (showSeconds) result += `:${ss}`
  if (format === '12h') result += ` ${digits.ampm}`

  return result
}
