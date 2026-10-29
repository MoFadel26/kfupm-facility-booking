import type { AuthResponse } from '@/types/api'

export const AUTH_STORAGE_KEY = 'kfupm-auth'

const listeners = new Set<() => void>()

/** The stored session, or null when there is none, it is unreadable, or it has expired. */
export function getStoredAuth(): AuthResponse | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return null
  try {
    const auth = JSON.parse(raw) as AuthResponse
    if (!auth.token || !(Date.parse(auth.expiresAt) > Date.now())) return null
    return auth
  } catch {
    return null
  }
}

export function setStoredAuth(auth: AuthResponse) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth))
  listeners.forEach((listener) => listener())
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  listeners.forEach((listener) => listener())
}

/** Runs `listener` whenever the stored session is set or cleared. Returns the unsubscribe. */
export function onAuthChange(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
