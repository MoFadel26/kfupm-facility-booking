import type {
  FacilityRequest,
  LoginRequest,
  RegisterRequest,
  ReservationStatus,
  UserRequest,
} from '@/types/api'

type UserFields = Pick<UserRequest, 'kfupmId' | 'name' | 'email'>

export function validateUser(form: UserFields): Partial<Record<keyof UserFields, string>> {
  const errors: Partial<Record<keyof UserFields, string>> = {}
  if (!form.kfupmId.trim()) errors.kfupmId = 'KFUPM ID is required.'
  else if (form.kfupmId.length > 20) errors.kfupmId = 'At most 20 characters.'
  if (!form.name.trim()) errors.name = 'Name is required.'
  else if (form.name.length > 100) errors.name = 'At most 100 characters.'
  if (!form.email.trim()) errors.email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email.'
  else if (form.email.length > 150) errors.email = 'At most 150 characters.'
  return errors
}

export function validateLogin(form: LoginRequest): Partial<Record<keyof LoginRequest, string>> {
  const errors: Partial<Record<keyof LoginRequest, string>> = {}
  if (!form.kfupmId.trim()) errors.kfupmId = 'KFUPM ID is required.'
  if (!form.password) errors.password = 'Password is required.'
  return errors
}

export function validateRegister(form: RegisterRequest): Partial<Record<keyof RegisterRequest, string>> {
  const errors: Partial<Record<keyof RegisterRequest, string>> = validateUser(form)
  if (form.password.length < 8) errors.password = 'At least 8 characters.'
  else if (form.password.length > 128) errors.password = 'At most 128 characters.'
  return errors
}

export function validateFacility(form: FacilityRequest): Partial<Record<keyof FacilityRequest, string>> {
  const errors: Partial<Record<keyof FacilityRequest, string>> = {}
  if (!form.facilityId.trim()) errors.facilityId = 'Facility ID is required.'
  else if (form.facilityId.length > 20) errors.facilityId = 'At most 20 characters.'
  if (!form.name.trim()) errors.name = 'Name is required.'
  else if (form.name.length > 50) errors.name = 'At most 50 characters.'
  return errors
}

export interface ReservationFormState {
  startTime: string
  endTime: string
  reason: string
  targetParticipantCount: string
  facilityId: string
  status: ReservationStatus
}

export function validateReservation(form: ReservationFormState, isEdit: boolean): Partial<Record<keyof ReservationFormState, string>> {
  const errors: Partial<Record<keyof ReservationFormState, string>> = {}
  if (!isEdit && !form.facilityId) errors.facilityId = 'Select a facility.'
  if (!form.startTime) errors.startTime = 'Start time is required.'
  if (!form.endTime) errors.endTime = 'End time is required.'
  if (form.startTime && form.endTime && form.startTime >= form.endTime) {
    errors.endTime = 'End time must be after start time.'
  }
  const count = Number(form.targetParticipantCount)
  if (!form.targetParticipantCount || isNaN(count) || count < 1) {
    errors.targetParticipantCount = 'Must be at least 1.'
  }
  if (!form.reason.trim()) errors.reason = 'Enter the purpose of the booking.'
  else if (form.reason.length > 200) errors.reason = 'At most 200 characters.'
  return errors
}
