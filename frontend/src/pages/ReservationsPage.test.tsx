import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthProvider'
import { returnPath } from '@/auth/useAuth'
import { createReservation } from '@/api/reservations'
import { ReservationsPage } from '@/pages/ReservationsPage'
import { storeAuth } from '@/test/auth'
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

function LoginProbe() {
  const { state } = useLocation()
  return <p>Login page, back to {returnPath(state)}</p>
}

function renderAt(path: string) {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/reservations" element={<ReservationsPage />} />
          <Route path="/login" element={<LoginProbe />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('ReservationsPage', () => {
  it('opens the booking form when linked from a facility', async () => {
    storeAuth()
    renderAt(`/reservations?facilityId=${facility.id}`)

    expect(await screen.findByRole('heading', { name: 'New reservation' })).toBeTruthy()
  })

  it('sends a logged-out user to /login from a facility link, to come back to it', async () => {
    renderAt(`/reservations?facilityId=${facility.id}`)

    await screen.findByText(`Login page, back to /reservations?facilityId=${facility.id}`)
  })

  it('sends a logged-out user to /login from New reservation', async () => {
    renderAt('/reservations')

    fireEvent.click(await screen.findByRole('button', { name: /new reservation/i }))

    await screen.findByText('Login page, back to /reservations')
  })

  it('does not open the form without a facility link', async () => {
    renderAt('/reservations')

    await screen.findByRole('heading', { name: 'Reservations' })
    expect(screen.queryByRole('heading', { name: 'New reservation' })).toBeNull()
  })

  it('books as the logged-in user: the request has no userId', async () => {
    storeAuth()
    vi.mocked(createReservation).mockResolvedValue({} as never)
    renderAt(`/reservations?facilityId=${facility.id}`)

    await screen.findByRole('heading', { name: 'New reservation' })
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '2026-07-10T10:00' } })
    fireEvent.change(screen.getByLabelText('End'), { target: { value: '2026-07-10T12:00' } })
    fireEvent.change(screen.getByLabelText('Purpose'), { target: { value: 'Study group' } })
    fireEvent.click(screen.getByRole('button', { name: 'Book' }))

    await waitFor(() => expect(createReservation).toHaveBeenCalledTimes(1))
    const request = vi.mocked(createReservation).mock.calls[0][0]
    expect(request).toMatchObject({ facilityId: facility.facilityId, reason: 'Study group' })
    expect(request).not.toHaveProperty('userId')
  })
})
