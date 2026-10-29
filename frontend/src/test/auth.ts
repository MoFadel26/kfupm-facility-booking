import { AUTH_STORAGE_KEY } from '@/lib/authStorage'
import type { AuthResponse, UserResponse } from '@/types/api'

export const testUser: UserResponse = {
  id: '0b7e9f3c-6a51-4d1e-9a39-2f0e8d6c1a11',
  kfupmId: 's202012345',
  name: 'Ali Hassan',
  email: 'ali@kfupm.edu.sa',
  role: 'Student',
  gender: 'Male',
}

export function testAuth(overrides: Partial<AuthResponse> = {}): AuthResponse {
  return {
    token: 'test-token',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    user: testUser,
    ...overrides,
  }
}

/** Writes a session straight into localStorage, as a previous visit would have left it. */
export function storeAuth(auth: AuthResponse = testAuth()) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth))
}
