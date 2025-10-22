import { setDiag } from '@/utils/diag'

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
  const init: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json'
    },
    body: JSON.stringify(body)
  }

  const full = makeFullUrl(url)

  // Prefer direct backend first (may require CORS), then fallback to proxy-relative
  try {
    setDiag(full, undefined, undefined)
    const res = await doFetch(full, init)
    const parsed = await parseResponse<TResponse>(res)
    if (!parsed.ok) {
      setDiag(full, undefined, parsed.error)
      throw new Error(parsed.error)
    }
    setDiag(full, parsed.data, undefined)
    return parsed.data as TResponse
  } catch (e) {
    try {
      setDiag(url, undefined, undefined)
      const res2 = await doFetch(url, init)
      const parsed2 = await parseResponse<TResponse>(res2)
      if (!parsed2.ok) {
        setDiag(url, undefined, parsed2.error)
        throw new Error(parsed2.error)
      }
      setDiag(url, parsed2.data, undefined)
      return parsed2.data as TResponse
    } catch (e2: any) {
      const msg = e2?.message ?? (e as any)?.message ?? String(e2 ?? e)
      setDiag(url, undefined, msg)
      throw new Error(msg)
    }
  }
}

export async function getJson<TResponse>(url: string): Promise<TResponse> {
  const full = makeFullUrl(url)

  try {
    setDiag(full, undefined, undefined)
    const res = await doFetch(full)
    const parsed = await parseResponse<TResponse>(res)
    if (!parsed.ok) {
      setDiag(full, undefined, parsed.error)
      throw new Error(parsed.error)
    }
    setDiag(full, parsed.data, undefined)
    return parsed.data as TResponse
  } catch (e) {
    try {
      setDiag(url, undefined, undefined)
      const res2 = await doFetch(url)
      const parsed2 = await parseResponse<TResponse>(res2)
      if (!parsed2.ok) {
        setDiag(url, undefined, parsed2.error)
        throw new Error(parsed2.error)
      }
      setDiag(url, parsed2.data, undefined)
      return parsed2.data as TResponse
    } catch (e2: any) {
      const msg = e2?.message ?? (e as any)?.message ?? String(e2 ?? e)
      setDiag(url, undefined, msg)
      throw new Error(msg)
    }
  }
}
