// TypeScript mirrors of the backend DTOs (ResourceManager.Api/DTO).
// Enums travel as strings (JsonStringEnumConverter on the backend).

export const USER_ROLES = ['Student', 'Faculty', 'Staff', 'ClubPresident', 'Admin'] as const
export type UserRole = (typeof USER_ROLES)[number]

export const GENDERS = ['Male', 'Female'] as const
export type Gender = (typeof GENDERS)[number]

export const ALLOWED_GENDERS = ['Male', 'Female', 'Any'] as const
export type AllowedGender = (typeof ALLOWED_GENDERS)[number]

export const ALLOWED_ROLES = ['Any', 'Faculty', 'Staff', 'ClubPresident', 'Student', 'Admin'] as const
export type AllowedRole = (typeof ALLOWED_ROLES)[number]

export const FACILITY_TYPES = ['Classroom', 'Laboratory', 'SwimmingPool', 'SportsCourt', 'Gym', 'Other'] as const
export type FacilityType = (typeof FACILITY_TYPES)[number]

export const RESERVATION_STATUSES = ['Pending', 'Confirmed', 'Cancelled'] as const
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number]

// ---------- Users ----------

export interface UserRequest {
  kfupmId: string
  name: string
  email: string
  role: UserRole
  gender: Gender
}

export interface UserResponse extends UserRequest {
  id: string
}

// ---------- Facilities ----------

export interface FacilityRequest {
  facilityId: string
  name: string
  type: FacilityType
  allowedGender: AllowedGender
  allowedRole: AllowedRole
}

export interface FacilityResponse extends FacilityRequest {
  id: string
}

// ---------- Reservations ----------

export interface CreateReservationRequest {
  startTime: string
  endTime: string
  reason: string
  targetParticipantCount: number
  facilityId: string
  userId: string
}

export interface UpdateReservationRequest {
  startTime: string
  endTime: string
  reason: string
  targetParticipantCount: number
  status: ReservationStatus
}

export interface ReservationResponse {
  id: string
  reservationId: string
  startTime: string
  endTime: string
  reason: string
  status: ReservationStatus
  targetParticipantCount: number
  facilityId: string
  facilityRef: string
  facilityName: string
  userId: string
  userName: string
}

// ---------- Event participants ----------

export interface CreateEventParticipantRequest {
  userId: string
  reservationId: string
}

export interface EventParticipantResponse {
  id: string
  userId: string
  userName: string
  userKfupmId: string
  reservationId: string
  reservationRef: string
  reservationReason: string
}
