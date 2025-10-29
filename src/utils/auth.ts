import { ref, computed } from 'vue'

const LS_KEY = 'app.username'

const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(LS_KEY) : null
const userRef = ref<string | null>(stored)

export function getCurrentUsername(): string | null {
  return userRef.value
}

export const isAuthenticated = computed(() => !!userRef.value)

export function loginUser(username: string) {
  userRef.value = username
  try { localStorage.setItem(LS_KEY, username) } catch {}
}

export function logoutUser() {
  userRef.value = null
  try { localStorage.removeItem(LS_KEY) } catch {}
}

export function useAuth() {
  return { user: userRef, isAuthenticated, loginUser, logoutUser, getCurrentUsername }
}
