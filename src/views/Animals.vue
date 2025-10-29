<template>
  <div class="card root-card">
    <h2>Animals</h2>

    <!-- Tabs -->
    <div class="tabs">
      <button :class="['tab', activeTab === 'list' && 'active']" @click="setTab('list')">View Animals</button>
      <button :class="['tab', activeTab === 'register' && 'active']" @click="setTab('register')">Register Animal</button>
    </div>

    <section v-if="activeTab === 'list'">
      <AnimalsList />
    </section>

    <section v-else>
      <RegisterAnimal />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AnimalsList from '@/views/AnimalsList.vue'
import RegisterAnimal from '@/views/RegisterAnimal.vue'

const props = defineProps<{ tab?: 'list' | 'register' }>()
const queryTab = (() => {
  try {
    const qs = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    const t = qs.get('tab')
    return (t === 'list' || t === 'register') ? t : null
  } catch { return null }
})()

const activeTab = ref<'list' | 'register'>(props.tab ?? queryTab ?? 'list')

function setTab(tab: 'list' | 'register') {
  activeTab.value = tab
  // best-effort reflect tab in URL without breaking router
  try {
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tab)
    window.history.replaceState({}, '', url.toString())
  } catch {}
}
</script>

<style scoped>
/* Segmented tab style (consistent across views) */
.tabs {
  display: flex;
  gap: 0.25rem;
  margin: 0 0 1rem;
  padding: 0.25rem;
  background: var(--tabs-bg, #fff);
  border: 1px solid var(--divider, #e5e7eb);
  border-radius: 8px;
}
.tab {
  background: transparent;
  border: 1px solid transparent;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  color: var(--text, #1f2937);
  transition: background-color .15s ease, border-color .15s ease, color .15s ease;
}
.tabs .tab:nth-child(odd) { background: var(--tab-alt-a); }
.tabs .tab:nth-child(even) { background: var(--tab-alt-b); }
.tab:hover { background: #fff; border-color: var(--divider, #e5e7eb); }
.tab.active {
  background: #fff;
  border-color: var(--primary, #2e7d32);
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0,0,0,.04);
}
</style>
