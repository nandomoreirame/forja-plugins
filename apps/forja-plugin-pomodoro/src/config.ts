import { loadStorage, saveStorage, clearStorage } from '@forja/sdk'
import type { PomodoroConfig, PomodoroSession } from './types'
import { DEFAULT_CONFIG } from './types'

const STORAGE_KEY_CONFIG = 'pomodoro:config'
const STORAGE_KEY_SESSION = 'pomodoro:session'

/**
 * Loads the persisted Pomodoro config from localStorage.
 * Returns DEFAULT_CONFIG if nothing is stored or the data is invalid.
 */
export function loadConfig(): PomodoroConfig {
  const stored = loadStorage<PomodoroConfig>(STORAGE_KEY_CONFIG)
  if (stored === null) return { ...DEFAULT_CONFIG }
  return {
    sessionTarget: stored.sessionTarget ?? DEFAULT_CONFIG.sessionTarget,
    focusDuration: stored.focusDuration ?? DEFAULT_CONFIG.focusDuration,
    breakDuration: stored.breakDuration ?? DEFAULT_CONFIG.breakDuration,
    longBreakDuration: stored.longBreakDuration ?? DEFAULT_CONFIG.longBreakDuration,
  }
}

/**
 * Saves the given config to localStorage.
 */
export function saveConfig(config: PomodoroConfig): void {
  saveStorage(STORAGE_KEY_CONFIG, config)
}

/**
 * Loads the persisted session from localStorage.
 * Returns null if nothing is stored or the data is invalid.
 */
export function loadSession(): PomodoroSession | null {
  return loadStorage<PomodoroSession>(STORAGE_KEY_SESSION)
}

/**
 * Saves the given session to localStorage.
 */
export function saveSession(session: PomodoroSession): void {
  saveStorage(STORAGE_KEY_SESSION, session)
}

/**
 * Removes the session from localStorage.
 */
export function clearSession(): void {
  clearStorage(STORAGE_KEY_SESSION)
}
