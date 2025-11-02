import { ref, computed } from 'vue'

// Store session token for auth; keep optional display name for header UX
const LS_TOKEN = 'app.token'
const LS_USERNAME = 'app.username'

const storedToken = typeof localStorage !== 'undefined' ? localStorage.getItem(LS_TOKEN) : null
const storedName = typeof localStorage !== 'undefined' ? localStorage.getItem(LS_USERNAME) : null

const tokenRef = ref<string | null>(storedToken)
const userRef = ref<string | null>(storedName)

export function getCurrentToken(): string | null {
  return tokenRef.value
}

export function getCurrentUsername(): string | null {
  return userRef.value
}

export const isAuthenticated = computed(() => !!tokenRef.value)

export function loginWithToken(token: string, username?: string | null) {
  tokenRef.value = token
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem(LS_TOKEN, token) } catch {}
  }
  if (username) {
    userRef.value = username
    try { localStorage.setItem(LS_USERNAME, username) } catch {}
  }
}

// Backward compatibility alias if some code still calls loginUser
export const loginUser = (val: string) => loginWithToken(val)

export function logoutUser() {
  tokenRef.value = null
  userRef.value = null
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(LS_TOKEN)
      localStorage.removeItem(LS_USERNAME)
    }
  } catch {}
}

export function useAuth() {
  return { user: userRef, token: tokenRef, isAuthenticated, loginWithToken, loginUser, logoutUser, getCurrentToken, getCurrentUsername }
}
