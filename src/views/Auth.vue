<template>
  <div class="auth-page">
    <div class="card auth">
    <h2>{{ mode === 'register' ? 'Create your account' : 'Sign in' }}</h2>
    <form @submit.prevent="onSubmit">
      <div class="row">
        <label>Username</label>
        <input v-model="username" required />
      </div>
      <div class="row">
        <label>Password</label>
        <input v-model="password" type="password" required autocomplete="current-password" placeholder="Enter your password" />
      </div>
      <button :disabled="loading">{{ loading ? (mode === 'register' ? 'Creating…' : 'Signing in…') : (mode === 'register' ? 'Create account' : 'Sign in') }}</button>
      <div v-if="success" class="success">{{ success }}</div>
      <div v-if="error" class="error">{{ error }}</div>
    </form>

    <div class="switch">
      <router-link v-if="mode !== 'register'" to="/register-user">Need an account? Register</router-link>
      <router-link v-else to="/login">Have an account? Sign in</router-link>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, getCurrentInstance } from 'vue'
import { postJsonWithMeta } from '@/utils/api'
import { loginWithToken } from '@/utils/auth'

const props = defineProps<{ mode?: 'login' | 'register' }>()
const inst = getCurrentInstance()
const router: any = (inst as any)?.proxy?.$router
const routePath = typeof window !== 'undefined' ? window.location.pathname : ''
const routeQuery = typeof window !== 'undefined' ? window.location.search : ''

const mode = computed(() => (props.mode ?? (routePath.includes('register') ? 'register' : 'login')))

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

async function onSubmit() {
  loading.value = true
  error.value = null
  success.value = null
  try {
  // Basic required checks
  const uname = username.value.trim()
  const p = (password.value || '').trim()
  if (!uname || !p) {
    throw new Error('Username and password are required')
  }
  const payload: any = { username: uname, password: p }
  const url = mode.value === 'register' ? '/api/UserAuthentication/register' : '/api/UserAuthentication/login'
  const { data: res, headers } = await postJsonWithMeta<typeof payload, any>(url, payload)
    // Robust token extraction: support envelopes and stringified responses
    const tryParseJSON = (v: any) => {
      if (typeof v === 'string') { try { return JSON.parse(v) } catch { return v } }
      return v
    }
    const unwrap = (obj: any) => {
      let cur = tryParseJSON(obj)
      let prev: any
      const keys = ['body','Body','payload','result','content','data','Data','response','Response']
      while (cur && typeof cur === 'object' && keys.some(k => k in cur) && cur !== prev) {
        prev = cur
        const next = (cur as any).body ?? (cur as any).Body ?? (cur as any).payload ?? (cur as any).result ?? (cur as any).content ?? (cur as any).data ?? (cur as any).Data ?? (cur as any).response ?? (cur as any).Response
        cur = tryParseJSON(next)
      }
      return cur
    }
    const fromAny = (obj: any): { token: string | null; username: string | null; requestId: string | null; userId: string | null } => {
      const o = tryParseJSON(unwrap(obj))
      const requestIdFrom = (v: any): string | null => {
        if (!v || typeof v !== 'object') return null
        const candidates = [
          (v as any).request,
          (v as any).Request,
          (v as any).requestId,
          (v as any).RequestId,
          ((Object.keys(v).length === 1 && 'id' in v) ? (v as any).id : null)
        ].filter(x => typeof x === 'string' && x.trim()) as string[]
        return candidates.length ? candidates[0].trim() : null
      }
      const userIdFrom = (v: any): string | null => {
        if (v && typeof v === 'object') {
          const u = (v as any).user ?? (v as any).User ?? null
          if (typeof u === 'string' && u.trim()) return u.trim()
        }
        return null
      }
      // If it's a bare string and looks like a token, accept it
      if (typeof o === 'string') {
        const s = o.trim()
        const looksJwt = s.split('.').length >= 3 && s.length > 20
        return { token: looksJwt ? s : s || null, username: null, requestId: null, userId: null }
      }
      if (o && typeof o === 'object') {
        const token = (o as any).token ?? (o as any).Token ?? (o as any).sessionToken ?? (o as any).jwt ?? (o as any).access_token ?? null
        const username = (o as any).username ?? (o as any).user ?? (o as any).name ?? null
        const req = requestIdFrom(o)
        const userId = userIdFrom(o)
        if (token) return { token: String(token), username: username != null ? String(username) : null, requestId: req, userId }
        // scan shallowly for a nested token
        for (const v of Object.values(o)) {
          if (v && typeof v === 'object') {
            const t = (v as any).token ?? (v as any).sessionToken ?? (v as any).jwt ?? (v as any).access_token
            const u = (v as any).username ?? (v as any).user ?? (v as any).name
            const nestedReq = requestIdFrom(v)
            const nestedUserId = userIdFrom(v)
            if (t) return { token: String(t), username: u != null ? String(u) : null, requestId: nestedReq ?? req, userId: nestedUserId ?? userId }
          } else if (typeof v === 'string') {
            const vv = v.trim()
            const looksJwt = vv.split('.').length >= 3 && vv.length > 20
            if (looksJwt) return { token: vv, username: null, requestId: req, userId }
          }
        }
        if (req || userId) return { token: null, username: username != null ? String(username) : null, requestId: req, userId }
      }
      return { token: null, username: null, requestId: null, userId: null }
    }

    let { token, username: nameFromResp, requestId, userId } = fromAny(res)
    // If token is not in body, try common auth headers (requires server to expose them via CORS)
    if (!token && headers) {
      const h: Record<string, string> = {}
      Object.keys(headers).forEach(k => { h[k.toLowerCase()] = headers[k] })
      const auth = h['authorization'] || h['auth']
      const xToken = h['x-token'] || h['x-auth-token'] || h['access-token'] || h['x-access-token']
      let headerToken: string | null = null
      if (auth) {
        const m = /^Bearer\s+(.+)$/i.exec(auth)
        headerToken = m ? m[1] : auth
      }
      token = (headerToken || xToken || null) as any
    }
    if (!token) {
      if (mode.value === 'register' && (requestId || userId)) {
        // Attempt automatic login using same credentials
        const loginPayload: any = { username: uname, password: p }
        const { data: loginRes, headers: loginHeaders } = await postJsonWithMeta<typeof loginPayload, any>('/api/UserAuthentication/login', loginPayload)
        let { token: loginToken, username: loginName } = fromAny(loginRes)
        if (!loginToken && loginHeaders) {
          const h2: Record<string, string> = {}
          Object.keys(loginHeaders).forEach(k => { h2[k.toLowerCase()] = loginHeaders[k] })
          const auth2 = h2['authorization'] || h2['auth']
          const xToken2 = h2['x-token'] || h2['x-auth-token'] || h2['access-token'] || h2['x-access-token']
          let headerToken2: string | null = null
          if (auth2) {
            const m2 = /^Bearer\s+(.+)$/i.exec(auth2)
            headerToken2 = m2 ? m2[1] : auth2
          }
          loginToken = (headerToken2 || xToken2 || null) as any
        }
        if (!loginToken) {
          const rid = requestId || userId
          throw new Error(`Registration acknowledged (request id: ${rid}) but automatic login failed: missing session token`)
        }
        let finalDisplay = loginName || uname
        loginWithToken(String(loginToken), finalDisplay ? String(finalDisplay) : null)
        const params2 = new URLSearchParams(routeQuery)
        const redirect2 = params2.get('redirect') || '/'
        if (router && typeof router.push === 'function') router.push(redirect2)
        else window.location.href = redirect2
        return
      }
      throw new Error('Login failed: missing session token in response')
    }
    let displayName = nameFromResp
  if (!displayName) displayName = uname // fallback to entered username for header display
  loginWithToken(String(token), displayName ? String(displayName) : null)
    const params = new URLSearchParams(routeQuery)
    const redirect = params.get('redirect') || '/'
    if (router && typeof router.push === 'function') router.push(redirect)
    else window.location.href = redirect
  } catch (e: any) {
    error.value = e?.message ?? String(e)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page { min-height: calc(100vh - 64px); display: grid; place-items: center; padding: 1rem }
.card { max-width: 420px; width: 100% }
.row { display: flex; flex-direction: column; margin-bottom: 0.5rem }
button { padding: 0.4rem 0.7rem }
.success { color: #126b12; margin-top: 0.5rem }
.error { color: #b00020; margin-top: 0.5rem }
.switch { margin-top: 0.75rem }
</style>
