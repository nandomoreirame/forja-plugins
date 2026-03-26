import { describe, it, expect } from 'vitest'
import { getNextMode, tick } from '../state'
import type { PomodoroSession } from '../types'

const baseSession: PomodoroSession = {
  mode: 'focus',
  remaining: 1500,
  totalDuration: 1500,
  completedToday: 0,
  totalFocusSeconds: 0,
  sessionPomodorosCompleted: 0,
  running: true,
  lastTickAt: null,
  savedAt: null,
  savedDate: null,
}

// ── getNextMode ──────────────────────────────────────────────
describe('getNextMode', () => {
  it('transitions focus → break when not at session long-break boundary', () => {
    // completedToday will become 1 after this focus, 1 % 4 !== 0 → short break
    const result = getNextMode('focus', 0, 4)
    expect(result).toBe('break')
  })

  it('transitions focus → longBreak at every 4th pomodoro', () => {
    // completedToday will become 4, 4 % 4 === 0 → long break
    const result = getNextMode('focus', 3, 4)
    expect(result).toBe('longBreak')
  })

  it('transitions focus → longBreak at every multiple of 4', () => {
    // completedToday will become 8, 8 % 4 === 0 → long break
    const result = getNextMode('focus', 7, 4)
    expect(result).toBe('longBreak')
  })

  it('transitions break → focus', () => {
    const result = getNextMode('break', 1, 4)
    expect(result).toBe('focus')
  })

  it('transitions longBreak → focus', () => {
    const result = getNextMode('longBreak', 4, 4)
    expect(result).toBe('focus')
  })

  it('transitions focus → break at boundary 2 out of 4', () => {
    // completedToday = 1, next will be 2, 2%4 !== 0 → break
    const result = getNextMode('focus', 1, 4)
    expect(result).toBe('break')
  })
})

// ── tick ─────────────────────────────────────────────────────
describe('tick', () => {
  it('decrements remaining by 1 each tick', () => {
    const session: PomodoroSession = { ...baseSession, remaining: 100 }
    const result = tick(session)
    expect(result.remaining).toBe(99)
  })

  it('adds 1 to totalFocusSeconds when mode is focus', () => {
    const session: PomodoroSession = { ...baseSession, mode: 'focus', totalFocusSeconds: 10 }
    const result = tick(session)
    expect(result.totalFocusSeconds).toBe(11)
  })

  it('does not add to totalFocusSeconds when mode is break', () => {
    const session: PomodoroSession = {
      ...baseSession,
      mode: 'break',
      remaining: 300,
      totalDuration: 300,
      totalFocusSeconds: 50,
    }
    const result = tick(session)
    expect(result.totalFocusSeconds).toBe(50)
  })

  it('does not add to totalFocusSeconds when mode is longBreak', () => {
    const session: PomodoroSession = {
      ...baseSession,
      mode: 'longBreak',
      remaining: 900,
      totalDuration: 900,
      totalFocusSeconds: 100,
    }
    const result = tick(session)
    expect(result.totalFocusSeconds).toBe(100)
  })

  it('does not mutate the input session (pure function)', () => {
    const session: PomodoroSession = { ...baseSession, remaining: 500, totalFocusSeconds: 20 }
    const original = { ...session }
    tick(session)
    expect(session.remaining).toBe(original.remaining)
    expect(session.totalFocusSeconds).toBe(original.totalFocusSeconds)
  })

  it('allows remaining to reach 0', () => {
    const session: PomodoroSession = { ...baseSession, remaining: 1 }
    const result = tick(session)
    expect(result.remaining).toBe(0)
  })
})
