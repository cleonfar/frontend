import { setDiag } from '@/utils/diag'
import { getCurrentToken } from '@/utils/auth'

// Base API URL strategy:
// - In production (Render), set VITE_API_BASE_URL to your deployed backend URL + '/api'
//   e.g. https://assignment4-xger.onrender.com/api
// - In local dev, leave it undefined so we default to proxying via Vite with relative '/api' paths
//   (vite.config.ts proxies '/api' -> http://127.0.0.1:8000)
const API_BASE = (import.meta.env as any).VITE_API_BASE_URL as string | undefined

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

function joinBase(base: string | undefined, path: string) {
  if (!base) return path
  const b = base.endsWith('/') ? base.slice(0, -1) : base
  const p = path.startsWith('/') ? path : `/${path}`
  // Avoid double '/api' if callers include '/api' and base already ends with '/api'
  if (b.endsWith('/api') && p.startsWith('/api/')) {
    return b + p.substring(4) // drop leading '/api'
  }
  return b + p
}

function makeFullUrl(url: string) {
  // If API_BASE is provided (production), build absolute; else return relative for Vite proxy
  return joinBase(API_BASE, url)
}

export async function postJson<TRequest, TResponse>(url: string, body: TRequest): Promise<TResponse> {
  // Inject token into request body when available and not already present
  let sendBody: any = body as any
  const token = getCurrentToken()
  if (token && body && typeof body === 'object' && !('token' in (body as any))) {
    sendBody = { ...(body as any), token }
  }
  const init: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}`, 'X-Token': token } : {})
    },
    body: JSON.stringify(sendBody)
  }

  const urlWithAuth = url
  const full = makeFullUrl(urlWithAuth)

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
      // Fallback to relative path in case absolute base is blocked by CORS or misconfigured
      setDiag(urlWithAuth, undefined, undefined, 'POST')
      const res2 = await doFetch(urlWithAuth, init)
      const parsed2 = await parseResponse<TResponse>(res2)
      if (!parsed2.ok) {
        setDiag(urlWithAuth, undefined, parsed2.error, 'POST')
        throw new Error(parsed2.error)
      }
      setDiag(urlWithAuth, parsed2.data, undefined, 'POST')
      return parsed2.data as TResponse
    } catch (e2: any) {
      const msg = e2?.message ?? (e as any)?.message ?? String(e2 ?? e)
      setDiag(urlWithAuth, undefined, msg, 'POST')
      throw new Error(msg)
    }
  }
}

export async function getJson<TResponse>(url: string): Promise<TResponse> {
  const token = getCurrentToken()
  const init: RequestInit = {
    headers: {
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}`, 'X-Token': token } : {})
    }
  }
  const full = makeFullUrl(url)

  try {
    setDiag(full, undefined, undefined, 'GET')
    const res = await doFetch(full, init)
    const parsed = await parseResponse<TResponse>(res)
    if (!parsed.ok) {
      setDiag(full, undefined, parsed.error, 'GET')
      throw new Error(parsed.error)
    }
    setDiag(full, parsed.data, undefined, 'GET')
    return parsed.data as TResponse
  } catch (e) {
    try {
      const proxied = url
      setDiag(proxied, undefined, undefined, 'GET')
      const res2 = await doFetch(proxied, init)
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

// Variant that returns response metadata (headers, status) alongside parsed data.
// Useful for auth where tokens may arrive in headers (e.g., Authorization, X-Token).
export async function postJsonWithMeta<TRequest, TResponse>(url: string, body: TRequest): Promise<{ data: TResponse; headers: Record<string, string>; status: number }> {
  let sendBody: any = body as any
  const token = getCurrentToken()
  if (token && body && typeof body === 'object' && !('token' in (body as any))) {
    sendBody = { ...(body as any), token }
  }
  const init: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}`, 'X-Token': token } : {})
    },
    body: JSON.stringify(sendBody)
  }

  const urlWithAuth = url
  const full = makeFullUrl(urlWithAuth)

  const headersToObject = (h: Headers): Record<string, string> => {
    const out: Record<string, string> = {}
    h.forEach((v, k) => { out[k] = v })
    return out
  }

  try {
    setDiag(full, undefined, undefined, 'POST')
    const res = await doFetch(full, init)
    const parsed = await parseResponse<TResponse>(res)
    if (!parsed.ok) {
      setDiag(full, undefined, parsed.error, 'POST')
      throw new Error(parsed.error)
    }
    setDiag(full, parsed.data, undefined, 'POST')
    return { data: parsed.data as TResponse, headers: headersToObject(res.headers), status: res.status }
  } catch (e) {
    try {
      setDiag(urlWithAuth, undefined, undefined, 'POST')
      const res2 = await doFetch(urlWithAuth, init)
      const parsed2 = await parseResponse<TResponse>(res2)
      if (!parsed2.ok) {
        setDiag(urlWithAuth, undefined, parsed2.error, 'POST')
        throw new Error(parsed2.error)
      }
      setDiag(urlWithAuth, parsed2.data, undefined, 'POST')
      return { data: parsed2.data as TResponse, headers: headersToObject(res2.headers), status: res2.status }
    } catch (e2: any) {
      const msg = e2?.message ?? (e as any)?.message ?? String(e2 ?? e)
      setDiag(urlWithAuth, undefined, msg, 'POST')
      throw new Error(msg)
    }
  }
}
