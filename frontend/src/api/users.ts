import { api } from './client'
import type { UserRequest, UserResponse } from '@/types/api'

export const listUsers = () => api.get<UserResponse[]>('/api/users')
export const getUser = (id: string) => api.get<UserResponse>(`/api/users/${id}`)
export const createUser = (request: UserRequest) => api.post<UserResponse>('/api/users', request)
export const updateUser = (id: string, request: UserRequest) =>
  api.put<UserResponse>(`/api/users/${id}`, request)
export const deleteUser = (id: string) => api.delete(`/api/users/${id}`)
