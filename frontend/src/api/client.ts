export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

interface RequestOptions extends RequestInit {
  query?: Record<string, string | number | undefined>
}

let refreshPromise: Promise<boolean> | null = null

function notifySessionExpired(): void {
  window.dispatchEvent(new Event('auth:session-expired'))
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(path, API_BASE_URL)
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value))
      }
    })
  }
  return url.toString()
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  async function parseError(response: Response): Promise<Error> {
    let message = 'Request failed'
    try {
      const payload = (await response.json()) as { detail?: string }
      if (payload.detail) {
        message = payload.detail
      }
    } catch {
      message = response.statusText || message
    }
    return new Error(message)
  }

  async function refreshAccessToken(): Promise<boolean> {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        const response = await fetch(buildUrl('/auth/refresh'), {
          method: 'POST',
          credentials: 'include',
        })
        return response.ok
      })()
      refreshPromise.finally(() => {
        refreshPromise = null
      })
    }
    return refreshPromise
  }

  async function requestWithRetry(retryOnAuthFailure: boolean): Promise<Response> {
    const headers = new Headers(options.headers)
    if (!headers.has('Content-Type') && options.body) {
      headers.set('Content-Type', 'application/json')
    }

    const response = await fetch(buildUrl(path, options.query), {
      ...options,
      credentials: 'include',
      headers,
    })

    const canRefresh = retryOnAuthFailure && response.status === 401 && path !== '/auth/refresh'
    if (canRefresh) {
      const refreshed = await refreshAccessToken()
      if (refreshed) {
        return requestWithRetry(false)
      }
      notifySessionExpired()
    }

    return response
  }

  const response = await requestWithRetry(true)

  if (!response.ok) {
    throw await parseError(response)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
