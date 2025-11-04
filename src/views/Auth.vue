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

async function onSubmit() {
  loading.value = true
  error.value = null
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
    const fromAny = (obj: any): { token: string | null; username: string | null } => {
      const o = tryParseJSON(unwrap(obj))
      // If it's a bare string and looks like a token, accept it
      if (typeof o === 'string') {
        const s = o.trim()
        const looksJwt = s.split('.').length >= 3 && s.length > 20
        return { token: looksJwt ? s : s || null, username: null }
      }
      if (o && typeof o === 'object') {
        const token = (o as any).token ?? (o as any).Token ?? (o as any).sessionToken ?? (o as any).jwt ?? (o as any).access_token ?? null
        const username = (o as any).username ?? (o as any).user ?? (o as any).name ?? null
        if (token) return { token: String(token), username: username != null ? String(username) : null }
        // scan shallowly for a nested token
        for (const v of Object.values(o)) {
          if (v && typeof v === 'object') {
            const t = (v as any).token ?? (v as any).sessionToken ?? (v as any).jwt ?? (v as any).access_token
            const u = (v as any).username ?? (v as any).user ?? (v as any).name
            if (t) return { token: String(t), username: u != null ? String(u) : null }
          } else if (typeof v === 'string') {
            const vv = v.trim()
            const looksJwt = vv.split('.').length >= 3 && vv.length > 20
            if (looksJwt) return { token: vv, username: null }
          }
        }
      }
      return { token: null, username: null }
    }

    let { token, username: nameFromResp } = fromAny(res)
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
    if (!token) throw new Error('Login failed: missing session token in response')
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
.error { color: #b00020; margin-top: 0.5rem }
.switch { margin-top: 0.75rem }
</style>
