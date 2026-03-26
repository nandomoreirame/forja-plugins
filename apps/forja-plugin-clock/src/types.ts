export type ClockTheme = 'flip' | 'digital' | 'minimal'
export type ClockFont = 'bebas-neue' | 'orbitron' | 'jetbrains-mono' | 'inter'
export type ClockFormat = '24h' | '12h'

export interface ClockConfig {
  theme: ClockTheme
  font: ClockFont
  format: ClockFormat
  showSeconds: boolean
}

export interface TimeDigits {
  h1: string
  h2: string
  m1: string
  m2: string
  s1: string
  s2: string
  ampm: string
}

export const DEFAULT_CONFIG: ClockConfig = {
  theme: 'flip',
  font: 'bebas-neue',
  format: '24h',
  showSeconds: true,
}
