import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'

describe('App routing', () => {
  it('renders the not-found page for an unknown route', () => {
    render(
      <MemoryRouter initialEntries={['/foo']}>
        <App />
      </MemoryRouter>,
    )

    screen.getByRole('heading', { name: 'Page not found' })
    screen.getByText('/foo')
    expect(screen.getByRole('link', { name: /back to overview/i }).getAttribute('href')).toBe('/')
  })
})
