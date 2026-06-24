import { describe, it, expect, beforeEach } from 'vitest'
import {
  getToken,
  setToken,
  clearToken,
  getSimulateToken,
  setSimulateToken,
  clearSimulateToken,
  clearAllTokens,
  getAuthToken,
  SIMULATE_COOKIE,
} from './token'

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/`
}

function clearAllCookies() {
  document.cookie.split(';').forEach((c) => {
    const eq = c.indexOf('=')
    const name = eq > -1 ? c.slice(0, eq).trim() : c.trim()
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  })
}

describe('token utils', () => {
  beforeEach(() => {
    clearAllCookies()
  })

  describe('getToken / setToken / clearToken', () => {
    it('returns null when no token cookie', () => {
      expect(getToken()).toBeNull()
    })

    it('setToken writes token cookie', () => {
      setToken('abc123')
      expect(document.cookie).toContain('token=')
      expect(getToken()).toBe('abc123')
    })

    it('clearToken removes token cookie', () => {
      setToken('abc123')
      clearToken()
      expect(getToken()).toBeNull()
    })

    it('round-trips URL-unsafe token (with space)', () => {
      setToken('abc 123')
      expect(getToken()).toBe('abc 123')
    })
  })

  describe('simulate token', () => {
    it('SIMULATE_COOKIE is user_token', () => {
      expect(SIMULATE_COOKIE).toBe('user_token')
    })

    it('getSimulateToken returns null when no cookie', () => {
      expect(getSimulateToken()).toBeNull()
    })

    it('setSimulateToken writes user_token cookie, not token', () => {
      setSimulateToken('sim123')
      expect(getSimulateToken()).toBe('sim123')
      expect(getToken()).toBeNull()  // admin 的 token 不应被覆盖
    })

    it('clearSimulateToken removes user_token only', () => {
      setToken('admin123')
      setSimulateToken('sim123')
      clearSimulateToken()
      expect(getSimulateToken()).toBeNull()
      expect(getToken()).toBe('admin123')  // admin token 保留
    })
  })

  describe('clearAllTokens', () => {
    it('clears both token and simulate cookie', () => {
      setToken('admin')
      setSimulateToken('sim')
      clearAllTokens()
      expect(getToken()).toBeNull()
      expect(getSimulateToken()).toBeNull()
    })

    it('safe to call when no cookies exist', () => {
      expect(() => clearAllTokens()).not.toThrow()
    })
  })

  describe('getAuthToken', () => {
    it('returns bearer-prefixed token from token cookie by default', () => {
      setToken('maintoken')
      // pathname is / 默认
      expect(getAuthToken()).toBe('bearer%20maintoken')
    })

    it('returns null when no token and not on /main', () => {
      // jsdom 默认 pathname 是 /
      expect(getAuthToken()).toBeNull()
    })

    it('on /main path, prefers simulate token over normal token', () => {
      setToken('admin-token')
      setSimulateToken('user-token')
      // 改 pathname 到 /main
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...window.location, pathname: '/main' },
      })
      expect(getAuthToken()).toBe('bearer%20user-token')
      // 还原
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...window.location, pathname: '/' },
      })
    })

    it('on /simulate-login path, prefers simulate token', () => {
      setToken('admin-token')
      setSimulateToken('user-token')
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...window.location, pathname: '/simulate-login' },
      })
      expect(getAuthToken()).toBe('bearer%20user-token')
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...window.location, pathname: '/' },
      })
    })
  })
})
