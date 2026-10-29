import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '@/api/client'
import { AUTH_STORAGE_KEY } from '@/lib/authStorage'
import { storeAuth } from '@/test/auth'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

function sentHeaders(): Record<string, string> {
  return (fetchMock.mock.calls[0][1]?.headers ?? {}) as Record<string, string>
}

describe('api client', () => {
  it('attaches the bearer token when one is stored', async () => {
    storeAuth()
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }))

    await api.get('/api/facilities')

    expect(sentHeaders().Authorization).toBe('Bearer test-token')
  })

  it('sends no Authorization header when logged out', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }))

    await api.post('/api/auth/login', { kfupmId: 'x', password: 'y' })

    expect(sentHeaders()).not.toHaveProperty('Authorization')
    expect(sentHeaders()['Content-Type']).toBe('application/json')
  })

  it('clears the stored session on a 401 and still throws', async () => {
    storeAuth()
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ title: 'Unauthorized' }), { status: 401 }),
    )

    const error = await api.delete('/api/reservations/1').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(401)
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
  })

  it('keeps the stored session on other errors', async () => {
    storeAuth()
    fetchMock.mockResolvedValue(new Response('{}', { status: 403 }))

    await expect(api.delete('/api/reservations/1')).rejects.toBeInstanceOf(ApiError)
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull()
  })
})
