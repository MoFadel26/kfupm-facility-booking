import { useEffect, useMemo, useState, type ReactNode } from 'react'
import * as authApi from '@/api/auth'
import { clearStoredAuth, getStoredAuth, onAuthChange, setStoredAuth } from '@/lib/authStorage'
import { AuthContext, type AuthContextValue } from './useAuth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState(getStoredAuth)

  // Follows the store, so a 401 cleared by the API client logs the UI out too.
  useEffect(() => onAuthChange(() => setAuth(getStoredAuth())), [])

  // Log out when the token expires while the app is open.
  useEffect(() => {
    if (!auth) return
    const timer = setTimeout(clearStoredAuth, Date.parse(auth.expiresAt) - Date.now())
    return () => clearTimeout(timer)
  }, [auth])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: auth?.user ?? null,
      isAdmin: auth?.user.role === 'Admin',
      login: async (request) => setStoredAuth(await authApi.login(request)),
      register: async (request) => setStoredAuth(await authApi.register(request)),
      logout: clearStoredAuth,
    }),
    [auth],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
