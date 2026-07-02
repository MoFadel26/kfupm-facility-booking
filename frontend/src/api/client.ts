const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5049'

/** RFC 7807 error thrown for any non-2xx response. `fieldErrors` carries
 *  ValidationProblemDetails.errors when the backend rejects a DTO. */
export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors?: Record<string, string[]>

  constructor(status: number, message: string, fieldErrors?: Record<string, string[]>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      ...options,
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the API — is the backend running?')
  }

  if (response.status === 204) return undefined as T
  if (response.ok) return (await response.json()) as T

  let message = `Request failed with status ${response.status}.`
  let fieldErrors: Record<string, string[]> | undefined
  try {
    const problem = (await response.json()) as {
      detail?: string
      title?: string
      errors?: Record<string, string[]>
    }
    message = problem.detail ?? problem.title ?? message
    fieldErrors = problem.errors
  } catch {
    // non-JSON error body; keep the generic message
  }
  throw new ApiError(response.status, message, fieldErrors)
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path: string) => request<void>(path, { method: 'DELETE' }),
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.fieldErrors) {
      const first = Object.values(error.fieldErrors).flat()[0]
      if (first) return first
    }
    return error.message
  }
  return error instanceof Error ? error.message : 'Something went wrong.'
}
