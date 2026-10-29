import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'
import { AuthProvider } from '@/auth/AuthProvider'
import { storeAuth, testAuth } from '@/test/auth'

function renderApp(path: string) {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('App routing', () => {
  it('renders the not-found page for an unknown route', () => {
    renderApp('/foo')

    screen.getByRole('heading', { name: 'Page not found' })
    screen.getByText('/foo')
    expect(screen.getByRole('link', { name: /back to overview/i }).getAttribute('href')).toBe('/')
  })
})

describe('App account controls', () => {
  it('shows the logged-in user and a Log out action', () => {
    storeAuth()
    renderApp('/foo')

    screen.getByText('Ali Hassan')
    screen.getByRole('button', { name: /log out/i })
    expect(screen.queryByRole('link', { name: /log in/i })).toBeNull()
  })

  it('shows Log in when the stored session has expired', () => {
    storeAuth(testAuth({ expiresAt: new Date(Date.now() - 1000).toISOString() }))
    renderApp('/foo')

    expect(screen.getByRole('link', { name: /log in/i }).getAttribute('href')).toBe('/login')
    expect(screen.queryByText('Ali Hassan')).toBeNull()
  })
})
