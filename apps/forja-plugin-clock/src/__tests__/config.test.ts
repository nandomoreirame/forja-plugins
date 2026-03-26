import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadConfig, saveConfig } from '../config'
import type { ClockConfig } from '../types'
import { DEFAULT_CONFIG } from '../types'

// Mock the SDK storage functions
vi.mock('@forja/sdk', () => ({
  loadStorage: vi.fn(),
  saveStorage: vi.fn(),
}))

import { loadStorage, saveStorage } from '@forja/sdk'

describe('loadConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns default config when nothing is stored', () => {
    vi.mocked(loadStorage).mockReturnValue(null)

    const result = loadConfig()

    expect(result).toEqual(DEFAULT_CONFIG)
  })

  it('returns stored config when it exists', () => {
    const stored: ClockConfig = {
      theme: 'digital',
      font: 'orbitron',
      format: '12h',
      showSeconds: false,
    }
    vi.mocked(loadStorage).mockReturnValue(stored)

    const result = loadConfig()

    expect(result).toEqual(stored)
  })

  it('calls loadStorage with the correct key', () => {
    vi.mocked(loadStorage).mockReturnValue(null)

    loadConfig()

    expect(loadStorage).toHaveBeenCalledWith('clock:config')
  })

  it('handles corrupted storage gracefully by returning default config', () => {
    vi.mocked(loadStorage).mockReturnValue(null)

    const result = loadConfig()

    expect(result).toEqual(DEFAULT_CONFIG)
    expect(result.theme).toBe('flip')
    expect(result.format).toBe('24h')
    expect(result.showSeconds).toBe(true)
  })

  it('returns a copy of DEFAULT_CONFIG, not a reference', () => {
    vi.mocked(loadStorage).mockReturnValue(null)

    const result1 = loadConfig()
    const result2 = loadConfig()

    result1.theme = 'digital'

    expect(result2.theme).toBe('flip')
  })
})

describe('saveConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls saveStorage with the correct key and config', () => {
    const config: ClockConfig = {
      theme: 'minimal',
      font: 'inter',
      format: '12h',
      showSeconds: true,
    }

    saveConfig(config)

    expect(saveStorage).toHaveBeenCalledWith('clock:config', config)
  })

  it('calls saveStorage once per call', () => {
    const config: ClockConfig = {
      theme: 'flip',
      font: 'bebas-neue',
      format: '24h',
      showSeconds: false,
    }

    saveConfig(config)

    expect(saveStorage).toHaveBeenCalledTimes(1)
  })
})
