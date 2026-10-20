import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ReservationsPage } from '@/pages/ReservationsPage'
import type { FacilityResponse } from '@/types/api'

const facility: FacilityResponse = {
  id: '39bc4b6e-2c05-42fd-a051-fd8d462bb30f',
  facilityId: 'F-B22-124',
  name: 'B22 - Room 124',
  type: 'Classroom',
  allowedGender: 'Any',
  allowedRole: 'Any',
}

vi.mock('@/api/facilities', () => ({ listAllFacilities: () => Promise.resolve([facility]) }))
vi.mock('@/api/users', () => ({ listAllUsers: () => Promise.resolve([]) }))
vi.mock('@/api/reservations', () => ({
  listReservations: () =>
    Promise.resolve({ items: [], page: 1, pageSize: 25, totalCount: 0, totalPages: 0 }),
  createReservation: vi.fn(),
  updateReservation: vi.fn(),
  deleteReservation: vi.fn(),
}))

describe('ReservationsPage', () => {
  it('opens the booking form when linked from a facility', async () => {
    render(
      <MemoryRouter initialEntries={[`/reservations?facilityId=${facility.id}`]}>
        <ReservationsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'New reservation' })).toBeTruthy()
  })

  it('does not open the form without a facility link', async () => {
    render(
      <MemoryRouter initialEntries={['/reservations']}>
        <ReservationsPage />
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'Reservations' })
    expect(screen.queryByRole('heading', { name: 'New reservation' })).toBeNull()
  })
})
