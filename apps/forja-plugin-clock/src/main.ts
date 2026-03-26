import { getTimeDigits } from './clock'
import { loadConfig, saveConfig } from './config'
import {
  initRenderRefs,
  renderClock,
  renderTheme,
  renderFont,
  renderShowSeconds,
} from './render'
import type { ClockTheme, ClockFont, ClockFormat } from './types'

// --- Load persisted config ---
const state = loadConfig()

// --- Init DOM refs ---
initRenderRefs()

// --- Selectors ---
const configPanel = document.getElementById('config-panel')!
const btnSettingsToggle = document.getElementById('btn-settings-toggle')!
const btnShowSeconds = document.getElementById('btn-show-seconds')!
const themeBtns = document.querySelectorAll<HTMLButtonElement>('.theme-btn')
const fontBtns = document.querySelectorAll<HTMLButtonElement>('.font-btn')
const formatBtns = document.querySelectorAll<HTMLButtonElement>('.format-btn')

// --- Update cycle ---
function tick(): void {
  const digits = getTimeDigits(new Date(), state.format, state.showSeconds)
  renderClock(state.theme, digits, state.showSeconds, state.format)
}

// --- Settings handlers ---
function setTheme(theme: ClockTheme): void {
  state.theme = theme
  renderTheme(theme)
  themeBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-theme') === theme)
  })
  saveConfig(state)
  tick()
}

function setFont(font: ClockFont): void {
  state.font = font
  renderFont(font)
  fontBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-font') === font)
  })
  saveConfig(state)
}

function setFormat(format: ClockFormat): void {
  state.format = format
  formatBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-format') === format)
  })
  saveConfig(state)
  tick()
}

function setShowSeconds(show: boolean): void {
  state.showSeconds = show
  btnShowSeconds.setAttribute('aria-pressed', show ? 'true' : 'false')
  renderShowSeconds(show)
  saveConfig(state)
  tick()
}

// --- Event listeners ---
themeBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    setTheme(btn.getAttribute('data-theme') as ClockTheme)
  })
})

fontBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    setFont(btn.getAttribute('data-font') as ClockFont)
  })
})

formatBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    setFormat(btn.getAttribute('data-format') as ClockFormat)
  })
})

btnShowSeconds.addEventListener('click', () => {
  setShowSeconds(!state.showSeconds)
})

btnSettingsToggle.addEventListener('click', () => {
  const isHidden = configPanel.hasAttribute('hidden')
  if (isHidden) {
    configPanel.removeAttribute('hidden')
    btnSettingsToggle.setAttribute('aria-expanded', 'true')
  } else {
    configPanel.setAttribute('hidden', '')
    btnSettingsToggle.setAttribute('aria-expanded', 'false')
  }
})

// --- Init ---
setTheme(state.theme)
setFont(state.font)
setFormat(state.format)
setShowSeconds(state.showSeconds)

// Start ticking
tick()
setInterval(tick, 1000)
