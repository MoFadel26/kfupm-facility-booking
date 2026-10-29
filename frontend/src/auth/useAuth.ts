import { createContext, useContext } from 'react'
import type { LoginRequest, RegisterRequest, UserResponse } from '@/types/api'

export interface AuthContextValue {
  user: UserResponse | null
  isAdmin: boolean
  login: (request: LoginRequest) => Promise<void>
  register: (request: RegisterRequest) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>.')
  return value
}

/** Router state for a redirect to /login that brings the user back to `location` afterwards. */
export function returnTo(location: { pathname: string; search: string }) {
  return { from: `${location.pathname}${location.search}` }
}

/** Where to go after logging in: the page recorded by returnTo, or the overview. */
export function returnPath(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from
  return typeof from === 'string' && from.startsWith('/') ? from : '/'
}
