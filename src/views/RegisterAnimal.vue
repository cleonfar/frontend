<template>
  <div class="card root-card">
    <h2>Register Animal</h2>
    <form @submit.prevent="submit">
      <label>ID
        <input v-model="form.id" @blur="onCheckId" required />
      </label>
      <div class="hint" v-if="checkingId">Checking ID…</div>
      <div class="error" v-if="idExists">That ID already exists. Choose a different ID.</div>
      <label>Species
        <select v-model="selectedSpecies" required>
          <option value="">Select…</option>
          <option value="cow">Cow</option>
          <option value="sheep">Sheep</option>
          <option value="goat">Goat</option>
          <option value="pig">Pig</option>
          <option value="horse">Horse</option>
          <option value="donkey">Donkey</option>
          <option value="camel">Camel</option>
          <option value="buffalo">Buffalo</option>
          <option value="rabbit">Rabbit</option>
          <option value="other">Other</option>
        </select>
      </label>
      <div v-if="selectedSpecies === 'other'">
        <input v-model="customSpecies" placeholder="Enter species" aria-label="Species" />
      </div>
      <label>Sex
        <select v-model="form.sex" required>
          <option value="male">male</option>
          <option value="female">female</option>
          <option value="neutered">neutered</option>
        </select>
      </label>
      <label>Birth date
        <input v-model="form.birthDate" type="date" required />
      </label>
      <div class="error" v-if="dateError">{{ dateError }}</div>
      <label>Breed (optional)
        <input v-model="form.breed" placeholder="optional" aria-label="Breed (optional)" />
      </label>
      <label>Notes<textarea v-model="form.notes" /></label>

      <div class="actions">
        <button type="submit" :disabled="loading || idExists">Register</button>
      </div>
    </form>

    <div v-if="loading">Submitting...</div>
    <div v-if="result" class="success">Registered: {{ result.animal }}</div>
    <div v-if="error" class="error">Error: {{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { postJson, getJson } from '@/utils/api'

type Req = {
  id: string
  species: string
  sex: 'male'|'female'|'neutered'
  birthDate: string
  breed?: string
  notes?: string
}

type Res = { animal: string }

const today = new Date().toISOString().slice(0,10)
const form = reactive<Req>({ id: '', species: '', sex: 'male', birthDate: today, breed: '', notes: '' })
const loading = ref(false)
const result = ref<Res | null>(null)
const error = ref<string | null>(null)
const checkingId = ref(false)
const idExists = ref(false)
const dateError = ref<string | null>(null)

// species selection: common list + custom
const selectedSpecies = ref('')
const customSpecies = ref('')

// Preselect user's most common species (if any)
const KNOWN_SPECIES = ['cow','sheep','goat','pig','horse','donkey','camel','buffalo','rabbit'] as const
type Known = typeof KNOWN_SPECIES[number]

function normalizeSpecies(val: any): string {
  const s = (val ?? '').toString().trim()
  return s
}

async function preselectCommonSpecies() {
  // Do not override if user already chose something
  if (selectedSpecies.value || customSpecies.value) return
  try {
    const res = await postJson<any, any>('/api/AnimalIdentity/_getAllAnimals', {})
    let list: any[] = []
    if (Array.isArray(res)) list = res
    else if (res && typeof res === 'object') {
      if (Array.isArray(res.animals)) list = res.animals
      else if (Array.isArray(res.data)) list = res.data
      else if (Array.isArray(res.items)) list = res.items
    }
    if (!list.length) return
    const counts = new Map<string, { count: number; sample: string }>()
    for (const a of list) {
      const raw = (a?.species ?? a?.type ?? a?.animalType ?? a?.Species)
      const norm = normalizeSpecies(raw)
      if (!norm) continue
      const key = norm.toLowerCase()
      const curr = counts.get(key)
      if (curr) curr.count += 1
      else counts.set(key, { count: 1, sample: norm })
    }
    if (counts.size === 0) return
    // Pick the max count
    let topKey = ''
    let top = -1
    for (const [k, v] of counts) {
      if (v.count > top) { top = v.count; topKey = k }
    }
    if (!topKey) return
    const isKnown = KNOWN_SPECIES.includes(topKey as Known)
    if (isKnown) {
      selectedSpecies.value = topKey as Known
    } else {
      selectedSpecies.value = 'other'
      const sample = counts.get(topKey)?.sample || ''
      customSpecies.value = sample
    }
  } catch {
    // ignore; leave blank on failure
  }
}

onMounted(() => {
  preselectCommonSpecies()
})

function validateDate() {
  dateError.value = null
  if (!form.birthDate) return true
  try {
    const d = new Date(form.birthDate)
    const now = new Date()
    // strip time
    const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (dOnly > nowOnly) {
      dateError.value = 'Birth date cannot be in the future.'
      return false
    }
  } catch {}
  return true
}

async function onCheckId() {
  idExists.value = false
  const id = (form.id || '').trim()
  if (!id) return
  checkingId.value = true
  try {
    // If GET returns without error, the ID exists
    await getJson<any>(`/api/AnimalIdentity/${encodeURIComponent(id)}`)
    idExists.value = true
  } catch {
    idExists.value = false
  } finally {
    checkingId.value = false
  }
}

async function submit() {
  loading.value = true
  result.value = null
  error.value = null
  try {
    // Resolve species from selection
    const resolvedSpecies = (selectedSpecies.value === 'other'
      ? (customSpecies.value || '')
      : (selectedSpecies.value || '')
    ).trim()

  // Basic client-side validation and normalization
    form.id = form.id.trim()
    form.species = resolvedSpecies
    form.birthDate = (form.birthDate || '').trim()
    form.breed = (form.breed || '').trim()
    form.notes = (form.notes || '').trim()

    if (!validateDate()) {
      throw new Error(dateError.value || 'Invalid birth date')
    }
    if (!form.species) {
      throw new Error('Please select a species or enter a custom species.')
    }
    if (idExists.value) {
      throw new Error('This ID already exists. Please choose a different ID.')
    }

    // Build payload and always include breed and notes as strings (empty when not provided)
    const payload: Req = {
      id: form.id,
      species: form.species,
      sex: form.sex,
      birthDate: form.birthDate,
      breed: form.breed || '',
      notes: form.notes || ''
    }

    const res = await postJson<Req, Res>('/api/AnimalIdentity/registerAnimal', payload)
    result.value = res
    // prepare cache entry using current form values and returned id
    // Do not cache locally — prefer authoritative backend responses
    // reset form except id to encourage multiple entries
    form.id = ''
  selectedSpecies.value = ''
  customSpecies.value = ''
  form.species = ''
    form.birthDate = today
    form.breed = ''
    form.notes = ''
  } catch (err: any) {
    error.value = err?.message ?? String(err)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.card { padding: 1rem; border: 1px solid #ddd; border-radius: 6px; max-width: 600px }
label { display: block; margin: 0.5rem 0 }
input, textarea, select { width: 100%; padding: 0.4rem; box-sizing: border-box }
.actions { margin-top: 0.75rem }
.success { color: green; margin-top: 0.5rem }
.error { color: red; margin-top: 0.5rem }
.hint { color: #666; margin-top: 0.25rem }
</style>
