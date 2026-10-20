import { describe, expect, it } from 'vitest'
import {
  validateFacility,
  validateReservation,
  validateUser,
  type ReservationFormState,
} from '@/lib/validation'
import type { FacilityRequest, UserRequest } from '@/types/api'

describe('validateUser', () => {
  const valid: UserRequest = {
    kfupmId: 's202012345',
    name: 'Ali Hassan',
    email: 'ali@kfupm.edu.sa',
    role: 'Student',
    gender: 'Male',
  }

  it('accepts a valid user', () => {
    expect(validateUser(valid)).toEqual({})
  })

  it('requires every text field', () => {
    expect(validateUser({ ...valid, kfupmId: ' ', name: '', email: '' })).toEqual({
      kfupmId: 'KFUPM ID is required.',
      name: 'Name is required.',
      email: 'Email is required.',
    })
  })

  it('enforces length limits', () => {
    const errors = validateUser({
      ...valid,
      kfupmId: 'x'.repeat(21),
      name: 'x'.repeat(101),
      email: `${'x'.repeat(150)}@kfupm.edu.sa`,
    })
    expect(errors).toEqual({
      kfupmId: 'At most 20 characters.',
      name: 'At most 100 characters.',
      email: 'At most 150 characters.',
    })
  })

  it('rejects a malformed email', () => {
    expect(validateUser({ ...valid, email: 'ali@kfupm' }).email).toBe('Enter a valid email.')
    expect(validateUser({ ...valid, email: 'ali kfupm.edu.sa' }).email).toBe('Enter a valid email.')
  })
})

describe('validateFacility', () => {
  const valid: FacilityRequest = {
    facilityId: 'B22-101',
    name: 'Lecture Hall',
    type: 'Classroom',
    allowedGender: 'Any',
    allowedRole: 'Any',
  }

  it('accepts a valid facility', () => {
    expect(validateFacility(valid)).toEqual({})
  })

  it('requires ID and name', () => {
    expect(validateFacility({ ...valid, facilityId: '', name: '  ' })).toEqual({
      facilityId: 'Facility ID is required.',
      name: 'Name is required.',
    })
  })

  it('enforces length limits', () => {
    expect(validateFacility({ ...valid, facilityId: 'x'.repeat(21), name: 'x'.repeat(51) })).toEqual({
      facilityId: 'At most 20 characters.',
      name: 'At most 50 characters.',
    })
  })
})

describe('validateReservation', () => {
  const valid: ReservationFormState = {
    startTime: '2026-07-10T10:00',
    endTime: '2026-07-10T12:00',
    reason: 'Study group',
    targetParticipantCount: '4',
    facilityId: 'f1',
    userId: 'u1',
    status: 'Pending',
  }

  it('accepts a valid reservation', () => {
    expect(validateReservation(valid, false)).toEqual({})
  })

  it('requires facility and user only when creating', () => {
    const form = { ...valid, facilityId: '', userId: '' }
    expect(validateReservation(form, false)).toEqual({
      facilityId: 'Select a facility.',
      userId: 'Select a user.',
    })
    expect(validateReservation(form, true)).toEqual({})
  })

  it('requires start and end times', () => {
    expect(validateReservation({ ...valid, startTime: '', endTime: '' }, false)).toEqual({
      startTime: 'Start time is required.',
      endTime: 'End time is required.',
    })
  })

  it('rejects an end time that is not after the start time', () => {
    const message = 'End time must be after start time.'
    expect(validateReservation({ ...valid, endTime: valid.startTime }, false).endTime).toBe(message)
    expect(validateReservation({ ...valid, endTime: '2026-07-10T09:00' }, false).endTime).toBe(message)
  })

  it('requires at least one participant', () => {
    for (const count of ['', '0', '-1', 'abc']) {
      expect(validateReservation({ ...valid, targetParticipantCount: count }, false).targetParticipantCount)
        .toBe('Must be at least 1.')
    }
  })

  it('requires a reason of at most 200 characters', () => {
    expect(validateReservation({ ...valid, reason: '   ' }, false).reason).toBe('Enter the purpose of the booking.')
    expect(validateReservation({ ...valid, reason: 'x'.repeat(201) }, false).reason).toBe('At most 200 characters.')
    expect(validateReservation({ ...valid, reason: 'x'.repeat(200) }, false)).toEqual({})
  })
})
