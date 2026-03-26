/**
 * Loads a value from localStorage by key.
 * Returns null if the key does not exist or if the stored value is invalid JSON.
 */
export function loadStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/**
 * Saves a value to localStorage as a JSON string.
 */
export function saveStorage<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

/**
 * Removes a key from localStorage.
 */
export function clearStorage(key: string): void {
  localStorage.removeItem(key)
}
