import type { PomodoroMode, PomodoroConfig } from './types'

/**
 * Formats seconds into MM:SS display format.
 * e.g. 90 → "01:30", 1500 → "25:00"
 */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

/**
 * Formats seconds as a compact badge string.
 * e.g. 1500 → "25m", 3600 → "1h", 90 → "1:30"
 */
export function formatTimeShort(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m >= 60) {
    return `${Math.floor(m / 60)}h`
  }
  if (s === 0) return `${m}m`
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Formats total seconds as a human-readable duration.
 * e.g. 0 → "0m", 3600 → "1h 0m", 5400 → "1h 30m", 1500 → "25m"
 */
export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

/**
 * Returns the duration in minutes for the given mode.
 */
export function getDuration(mode: PomodoroMode, config: PomodoroConfig): number {
  if (mode === 'focus') return config.focusDuration
  if (mode === 'break') return config.breakDuration
  return config.longBreakDuration
}

/**
 * Returns true if the mode is a break (short or long).
 */
export function isBreakMode(mode: PomodoroMode): boolean {
  return mode === 'break' || mode === 'longBreak'
}

export interface CalcFinishTimeParams {
  remaining: number
  mode: PomodoroMode
  config: PomodoroConfig
  completedToday: number
}

/**
 * Calculates the projected finish time string for the current session.
 * Returns null if all pomodoros for the session are already completed.
 * Returns a string like "14:35 (1h 25m)".
 */
export function calcFinishTime(params: CalcFinishTimeParams): string | null {
  const { remaining, mode, config, completedToday } = params
  const focusLeft = config.sessionTarget - completedToday
  if (focusLeft <= 0) return null

  let totalSeconds = remaining

  if (mode === 'focus' && focusLeft > 1) {
    const extraFocusSessions = focusLeft - 1
    for (let i = 1; i <= extraFocusSessions; i++) {
      const sessionIndex = completedToday + i
      const isLong = sessionIndex > 0 && sessionIndex % 4 === 0
      totalSeconds += config.focusDuration * 60
      totalSeconds += (isLong ? config.longBreakDuration : config.breakDuration) * 60
    }
  } else if (isBreakMode(mode)) {
    totalSeconds += focusLeft * config.focusDuration * 60
    for (let j = 0; j < focusLeft - 1; j++) {
      const sIdx = completedToday + j + 1
      const isLong = sIdx > 0 && sIdx % 4 === 0
      totalSeconds += (isLong ? config.longBreakDuration : config.breakDuration) * 60
    }
  }

  const finishAt = new Date(Date.now() + totalSeconds * 1000)
  const hh = finishAt.getHours().toString().padStart(2, '0')
  const mm = finishAt.getMinutes().toString().padStart(2, '0')
  return `${hh}:${mm} (${formatDuration(totalSeconds)})`
}
