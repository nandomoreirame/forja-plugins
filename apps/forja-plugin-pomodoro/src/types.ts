export type PomodoroMode = 'focus' | 'break' | 'longBreak'

export interface PomodoroConfig {
  sessionTarget: number
  focusDuration: number
  breakDuration: number
  longBreakDuration: number
}

export interface PomodoroSession {
  mode: PomodoroMode
  remaining: number
  totalDuration: number
  completedToday: number
  totalFocusSeconds: number
  sessionPomodorosCompleted: number
  running: boolean
  lastTickAt: number | null
  savedAt: number | null
  savedDate: string | null
}

export const DEFAULT_CONFIG: PomodoroConfig = {
  sessionTarget: 4,
  focusDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
}

export const DEFAULT_SESSION: PomodoroSession = {
  mode: 'focus',
  remaining: 25 * 60,
  totalDuration: 25 * 60,
  completedToday: 0,
  totalFocusSeconds: 0,
  sessionPomodorosCompleted: 0,
  running: false,
  lastTickAt: null,
  savedAt: null,
  savedDate: null,
}
