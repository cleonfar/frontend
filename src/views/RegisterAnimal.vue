<template>
  <div class="card">
    <h2>Register Animal</h2>
    <form @submit.prevent="submit">
      <label>ID<input v-model="form.id" required /></label>
      <label>Species<input v-model="form.species" required /></label>
      <label>Sex
        <select v-model="form.sex" required>
          <option value="male">male</option>
          <option value="female">female</option>
          <option value="neutered">neutered</option>
        </select>
      </label>
      <label>Birth date<input v-model="form.birthDate" type="date" required /></label>
      <label>Breed<input v-model="form.breed" /></label>
      <label>Notes<textarea v-model="form.notes" /></label>

      <div class="actions">
        <button type="submit" :disabled="loading">Register</button>
      </div>
    </form>

    <div v-if="loading">Submitting...</div>
    <div v-if="result" class="success">Registered: {{ result.animal }}</div>
    <div v-if="error" class="error">Error: {{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { postJson } from '@/utils/api'

type Req = {
  id: string
  species: string
  sex: 'male'|'female'|'neutered'
  birthDate: string
  breed?: string
  notes?: string
}

type Res = { animal: string }

const form = reactive<Req>({ id: '', species: '', sex: 'male', birthDate: '', breed: '', notes: '' })
const loading = ref(false)
const result = ref<Res | null>(null)
const error = ref<string | null>(null)

async function submit() {
  loading.value = true
  result.value = null
  error.value = null
  try {
    const res = await postJson<Req, Res>('/api/AnimalIdentity/registerAnimal', form)
    result.value = res
    // prepare cache entry using current form values and returned id
    // Do not cache locally — prefer authoritative backend responses
    // reset form except id to encourage multiple entries
    form.id = ''
    form.species = ''
    form.birthDate = ''
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
</style>
