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
import { postJson } from '@/utils/api'
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
    const url = mode.value === 'register' ? '/api/UserAuthentification/register' : '/api/UserAuthentification/login'
    const res = await postJson<typeof payload, any>(url, payload)
    // Expect backend to return { token, username? }
    const token = (res && typeof res === 'object') ? (res.token ?? (res as any).sessionToken ?? (res as any).jwt ?? null) : null
    if (!token) throw new Error('Login failed: missing session token in response')
    const displayName = (res && typeof res === 'object') ? (res.username ?? (res as any).user ?? (res as any).name ?? null) : null
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
