<template>
  <div class="card">
    <h2>Diagnostics</h2>
    <p>Click the button to fetch <code>/api/hello</code> (proxied to backend).</p>
    <button @click="callApi" :disabled="loading">Call /api/hello</button>
    <div v-if="loading">Calling...</div>
    <pre v-if="result">{{ result }}</pre>
    <div v-if="error" class="error">Error: {{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const loading = ref(false)
const result = ref<string | null>(null)
const error = ref<string | null>(null)

async function callApi() {
  loading.value = true
  result.value = null
  error.value = null
  try {
    const res = await fetch('/api/hello')
    const text = await res.text()
    if (!res.ok) throw new Error(text || `${res.status} ${res.statusText}`)
    result.value = text
  } catch (err: any) {
    error.value = err?.message ?? String(err)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.card { padding: 1rem; border: 1px solid #ddd; border-radius: 6px; max-width: 700px }
.error { color: red }
</style>
