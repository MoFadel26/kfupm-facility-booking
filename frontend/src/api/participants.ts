import { api } from './client'
import type { CreateEventParticipantRequest, EventParticipantResponse } from '@/types/api'

export function listParticipants(filter?: { userId?: string; reservationId?: string }) {
  const params = new URLSearchParams()
  if (filter?.userId) params.set('userId', filter.userId)
  if (filter?.reservationId) params.set('reservationId', filter.reservationId)
  const query = params.toString()
  return api.get<EventParticipantResponse[]>(`/api/eventparticipants${query ? `?${query}` : ''}`)
}

export const getParticipant = (id: string) =>
  api.get<EventParticipantResponse>(`/api/eventparticipants/${id}`)
export const createParticipant = (request: CreateEventParticipantRequest) =>
  api.post<EventParticipantResponse>('/api/eventparticipants', request)
export const deleteParticipant = (id: string) => api.delete(`/api/eventparticipants/${id}`)
