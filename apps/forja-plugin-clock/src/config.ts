import { loadStorage, saveStorage } from '@forja/sdk'
import type { ClockConfig } from './types'
import { DEFAULT_CONFIG } from './types'

const STORAGE_KEY = 'clock:config'

/**
 * Loads the clock config from storage.
 * Returns a copy of DEFAULT_CONFIG if nothing is stored.
 */
export function loadConfig(): ClockConfig {
  return loadStorage<ClockConfig>(STORAGE_KEY) ?? { ...DEFAULT_CONFIG }
}

/**
 * Persists the clock config to storage.
 */
export function saveConfig(config: ClockConfig): void {
  saveStorage(STORAGE_KEY, config)
}
