import { api } from './client'
import { fetchAllPages, pageQuery, withQuery } from './paging'
import type { FacilityRequest, FacilityResponse, PageParams, PagedResult } from '@/types/api'

export const listFacilities = (params?: PageParams) =>
  api.get<PagedResult<FacilityResponse>>(withQuery('/api/facilities', pageQuery(params)))

/** Every facility, for select options. */
export const listAllFacilities = () => fetchAllPages(listFacilities)
export const getFacility = (id: string) => api.get<FacilityResponse>(`/api/facilities/${id}`)
export const createFacility = (request: FacilityRequest) =>
  api.post<FacilityResponse>('/api/facilities', request)
export const updateFacility = (id: string, request: FacilityRequest) =>
  api.put<FacilityResponse>(`/api/facilities/${id}`, request)
export const deleteFacility = (id: string) => api.delete(`/api/facilities/${id}`)
