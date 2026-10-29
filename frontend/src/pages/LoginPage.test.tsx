import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthProvider'
import { login } from '@/api/auth'
import { AUTH_STORAGE_KEY } from '@/lib/authStorage'
import { LoginPage } from '@/pages/LoginPage'
import { testAuth } from '@/test/auth'

vi.mock('@/api/auth', () => ({ login: vi.fn(), register: vi.fn(), me: vi.fn() }))

describe('LoginPage', () => {
  it('logs in, stores the session and returns to the previous page', async () => {
    vi.mocked(login).mockResolvedValue(testAuth())

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: '/reservations' } }]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reservations" element={<p>Reservations page</p>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    )

    fireEvent.change(screen.getByLabelText('KFUPM ID'), { target: { value: 's202012345' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret-pass' } })
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    await screen.findByText('Reservations page')
    expect(login).toHaveBeenCalledWith({ kfupmId: 's202012345', password: 'secret-pass' })
    expect(JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)!).token).toBe('test-token')
  })

  it('does not submit an empty form', () => {
    vi.mocked(login).mockClear()
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    screen.getByText('KFUPM ID is required.')
    expect(login).not.toHaveBeenCalled()
  })
})
