import { api } from './client'
import type { AuthResponse, LoginRequest, RegisterRequest, UserResponse } from '@/types/api'

export const login = (request: LoginRequest) => api.post<AuthResponse>('/api/auth/login', request)
export const register = (request: RegisterRequest) =>
  api.post<AuthResponse>('/api/auth/register', request)
export const me = () => api.get<UserResponse>('/api/auth/me')
