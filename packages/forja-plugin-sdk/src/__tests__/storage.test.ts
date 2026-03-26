import { describe, it, expect, beforeEach } from 'vitest'
import { loadStorage, saveStorage, clearStorage } from '../storage'

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('saveStorage', () => {
    it('saves a value to localStorage as JSON', () => {
      saveStorage('test-key', { foo: 'bar' })
      expect(localStorage.getItem('test-key')).toBe('{"foo":"bar"}')
    })
  })

  describe('loadStorage', () => {
    it('returns parsed JSON from localStorage', () => {
      localStorage.setItem('test-key', '{"foo":"bar"}')
      expect(loadStorage('test-key')).toEqual({ foo: 'bar' })
    })

    it('returns null when key does not exist', () => {
      expect(loadStorage('nonexistent')).toBeNull()
    })

    it('returns null when stored value is invalid JSON', () => {
      localStorage.setItem('bad', 'not-json')
      expect(loadStorage('bad')).toBeNull()
    })
  })

  describe('clearStorage', () => {
    it('removes the key from localStorage', () => {
      localStorage.setItem('test-key', '"value"')
      clearStorage('test-key')
      expect(localStorage.getItem('test-key')).toBeNull()
    })
  })
})
