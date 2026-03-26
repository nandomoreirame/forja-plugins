import type { PomodoroMode, PomodoroSession } from './types'

/**
 * Determines the next mode after a timer phase completes.
 *
 * @param currentMode - The mode that just finished
 * @param completedToday - Number of focus sessions completed today (before this one)
 * @param sessionTarget - Target number of pomodoros per session
 */
export function getNextMode(
  currentMode: PomodoroMode,
  completedToday: number,
  _sessionTarget: number,
): PomodoroMode {
  if (currentMode === 'focus') {
    const nextCompleted = completedToday + 1
    return nextCompleted % 4 === 0 ? 'longBreak' : 'break'
  }
  return 'focus'
}

/**
 * Advances the timer by one second.
 * Pure function — returns a new session object without mutating the input.
 */
export function tick(session: PomodoroSession): PomodoroSession {
  const next: PomodoroSession = { ...session }
  next.remaining = session.remaining - 1
  if (session.mode === 'focus') {
    next.totalFocusSeconds = session.totalFocusSeconds + 1
  }
  return next
}
