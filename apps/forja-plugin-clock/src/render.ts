import type { ClockTheme, ClockFont, TimeDigits } from './types'

// DOM references cached on init
let flipCards: Record<string, HTMLElement> = {}
let digitalTime: HTMLElement | null = null
let minimalTime: HTMLElement | null = null
let ampmLabels: Record<string, HTMLElement> = {}
let clockViews: Record<string, HTMLElement> = {}
let flipSecondsContainer: HTMLElement | null = null

/**
 * Initialise all DOM references. Must be called after DOM is ready.
 */
export function initRenderRefs(): void {
  flipCards = {
    h1: document.getElementById('flip-h1')!,
    h2: document.getElementById('flip-h2')!,
    m1: document.getElementById('flip-m1')!,
    m2: document.getElementById('flip-m2')!,
    s1: document.getElementById('flip-s1')!,
    s2: document.getElementById('flip-s2')!,
  }

  digitalTime = document.getElementById('digital-time')
  minimalTime = document.getElementById('minimal-time')

  ampmLabels = {
    flip: document.getElementById('ampm-flip')!,
    digital: document.getElementById('ampm-digital')!,
    minimal: document.getElementById('ampm-minimal')!,
  }

  clockViews = {
    flip: document.getElementById('clock-flip')!,
    digital: document.getElementById('clock-digital')!,
    minimal: document.getElementById('clock-minimal')!,
  }

  const clockFlip = document.getElementById('clock-flip')
  flipSecondsContainer = clockFlip ? clockFlip.querySelector('.clock-container') : null
}

/**
 * Animate a single flip card digit when the value changes.
 */
function flipDigit(card: HTMLElement, newValue: string): void {
  const current = card.getAttribute('data-value')
  if (current === newValue) return

  card.setAttribute('data-value', newValue)
  const digits = card.querySelectorAll<HTMLElement>('.digit')
  digits.forEach((d) => { d.textContent = newValue })

  card.classList.remove('flipping')
  void card.offsetWidth // force reflow to restart CSS animation
  card.classList.add('flipping')
}

/**
 * Render the current time digits to the active clock theme.
 */
export function renderClock(theme: ClockTheme, digits: TimeDigits, showSeconds: boolean, format: string): void {
  if (theme === 'flip') {
    flipDigit(flipCards.h1, digits.h1)
    flipDigit(flipCards.h2, digits.h2)
    flipDigit(flipCards.m1, digits.m1)
    flipDigit(flipCards.m2, digits.m2)
    flipDigit(flipCards.s1, digits.s1 || '0')
    flipDigit(flipCards.s2, digits.s2 || '0')
  }

  if (theme === 'digital' && digitalTime) {
    let timeStr = `${digits.h1}${digits.h2}:${digits.m1}${digits.m2}`
    if (showSeconds) timeStr += `:${digits.s1}${digits.s2}`
    digitalTime.textContent = timeStr
  }

  if (theme === 'minimal' && minimalTime) {
    let minStr = `${digits.h1}${digits.h2}:${digits.m1}${digits.m2}`
    if (showSeconds) minStr += `:${digits.s1}${digits.s2}`
    minimalTime.textContent = minStr
  }

  // Update AM/PM labels
  const keys: Array<'flip' | 'digital' | 'minimal'> = ['flip', 'digital', 'minimal']
  for (const key of keys) {
    const label = ampmLabels[key]
    if (!label) continue
    if (format === '12h' && digits.ampm) {
      label.textContent = digits.ampm
      label.removeAttribute('hidden')
    } else {
      label.setAttribute('hidden', '')
    }
  }
}

/**
 * Switch visible clock theme view.
 */
export function renderTheme(theme: ClockTheme): void {
  const keys: ClockTheme[] = ['flip', 'digital', 'minimal']
  for (const key of keys) {
    const view = clockViews[key]
    if (!view) continue
    if (key === theme) {
      view.removeAttribute('hidden')
    } else {
      view.setAttribute('hidden', '')
    }
  }
}

/**
 * Apply a font class to all clock views.
 */
export function renderFont(font: ClockFont): void {
  const allViews = document.querySelectorAll<HTMLElement>('.clock-view')
  const fontClasses = ['font-bebas-neue', 'font-orbitron', 'font-jetbrains-mono', 'font-inter']

  allViews.forEach((view) => {
    fontClasses.forEach((cls) => view.classList.remove(cls))
    view.classList.add(`font-${font}`)
  })
}

/**
 * Toggle seconds visibility in the flip clock.
 */
export function renderShowSeconds(showSeconds: boolean): void {
  if (!flipSecondsContainer) return
  if (showSeconds) {
    flipSecondsContainer.classList.remove('seconds-hidden')
  } else {
    flipSecondsContainer.classList.add('seconds-hidden')
  }
}
