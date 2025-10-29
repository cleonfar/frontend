<template>
  <div class="card root-card">
    <h2>Animal Details: {{ id }}</h2>
    <div v-if="loading">Loading...</div>
    <div v-if="error" class="error">Error: {{ error }}</div>
    <div v-if="animal">
      <table>
        <tr><td><strong>ID</strong></td><td>{{ animal.id }}</td></tr>
        <tr><td><strong>Species</strong></td><td>{{ animal.species }}</td></tr>
        <tr><td><strong>Sex</strong></td><td>{{ animal.sex }}</td></tr>
  <tr><td><strong>Birth Date</strong></td><td>{{ formatDate(animal.birthDate) }}</td></tr>
  <tr><td><strong>Breed</strong></td><td>{{ animal.breed ?? '-' }}</td></tr>
        <tr><td><strong>Notes</strong></td><td>{{ animal.notes ?? '-' }}</td></tr>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, getCurrentInstance } from 'vue'
import { getJson } from '@/utils/api'
import { formatDateMDY } from '@/utils/format'

const formatDate = formatDateMDY

const inst = getCurrentInstance()
const route: any = (inst as any)?.proxy?.$route
const id = (route?.params?.id ?? '') as string
type Animal = { id: string; species: string; sex: string; birthDate: string; breed?: string; notes?: string }
const animal = ref<Animal | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

type Raw = any

function normalizeAnimal(a: Raw): Animal | null {
  if (!a) return null
  const id = a?.AnimalID ?? a?.AnimalId ?? a?.animalID ?? a?.animalId ?? a?.animal_id ?? a?.id ?? a?.ID ?? a?.Id
  const species = a?.species ?? a?.Species ?? a?.type
  const sex = a?.sex ?? a?.Sex ?? a?.gender
  const birthDate = a?.birthDate ?? a?.BirthDate ?? a?.birthdate ?? a?.dob ?? a?.birth_date
  const breed = a?.breed ?? a?.Breed
  const notes = a?.notes ?? a?.Notes
  return {
    id: id != null ? String(id) : '',
    species: species != null ? String(species) : '',
    sex: sex != null ? String(sex) : '',
    birthDate: birthDate != null ? String(birthDate) : '',
    breed: breed != null ? String(breed) : undefined,
    notes: notes != null ? String(notes) : undefined
  }
}

async function load() {
  loading.value = true
  error.value = null
  try {
    // try common backend paths
    let res: any = null
    try { res = await getJson(`/api/AnimalIdentity/${id}`) } catch {}
    if (!res) try { res = await getJson(`/api/animals/${id}`) } catch {}
    if (res) {
      // Accept direct object or wrapped shapes
      const obj = Array.isArray(res) ? (res[0] ?? null) : (typeof res === 'object' && res && (res.animal || res.data || res.item) ? (res.animal ?? res.data ?? res.item) : res)
      const norm = normalizeAnimal(obj)
      animal.value = norm
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
