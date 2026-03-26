import type { PomodoroSession, PomodoroConfig } from './types'
import { formatTime, formatDuration, isBreakMode, calcFinishTime } from './timer'

function el<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id)
  if (!element) throw new Error(`Element #${id} not found`)
  return element as T
}

/**
 * Updates the full UI to reflect the current session and config state.
 */
export function updateDisplay(session: PomodoroSession, config: PomodoroConfig): void {
  const display = el<HTMLElement>('timer-display')
  const stateLabel = el<HTMLElement>('timer-state-label')
  const progressFill = el<HTMLElement>('progress-bar-fill')
  const btnStart = el<HTMLButtonElement>('btn-start')
  const btnClear = el<HTMLButtonElement>('btn-clear')
  const statPomodoros = el<HTMLElement>('stat-pomodoros')
  const statFinish = el<HTMLElement>('stat-finish')
  const statTotalFocus = el<HTMLElement>('stat-total-focus')
  const sessionPomodorosDisplay = el<HTMLElement>('session-pomodoros-display')
  const focusDurationDisplay = el<HTMLElement>('focus-duration-display')
  const breakDurationDisplay = el<HTMLElement>('break-duration-display')
  const longBreakDurationDisplay = el<HTMLElement>('long-break-duration-display')

  display.textContent = formatTime(session.remaining)

  // Reset classes
  display.className = 'timer-display'
  stateLabel.className = 'timer-state-label'
  progressFill.className = 'progress-bar-fill'

  const isBreak = isBreakMode(session.mode)

  if (session.running && !isBreak) {
    display.classList.add('running')
    stateLabel.classList.add('running')
    stateLabel.textContent = 'FOCUS'
  } else if (session.running && isBreak) {
    display.classList.add('break-running')
    stateLabel.classList.add('break-running')
    progressFill.classList.add('break-mode')
    stateLabel.textContent = session.mode === 'longBreak' ? 'LONG BREAK' : 'BREAK'
  } else if (!session.running && session.remaining < session.totalDuration) {
    display.classList.add('paused')
    stateLabel.textContent = 'PAUSED'
  } else {
    stateLabel.textContent = 'IDLE'
  }

  // Progress bar
  const elapsed = session.totalDuration - session.remaining
  const pct = session.totalDuration > 0 ? (elapsed / session.totalDuration) * 100 : 0
  progressFill.style.width = `${pct}%`
  if (isBreak && session.running) progressFill.classList.add('break-mode')

  // Start/Pause/Resume button
  if (session.running && !isBreak) {
    btnStart.textContent = 'Pause'
    btnStart.className = 'btn btn-start is-running'
  } else if (session.running && isBreak) {
    btnStart.textContent = 'Pause'
    btnStart.className = 'btn btn-start is-break'
  } else if (!session.running && session.remaining < session.totalDuration) {
    btnStart.textContent = 'Resume'
    btnStart.className = 'btn btn-start'
  } else {
    btnStart.textContent = 'Start'
    btnStart.className = 'btn btn-start'
  }

  // Clear button — only while paused mid-session
  const hasPaused = !session.running && session.remaining < session.totalDuration
  btnClear.style.display = hasPaused ? 'inline-block' : 'none'

  // Stats
  statPomodoros.innerHTML = `${session.completedToday} / <span id="session-target">${config.sessionTarget}</span>`
  const finishStr = calcFinishTime({
    remaining: session.remaining,
    mode: session.mode,
    config,
    completedToday: session.completedToday,
  })
  statFinish.textContent = finishStr ?? '--:-- (--)'
  statTotalFocus.textContent = formatDuration(session.totalFocusSeconds)

  // Dots
  renderDots(session, config)

  // Config displays
  sessionPomodorosDisplay.textContent = String(config.sessionTarget)
  focusDurationDisplay.textContent = String(config.focusDuration)
  breakDurationDisplay.textContent = String(config.breakDuration)
  longBreakDurationDisplay.textContent = String(config.longBreakDuration)
}

/**
 * Renders session progress dots.
 */
export function renderDots(session: PomodoroSession, config: PomodoroConfig): void {
  const sessionDots = el<HTMLElement>('session-dots')
  sessionDots.innerHTML = ''
  for (let i = 0; i < config.sessionTarget; i++) {
    const dot = document.createElement('span')
    dot.className = 'session-dot'
    if (i < session.sessionPomodorosCompleted) {
      dot.classList.add('completed')
    } else if (i === session.sessionPomodorosCompleted && session.mode === 'focus') {
      dot.classList.add('current')
    }
    sessionDots.appendChild(dot)
  }
}

/**
 * Syncs the active mode tab UI to match the current session mode.
 */
export function syncActiveModeTab(mode: string): void {
  const modeTabs = document.querySelectorAll<HTMLElement>('.mode-tab')
  modeTabs.forEach((tab) => {
    tab.classList.remove('active')
    tab.setAttribute('aria-selected', 'false')
    if (tab.getAttribute('data-mode') === mode) {
      tab.classList.add('active')
      tab.setAttribute('aria-selected', 'true')
    }
  })
}
