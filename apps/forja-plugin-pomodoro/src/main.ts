import { loadConfig, saveConfig, loadSession, saveSession } from './config'
import { tick, getNextMode } from './state'
import { updateDisplay, syncActiveModeTab } from './render'
import { formatTimeShort, getDuration } from './timer'
import type { PomodoroSession } from './types'
import { DEFAULT_SESSION } from './types'

// ── Bootstrap state ───────────────────────────────────────────

let config = loadConfig()

const buildDefaultSession = (): PomodoroSession => ({
  ...DEFAULT_SESSION,
  remaining: config.focusDuration * 60,
  totalDuration: config.focusDuration * 60,
})

function initSession(): PomodoroSession {
  const saved = loadSession()
  if (!saved) return buildDefaultSession()

  const isToday = saved.savedDate === new Date().toDateString()
  let session: PomodoroSession = {
    ...buildDefaultSession(),
    mode: saved.mode ?? 'focus',
    totalDuration: saved.totalDuration ?? buildDefaultSession().totalDuration,
    completedToday: isToday ? (saved.completedToday ?? 0) : 0,
    totalFocusSeconds: isToday ? (saved.totalFocusSeconds ?? 0) : 0,
    sessionPomodorosCompleted: isToday ? (saved.sessionPomodorosCompleted ?? 0) : 0,
    running: false,
    lastTickAt: null,
    savedAt: saved.savedAt,
    savedDate: saved.savedDate,
  }

  if (saved.running && saved.lastTickAt) {
    const elapsedSec = Math.floor((Date.now() - saved.lastTickAt) / 1000)
    const newRemaining = (saved.remaining ?? 0) - elapsedSec

    if (newRemaining > 0) {
      session.remaining = newRemaining
      session.running = true
      if (session.mode === 'focus') {
        session.totalFocusSeconds += elapsedSec
      }
    } else {
      // Timer completed while away
      if (session.mode === 'focus') {
        session.completedToday++
        session.sessionPomodorosCompleted++
        session.totalFocusSeconds += saved.remaining ?? 0
        const nextMode = getNextMode('focus', session.completedToday - 1, config.sessionTarget)
        session.mode = nextMode
      } else {
        session.mode = 'focus'
      }
      session.remaining = getDuration(session.mode, config) * 60
      session.totalDuration = session.remaining
      session.running = false
    }
  } else {
    session.remaining = saved.remaining ?? session.remaining
  }

  return session
}

let session = initSession()
let timerInterval: ReturnType<typeof setInterval> | null = null

// ── Sidebar badge ─────────────────────────────────────────────

function updateBadge(): void {
  if (typeof forja === 'undefined' || !forja.sidebar) return
  try {
    forja.sidebar.setBadge(session.running ? formatTimeShort(session.remaining) : '')
  } catch {
    // permission not granted
  }
}

// ── Timer loop ────────────────────────────────────────────────

function onTimerComplete(): void {
  if (timerInterval !== null) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  session = { ...session, running: false }

  if (session.mode === 'focus') {
    const nextCompleted = session.completedToday + 1
    const nextMode = getNextMode('focus', session.completedToday, config.sessionTarget)

    if (typeof forja !== 'undefined') {
      const isLong = nextMode === 'longBreak'
      forja.notifications
        .show({
          title: 'Pomodoro Complete!',
          body: isLong ? 'Great work! Time for a long break.' : 'Good job! Take a short break.',
        })
        .catch(() => {})
    }

    session = {
      ...session,
      completedToday: nextCompleted,
      sessionPomodorosCompleted: session.sessionPomodorosCompleted + 1,
      mode: nextMode,
    }
  } else {
    if (typeof forja !== 'undefined') {
      forja.notifications
        .show({ title: 'Break Over', body: 'Ready to focus again?' })
        .catch(() => {})
    }
    session = { ...session, mode: 'focus' }
  }

  const nextDuration = getDuration(session.mode, config) * 60
  session = { ...session, remaining: nextDuration, totalDuration: nextDuration }

  syncActiveModeTab(session.mode)
  updateDisplay(session, config)
  saveSession({ ...session, savedAt: Date.now(), savedDate: new Date().toDateString() })
  updateBadge()
}

function doTick(): void {
  if (session.remaining <= 0) {
    onTimerComplete()
    return
  }
  session = tick(session)
  updateDisplay(session, config)
  saveSession({ ...session, lastTickAt: Date.now(), savedAt: Date.now(), savedDate: new Date().toDateString() })
  updateBadge()
}

// ── Event handlers ────────────────────────────────────────────

document.getElementById('btn-start')?.addEventListener('click', () => {
  if (session.running) {
    session = { ...session, running: false }
    if (timerInterval !== null) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  } else {
    session = { ...session, running: true }
    timerInterval = setInterval(doTick, 1000)
  }
  updateDisplay(session, config)
  saveSession({ ...session, savedAt: Date.now(), savedDate: new Date().toDateString() })
  updateBadge()
})

document.getElementById('btn-clear')?.addEventListener('click', () => {
  session = { ...session, running: false }
  if (timerInterval !== null) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  const duration = getDuration(session.mode, config) * 60
  session = { ...session, remaining: duration, totalDuration: duration }
  updateDisplay(session, config)
  saveSession({ ...session, savedAt: Date.now(), savedDate: new Date().toDateString() })
  updateBadge()
})

document.querySelectorAll<HTMLElement>('.mode-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    if (session.running) return
    const newMode = tab.getAttribute('data-mode') as PomodoroSession['mode']
    if (!newMode) return
    session = { ...session, mode: newMode }
    const duration = getDuration(newMode, config) * 60
    session = { ...session, remaining: duration, totalDuration: duration }
    syncActiveModeTab(newMode)
    updateDisplay(session, config)
    saveSession({ ...session, savedAt: Date.now(), savedDate: new Date().toDateString() })
  })
})

document.querySelectorAll<HTMLButtonElement>('.counter-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (session.running) return
    const action = btn.getAttribute('data-action')
    const target = btn.getAttribute('data-target')

    if (target === 'session-pomodoros') {
      config = {
        ...config,
        sessionTarget:
          action === 'inc'
            ? Math.min(20, config.sessionTarget + 1)
            : Math.max(1, config.sessionTarget - 1),
      }
    } else if (target === 'focus-duration') {
      config = {
        ...config,
        focusDuration:
          action === 'inc'
            ? Math.min(90, config.focusDuration + 1)
            : Math.max(1, config.focusDuration - 1),
      }
      if (session.mode === 'focus') {
        const d = config.focusDuration * 60
        session = { ...session, remaining: d, totalDuration: d }
      }
    } else if (target === 'break-duration') {
      config = {
        ...config,
        breakDuration:
          action === 'inc'
            ? Math.min(30, config.breakDuration + 1)
            : Math.max(1, config.breakDuration - 1),
      }
      if (session.mode === 'break') {
        const d = config.breakDuration * 60
        session = { ...session, remaining: d, totalDuration: d }
      }
    } else if (target === 'long-break-duration') {
      config = {
        ...config,
        longBreakDuration:
          action === 'inc'
            ? Math.min(60, config.longBreakDuration + 1)
            : Math.max(5, config.longBreakDuration - 1),
      }
      if (session.mode === 'longBreak') {
        const d = config.longBreakDuration * 60
        session = { ...session, remaining: d, totalDuration: d }
      }
    }

    updateDisplay(session, config)
    saveConfig(config)
    saveSession({ ...session, savedAt: Date.now(), savedDate: new Date().toDateString() })
  })
})

document.getElementById('btn-settings-toggle')?.addEventListener('click', () => {
  const configPanel = document.getElementById('config-panel')
  const btn = document.getElementById('btn-settings-toggle')
  if (!configPanel || !btn) return
  const isHidden = configPanel.hasAttribute('hidden')
  if (isHidden) {
    configPanel.removeAttribute('hidden')
    btn.setAttribute('aria-expanded', 'true')
  } else {
    configPanel.setAttribute('hidden', '')
    btn.setAttribute('aria-expanded', 'false')
  }
})

window.addEventListener('beforeunload', () => {
  saveSession({ ...session, lastTickAt: session.running ? Date.now() : null, savedAt: Date.now(), savedDate: new Date().toDateString() })
})

// ── Init ──────────────────────────────────────────────────────

syncActiveModeTab(session.mode)
updateDisplay(session, config)

if (session.running) {
  timerInterval = setInterval(doTick, 1000)
}
