<template>
  <div class="card">
    <h2>Animal Details: {{ id }}</h2>
    <div v-if="loading">Loading...</div>
    <div v-if="error" class="error">Error: {{ error }}</div>
    <div v-if="animal">
      <table>
        <tr><td><strong>ID</strong></td><td>{{ animal.id }}</td></tr>
        <tr><td><strong>Species</strong></td><td>{{ animal.species }}</td></tr>
        <tr><td><strong>Sex</strong></td><td>{{ animal.sex }}</td></tr>
        <tr><td><strong>Birth Date</strong></td><td>{{ animal.birthDate }}</td></tr>
  <tr><td><strong>Breed</strong></td><td>{{ animal.breed ?? '-' }}</td></tr>
        <tr><td><strong>Notes</strong></td><td>{{ animal.notes ?? '-' }}</td></tr>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getJson } from '@/utils/api'

const route = useRoute()
const id = route.params.id as string
type Animal = { id: string; species: string; sex: string; birthDate: string; breed?: string; notes?: string }
const animal = ref<Animal | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    // try common backend paths
    let res: any = null
    try { res = await getJson(`/api/AnimalIdentity/${id}`) } catch {}
    if (!res) try { res = await getJson(`/api/animals/${id}`) } catch {}
    if (res) {
      animal.value = res
      return
    }
    // If backend didn't return anything, leave animal null
  } catch (err: any) {
    error.value = err?.message ?? String(err)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.error { color: red }
table { border-collapse: collapse }
td { padding: 0.3rem 0.6rem }
</style>
