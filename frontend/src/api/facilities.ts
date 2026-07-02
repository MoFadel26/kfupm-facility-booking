import { api } from './client'
import type { FacilityRequest, FacilityResponse } from '@/types/api'

export const listFacilities = () => api.get<FacilityResponse[]>('/api/facilities')
export const getFacility = (id: string) => api.get<FacilityResponse>(`/api/facilities/${id}`)
export const createFacility = (request: FacilityRequest) =>
  api.post<FacilityResponse>('/api/facilities', request)
export const updateFacility = (id: string, request: FacilityRequest) =>
  api.put<FacilityResponse>(`/api/facilities/${id}`, request)
export const deleteFacility = (id: string) => api.delete(`/api/facilities/${id}`)
