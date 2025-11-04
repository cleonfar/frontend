<template>
  <header class="header">
    <nav class="nav">
  <div class="nav-left" v-if="!hideNav">
        <router-link to="/">Home</router-link>
  <router-link to="/animals">Animal Overview</router-link>
        <router-link to="/groups">Manage Groups</router-link>
    <!-- New category-oriented navigation -->
  <router-link to="/weights">Weights</router-link>
  <router-link to="/births">Mothers & Offspring</router-link>
    
      </div>
  <div class="nav-right" v-if="!hideNav && isAuthenticated">
        <span class="user">Signed in as {{ user || 'unknown' }}</span>
        <button class="logout" @click="onLogout">Logout</button>
      </div>
      <div class="nav-right" v-else-if="!hideNav">
        <router-link to="/login">Login</router-link>
      </div>
    </nav>
  </header>
  
</template>

<script setup lang="ts">
import { getCurrentInstance, computed, ref } from 'vue'
import { useAuth } from '@/utils/auth'
import { postJson } from '@/utils/api'

const { user: userRef, isAuthenticated, logoutUser } = useAuth()
const user = computed(() => userRef.value)

const inst = getCurrentInstance()
const router: any = (inst as any)?.proxy?.$router
const route: any = (inst as any)?.proxy?.$route
const isAuthPage = computed(() => {
  const p = route?.path || (typeof window !== 'undefined' ? window.location.pathname : '')
  return p === '/login' || p === '/register-user'
})
const hideNav = computed(() => isAuthPage.value && !isAuthenticated.value)

const loggingOut = ref(false)
async function onLogout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    // Notify backend to invalidate the current session token
    await postJson<any, any>('/api/UserAuthentication/logout', {})
  } catch (_) {
    // Ignore errors and proceed with local logout to ensure user is signed out client-side
  } finally {
    logoutUser()
    if (router && typeof router.push === 'function') router.push('/login')
    else window.location.href = '/login'
    loggingOut.value = false
  }
}
</script>

<style scoped>
.header { padding: 0.5rem 0; margin-bottom: 1rem }
.nav { display: flex; align-items: center; justify-content: space-between }

/* Top-level segmented tabs */
.nav-left {
  display: flex;
  gap: 0.5rem;
  padding: 0.375rem;
  background: var(--surface-2, #fafafa);
  border: 1px solid var(--divider, #e5e7eb);
  border-radius: 8px;
}
.nav-left a {
  text-decoration: none;
  background: transparent;
  border: 1px solid transparent;
  padding: 0.5rem 0.9rem;
  border-radius: 6px;
  color: var(--text, #1f2937);
  transition: background-color .15s ease, border-color .15s ease, color .15s ease;
}
.nav-left a:hover { background: #fff; border-color: var(--divider, #e5e7eb); }
.nav-left a.router-link-active,
.nav-left a.router-link-exact-active {
  background: #fff;
  border-color: var(--primary, #2e7d32);
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0,0,0,.04);
}

.nav-right { display: flex; align-items: center; gap: 0.5rem }
.logout { padding: 0.25rem 0.5rem }
</style>
