import { api } from './client'
import { fetchAllPages, pageQuery, withQuery } from './paging'
import type { PageParams, PagedResult, UserRequest, UserResponse } from '@/types/api'

export const listUsers = (params?: PageParams) =>
  api.get<PagedResult<UserResponse>>(withQuery('/api/users', pageQuery(params)))

/** Every user, for select options. */
export const listAllUsers = () => fetchAllPages(listUsers)
export const getUser = (id: string) => api.get<UserResponse>(`/api/users/${id}`)
export const createUser = (request: UserRequest) => api.post<UserResponse>('/api/users', request)
export const updateUser = (id: string, request: UserRequest) =>
  api.put<UserResponse>(`/api/users/${id}`, request)
export const deleteUser = (id: string) => api.delete(`/api/users/${id}`)
