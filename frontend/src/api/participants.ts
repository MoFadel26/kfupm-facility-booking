import { api } from './client'
import { pageQuery, withQuery } from './paging'
import type {
  CreateEventParticipantRequest,
  EventParticipantResponse,
  PageParams,
  PagedResult,
} from '@/types/api'

export interface ParticipantFilter extends PageParams {
  userId?: string
  reservationId?: string
}

export function listParticipants(filter?: ParticipantFilter) {
  const params = new URLSearchParams()
  if (filter?.userId) params.set('userId', filter.userId)
  if (filter?.reservationId) params.set('reservationId', filter.reservationId)
  return api.get<PagedResult<EventParticipantResponse>>(
    withQuery('/api/eventparticipants', pageQuery(filter, params)),
  )
}

export const getParticipant = (id: string) =>
  api.get<EventParticipantResponse>(`/api/eventparticipants/${id}`)
export const createParticipant = (request: CreateEventParticipantRequest) =>
  api.post<EventParticipantResponse>('/api/eventparticipants', request)
export const deleteParticipant = (id: string) => api.delete(`/api/eventparticipants/${id}`)
