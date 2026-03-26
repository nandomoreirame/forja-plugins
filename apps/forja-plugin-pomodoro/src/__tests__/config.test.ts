import { describe, it, expect, beforeEach } from 'vitest'
import { loadConfig, saveConfig, loadSession, saveSession, clearSession } from '../config'
import type { PomodoroConfig, PomodoroSession } from '../types'
import { DEFAULT_CONFIG, DEFAULT_SESSION } from '../types'

// jsdom environment provides localStorage

beforeEach(() => {
  localStorage.clear()
})

// ── loadConfig ───────────────────────────────────────────────
describe('loadConfig', () => {
  it('returns DEFAULT_CONFIG when nothing is stored', () => {
    const config = loadConfig()
    expect(config).toEqual(DEFAULT_CONFIG)
  })

  it('returns stored config after saveConfig', () => {
    const customConfig: PomodoroConfig = {
      sessionTarget: 6,
      focusDuration: 30,
      breakDuration: 10,
      longBreakDuration: 20,
    }
    saveConfig(customConfig)
    const loaded = loadConfig()
    expect(loaded).toEqual(customConfig)
  })

  it('returns DEFAULT_CONFIG when localStorage contains invalid JSON', () => {
    localStorage.setItem('pomodoro:config', 'not-valid-json{{{')
    const config = loadConfig()
    expect(config).toEqual(DEFAULT_CONFIG)
  })
})

// ── saveConfig ───────────────────────────────────────────────
describe('saveConfig', () => {
  it('persists config to localStorage', () => {
    const config: PomodoroConfig = {
      sessionTarget: 8,
      focusDuration: 45,
      breakDuration: 15,
      longBreakDuration: 30,
    }
    saveConfig(config)
    const raw = localStorage.getItem('pomodoro:config')
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!)).toEqual(config)
  })
})

// ── loadSession ──────────────────────────────────────────────
describe('loadSession', () => {
  it('returns null when nothing is stored', () => {
    const session = loadSession()
    expect(session).toBeNull()
  })

  it('returns stored session after saveSession', () => {
    const session: PomodoroSession = {
      ...DEFAULT_SESSION,
      mode: 'break',
      remaining: 300,
      completedToday: 2,
    }
    saveSession(session)
    const loaded = loadSession()
    expect(loaded).toEqual(session)
  })

  it('returns null when localStorage contains invalid JSON', () => {
    localStorage.setItem('pomodoro:session', '{{invalid}}')
    const session = loadSession()
    expect(session).toBeNull()
  })
})

// ── saveSession ──────────────────────────────────────────────
describe('saveSession', () => {
  it('persists full session to localStorage', () => {
    const session: PomodoroSession = {
      ...DEFAULT_SESSION,
      mode: 'longBreak',
      remaining: 900,
      totalFocusSeconds: 3600,
      completedToday: 4,
      sessionPomodorosCompleted: 4,
    }
    saveSession(session)
    const raw = localStorage.getItem('pomodoro:session')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed.mode).toBe('longBreak')
    expect(parsed.remaining).toBe(900)
    expect(parsed.totalFocusSeconds).toBe(3600)
    expect(parsed.completedToday).toBe(4)
  })
})

// ── clearSession ─────────────────────────────────────────────
describe('clearSession', () => {
  it('removes session from localStorage', () => {
    saveSession(DEFAULT_SESSION)
    expect(localStorage.getItem('pomodoro:session')).not.toBeNull()
    clearSession()
    expect(localStorage.getItem('pomodoro:session')).toBeNull()
  })

  it('does not throw when there is no session to clear', () => {
    expect(() => clearSession()).not.toThrow()
  })
})
