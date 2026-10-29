import { describe, expect, it } from 'vitest'
import { AUTH_STORAGE_KEY, getStoredAuth } from '@/lib/authStorage'
import { storeAuth, testAuth } from '@/test/auth'

describe('getStoredAuth', () => {
  it('returns a stored session that has not expired', () => {
    storeAuth()
    expect(getStoredAuth()?.token).toBe('test-token')
  })

  it('treats an expired session as logged out', () => {
    storeAuth(testAuth({ expiresAt: new Date(Date.now() - 1000).toISOString() }))
    expect(getStoredAuth()).toBeNull()
  })

  it('treats a missing or unreadable session as logged out', () => {
    expect(getStoredAuth()).toBeNull()
    localStorage.setItem(AUTH_STORAGE_KEY, 'not json')
    expect(getStoredAuth()).toBeNull()
  })
})
