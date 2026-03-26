import { describe, it, expect } from 'vitest'
import {
  formatTime,
  formatTimeShort,
  formatDuration,
  getDuration,
  isBreakMode,
  calcFinishTime,
} from '../timer'
import type { PomodoroConfig } from '../types'

const defaultConfig: PomodoroConfig = {
  sessionTarget: 4,
  focusDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
}

// ── formatTime ──────────────────────────────────────────────
describe('formatTime', () => {
  it('formats 0 seconds as "00:00"', () => {
    expect(formatTime(0)).toBe('00:00')
  })

  it('formats 90 seconds as "01:30"', () => {
    expect(formatTime(90)).toBe('01:30')
  })

  it('formats 1500 seconds (25 minutes) as "25:00"', () => {
    expect(formatTime(1500)).toBe('25:00')
  })

  it('formats 3661 seconds as "61:01"', () => {
    expect(formatTime(3661)).toBe('61:01')
  })

  it('pads single-digit seconds with leading zero', () => {
    expect(formatTime(65)).toBe('01:05')
  })
})

// ── formatTimeShort ──────────────────────────────────────────
describe('formatTimeShort', () => {
  it('formats 1500 seconds (25 min) as "25m"', () => {
    expect(formatTimeShort(1500)).toBe('25m')
  })

  it('formats 300 seconds (5 min) as "5m"', () => {
    expect(formatTimeShort(300)).toBe('5m')
  })

  it('formats 3600 seconds (60 min) as "1h"', () => {
    expect(formatTimeShort(3600)).toBe('1h')
  })

  it('formats 7200 seconds (2 hours) as "2h"', () => {
    expect(formatTimeShort(7200)).toBe('2h')
  })

  it('formats seconds with non-zero remainder as "M:SS"', () => {
    expect(formatTimeShort(90)).toBe('1:30')
  })

  it('formats 65 seconds as "1:05"', () => {
    expect(formatTimeShort(65)).toBe('1:05')
  })
})

// ── formatDuration ───────────────────────────────────────────
describe('formatDuration', () => {
  it('formats 0 seconds as "0m"', () => {
    expect(formatDuration(0)).toBe('0m')
  })

  it('formats 3600 seconds as "1h 0m"', () => {
    expect(formatDuration(3600)).toBe('1h 0m')
  })

  it('formats 5400 seconds (1h30m) as "1h 30m"', () => {
    expect(formatDuration(5400)).toBe('1h 30m')
  })

  it('formats 1500 seconds (25 min) as "25m"', () => {
    expect(formatDuration(1500)).toBe('25m')
  })

  it('formats 7320 seconds (2h 2m) as "2h 2m"', () => {
    expect(formatDuration(7320)).toBe('2h 2m')
  })
})

// ── getDuration ──────────────────────────────────────────────
describe('getDuration', () => {
  it('returns focusDuration for mode "focus"', () => {
    expect(getDuration('focus', defaultConfig)).toBe(25)
  })

  it('returns breakDuration for mode "break"', () => {
    expect(getDuration('break', defaultConfig)).toBe(5)
  })

  it('returns longBreakDuration for mode "longBreak"', () => {
    expect(getDuration('longBreak', defaultConfig)).toBe(15)
  })

  it('respects custom config values', () => {
    const customConfig: PomodoroConfig = {
      ...defaultConfig,
      focusDuration: 50,
      breakDuration: 10,
      longBreakDuration: 30,
    }
    expect(getDuration('focus', customConfig)).toBe(50)
    expect(getDuration('break', customConfig)).toBe(10)
    expect(getDuration('longBreak', customConfig)).toBe(30)
  })
})

// ── isBreakMode ──────────────────────────────────────────────
describe('isBreakMode', () => {
  it('returns false for "focus" mode', () => {
    expect(isBreakMode('focus')).toBe(false)
  })

  it('returns true for "break" mode', () => {
    expect(isBreakMode('break')).toBe(true)
  })

  it('returns true for "longBreak" mode', () => {
    expect(isBreakMode('longBreak')).toBe(true)
  })
})

// ── calcFinishTime ───────────────────────────────────────────
describe('calcFinishTime', () => {
  it('returns null when all pomodoros for the day are already completed', () => {
    const result = calcFinishTime({
      remaining: 0,
      mode: 'focus',
      config: defaultConfig,
      completedToday: 4,
    })
    expect(result).toBeNull()
  })

  it('calculates finish time for a single focus session remaining', () => {
    // 1 focus session remaining, currently 1500s into focus, 0 completed
    const now = Date.now()
    const result = calcFinishTime({
      remaining: 1500,
      mode: 'focus',
      config: defaultConfig,
      completedToday: 3,
    })
    // Only 1 focus left: remaining = 1500s
    // Expected finish: now + 1500s
    expect(result).not.toBeNull()
    const finishAt = new Date(now + 1500 * 1000)
    const hh = finishAt.getHours().toString().padStart(2, '0')
    const mm = finishAt.getMinutes().toString().padStart(2, '0')
    // Allow 1 second tolerance due to test execution time
    expect(result).toMatch(new RegExp(`${hh}:${mm}`))
  })

  it('includes break durations in calculation when in focus mode with multiple pomodoros left', () => {
    // completedToday=0, sessionTarget=4, mode='focus', remaining=1500
    // focusLeft = 4, extra sessions = 3 (i=1,2,3)
    // sessionIndex for breaks: 1, 2, 3 — none are multiples of 4, all short breaks
    //   current: 1500s
    //   i=1: sessionIndex=1, 1%4≠0 → short. +1500 (focus) + 300 (break) = 1800
    //   i=2: sessionIndex=2, 2%4≠0 → short. +1500 + 300 = 1800
    //   i=3: sessionIndex=3, 3%4≠0 → short. +1500 + 300 = 1800
    //   total = 1500 + 1800 + 1800 + 1800 = 6900s = 115min = 1h 55m
    const result = calcFinishTime({
      remaining: 1500,
      mode: 'focus',
      config: defaultConfig,
      completedToday: 0,
    })
    expect(result).not.toBeNull()
    expect(result).toContain('1h 55m')
  })

  it('calculates correct duration when currently in a break', () => {
    // In break, 2 completedToday, sessionTarget=4, focusLeft=2
    // remaining break = 300s
    // then 2 more focus sessions + breaks between
    // total: 300 (break remaining) + 25*60 + 5*60 + 25*60 = 300 + 1500 + 300 + 1500 = 3600s = 1h 0m
    // Note: last focus session (completedToday+focusLeft = 2+2=4, 4%4==0 → long break after)
    // but we don't count the final break after the last session
    // Let's trace: completedToday=2, focusLeft=2, mode=break
    // totalSeconds = 300 (break remaining) + 2*focusDuration*60 + 1 break (for session index 3, 3%4!=0 → short)
    // = 300 + 1500 + 300 + 1500 = 3600 — wait, only focusLeft-1 breaks between focus sessions
    // Actually looking at original code: for break mode:
    //   totalSeconds += focusLeft * focusDuration * 60
    //   + for j in 0..focusLeft-2: breaks
    // So: 300 + 2*1500 + 1 break (j=0, sIdx=3, 3%4!=0 → short=5min=300s)
    // = 300 + 3000 + 300 = 3600s = 1h 0m
    const now = Date.now()
    const result = calcFinishTime({
      remaining: 300,
      mode: 'break',
      config: defaultConfig,
      completedToday: 2,
    })
    expect(result).not.toBeNull()
    expect(result).toContain('1h 0m')
  })
})
