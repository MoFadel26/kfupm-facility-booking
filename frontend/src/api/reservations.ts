import { api } from './client'
import { fetchAllPages, pageQuery, withQuery } from './paging'
import type {
  CreateReservationRequest,
  PageParams,
  PagedResult,
  ReservationResponse,
  UpdateReservationRequest,
} from '@/types/api'

export interface ReservationFilter extends PageParams {
  userId?: string
  facilityId?: string
}

export function listReservations(filter?: ReservationFilter) {
  const params = new URLSearchParams()
  // Both filters apply together; the API no longer drops the second.
  if (filter?.userId) params.set('userId', filter.userId)
  if (filter?.facilityId) params.set('facilityId', filter.facilityId)
  return api.get<PagedResult<ReservationResponse>>(
    withQuery('/api/reservations', pageQuery(filter, params)),
  )
}

/** Every reservation matching the filter, for select options and dashboard totals. */
export const listAllReservations = (filter?: Omit<ReservationFilter, keyof PageParams>) =>
  fetchAllPages((params) => listReservations({ ...filter, ...params }))

export const getReservation = (id: string) =>
  api.get<ReservationResponse>(`/api/reservations/${id}`)
export const createReservation = (request: CreateReservationRequest) =>
  api.post<ReservationResponse>('/api/reservations', request)
export const updateReservation = (id: string, request: UpdateReservationRequest) =>
  api.put<ReservationResponse>(`/api/reservations/${id}`, request)
export const deleteReservation = (id: string) => api.delete(`/api/reservations/${id}`)
