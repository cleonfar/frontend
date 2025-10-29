import { setDiag } from '@/utils/diag'
import { getCurrentUsername } from '@/utils/auth'

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string) || 'http://127.0.0.1:8000'

async function doFetch(input: RequestInfo, init?: RequestInit) {
  return fetch(input, init)
}

function formatErrorText(text: string) {
  try {
    const p = JSON.parse(text)
    return (p as any)?.error ?? text
  } catch {
    return text
  }
}

async function parseResponse<T>(res: Response): Promise<{ ok: boolean; data?: T; error?: string }> {
  const ct = res.headers.get('content-type') || ''
  const text = await res.text()

  // Non-OK: derive error from JSON if possible, else raw text
  if (!res.ok) {
    const err = ct.includes('application/json') ? formatErrorText(text) : text || `${res.status} ${res.statusText}`
    return { ok: false, error: err }
  }

  // OK responses
  if (!text) return { ok: true, data: {} as T }

  if (ct.includes('application/json')) {
    try {
      const parsed = JSON.parse(text)
      if (parsed && typeof parsed === 'object' && 'error' in parsed) {
        return { ok: false, error: (parsed as any).error ?? JSON.stringify(parsed) }
      }
      return { ok: true, data: parsed as T }
    } catch {
      // Body said JSON but wasn't parseable. Treat as text if success.
      return { ok: true, data: text as unknown as T }
    }
  }

  // Not JSON: return raw text for success
  return { ok: true, data: text as unknown as T }
}

function makeFullUrl(url: string) {
  return `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

export async function postJson<TRequest, TResponse>(url: string, body: TRequest): Promise<TResponse> {
  // Inject user into request body when available and not already present
  let sendBody: any = body as any
  const username = getCurrentUsername()
  if (username && body && typeof body === 'object' && !('user' in (body as any))) {
    sendBody = { ...(body as any), user: username }
  }
  // Also append user as a query param to maximize backend compatibility
  const appendUser = (u: string | null, raw: string) => {
    if (!u) return raw
    const hasQuery = raw.includes('?')
    const sep = hasQuery ? '&' : '?'
    return `${raw}${sep}user=${encodeURIComponent(u)}`
  }
  const init: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json',
      // Send only X-User to match backend expectation
      ...(username ? { 'X-User': username } : {})
    },
    body: JSON.stringify(sendBody)
  }

  const urlWithUser = appendUser(username, url)
  const full = makeFullUrl(urlWithUser)

  // Prefer direct backend first (may require CORS), then fallback to proxy-relative
  try {
    setDiag(full, undefined, undefined, 'POST')
    const res = await doFetch(full, init)
    const parsed = await parseResponse<TResponse>(res)
    if (!parsed.ok) {
      setDiag(full, undefined, parsed.error, 'POST')
      throw new Error(parsed.error)
    }
    setDiag(full, parsed.data, undefined, 'POST')
    return parsed.data as TResponse
  } catch (e) {
    try {
      setDiag(urlWithUser, undefined, undefined, 'POST')
      const res2 = await doFetch(urlWithUser, init)
      const parsed2 = await parseResponse<TResponse>(res2)
      if (!parsed2.ok) {
        setDiag(urlWithUser, undefined, parsed2.error, 'POST')
        throw new Error(parsed2.error)
      }
      setDiag(urlWithUser, parsed2.data, undefined, 'POST')
      return parsed2.data as TResponse
    } catch (e2: any) {
      const msg = e2?.message ?? (e as any)?.message ?? String(e2 ?? e)
      setDiag(urlWithUser, undefined, msg, 'POST')
      throw new Error(msg)
    }
  }
}

export async function getJson<TResponse>(url: string): Promise<TResponse> {
  const username = getCurrentUsername()
  const appendUser = (u: string | null, raw: string) => {
    if (!u) return raw
    const hasQuery = raw.includes('?')
    const sep = hasQuery ? '&' : '?'
    return `${raw}${sep}user=${encodeURIComponent(u)}`
  }
  const full = makeFullUrl(appendUser(username, url))

  try {
    setDiag(full, undefined, undefined, 'GET')
    const res = await doFetch(full)
    const parsed = await parseResponse<TResponse>(res)
    if (!parsed.ok) {
      setDiag(full, undefined, parsed.error, 'GET')
      throw new Error(parsed.error)
    }
    setDiag(full, parsed.data, undefined, 'GET')
    return parsed.data as TResponse
  } catch (e) {
    try {
      const proxied = appendUser(username, url)
      setDiag(proxied, undefined, undefined, 'GET')
      const res2 = await doFetch(proxied)
      const parsed2 = await parseResponse<TResponse>(res2)
      if (!parsed2.ok) {
        setDiag(url, undefined, parsed2.error, 'GET')
        throw new Error(parsed2.error)
      }
      setDiag(url, parsed2.data, undefined, 'GET')
      return parsed2.data as TResponse
    } catch (e2: any) {
      const msg = e2?.message ?? (e as any)?.message ?? String(e2 ?? e)
      setDiag(url, undefined, msg, 'GET')
      throw new Error(msg)
    }
  }
}
