<template>
  <div>
    <p>This component will fetch /api/hello from the backend.</p>
    <button @click="callApi">Call API</button>
    <div v-if="loading">Loading...</div>
    <pre v-if="result">{{ result }}</pre>
    <div v-if="error" style="color: red">Error: {{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getJson } from '@/utils/api'

const loading = ref(false)
const result = ref<string | null>(null)
const error = ref<string | null>(null)

async function callApi() {
  loading.value = true
  result.value = null
  error.value = null
  try {
    const data = await getJson<string>('/api/hello')
    result.value = typeof data === 'string' ? data : JSON.stringify(data)
  } catch (err: any) {
    error.value = err?.message ?? String(err)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
button { padding: 0.5rem 1rem; margin: 0.5rem 0; }
pre { background: #f6f8fa; padding: 1rem; }
</style>
