<template>
  <div class="card">
    <h2>Registered Animals</h2>
    <div v-if="loading">Loading...</div>
    <div v-if="error" class="error">Error: {{ error }}</div>
    <table v-if="animals.length">
      <thead>
        <tr>
          <th>ID</th>
          <th>Species</th>
          <th>Sex</th>
          <th>Birth Date</th>
          <th>Breed</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="a in animals" :key="a.id">
          <tr>
            <td>
              <template v-if="a.id && a.id.length">
                <router-link :to="`/animals/${encodeURIComponent(a.id)}`">{{ a.id }}</router-link>
              </template>
              <template v-else>
                <em>(no id)</em>
              </template>
            </td>
            <td>{{ a.species }}</td>
            <td>{{ a.sex }}</td>
            <td>{{ a.birthDate }}</td>
            <td>{{ a.breed ?? '-' }}</td>
            <td class="actions-cell">
              <button @click="toggleDetails(a.id)">{{ detailsMap[a.id] ? 'Hide' : 'Details' }}</button>
              <button
                class="danger"
                :disabled="removingIds[a.id]"
                :title="!a.id ? 'Missing ID on this record' : ''"
                @click.prevent="onRemove(a.id)"
              >
                {{ removingIds[a.id] ? 'Removing…' : 'Remove' }}
              </button>
            </td>
          </tr>
          <tr v-if="detailsMap[a.id]">
            <td colspan="6">
              <div><strong>Notes:</strong> {{ a.notes ?? '-' }}</div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
    <div v-else-if="!loading">No animals found.</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { postJson } from '@/utils/api'

type Animal = { id: string; species: string; sex: string; birthDate: string; breed?: string; notes?: string }

const animals = ref<Animal[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const detailsMap = ref<Record<string, boolean>>({})
const removingIds = ref<Record<string, boolean>>({})

async function fetchFromBackend() {
  loading.value = true
  error.value = null
  try {
  // prefer the new AnimalIdentity list endpoint (returns { animals: Animal[] })
  const res = await postJson<any, any>('/api/AnimalIdentity/_getAllAnimals', {})
  // accept several possible shapes: { animals: [...] } | [...] | { data: [...] } | { items: [...] }
  let list: any[] = []
  if (Array.isArray(res)) {
    list = res
  } else if (res && typeof res === 'object') {
    if (Array.isArray(res.animals)) list = res.animals
    else if (Array.isArray(res.data)) list = res.data
    else if (Array.isArray(res.items)) list = res.items
  }

  animals.value = list.map(normalizeAnimal)
  } catch (err: any) {
    error.value = err?.message ?? String(err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchFromBackend()
})

function toggleDetails(id: string) {
  detailsMap.value[id] = !detailsMap.value[id]
}

function normalizeAnimal(a: any): Animal {
  // Try robust ID extraction across common and heuristic variants
  const id = extractId(a)
  // Other fields with common fallbacks / casing variants
  const species = a?.species ?? a?.type ?? a?.animalType ?? a?.Species ?? ''
  const sex = a?.sex ?? a?.gender ?? a?.Sex ?? ''
  const birthDate = a?.birthDate ?? a?.birthdate ?? a?.birth_date ?? a?.dob ?? a?.BirthDate ?? ''
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

function extractId(a: any): string | undefined {
  if (a == null) return undefined
  if (typeof a === 'string' || typeof a === 'number') return String(a)
  // Direct common candidates
  const direct = (
    a.id ?? a.ID ?? a.Id ?? a._id ??
    a.animalId ?? a.animalID ?? a.AnimalId ?? a.AnimalID ?? a.animal_id ??
    a.identityId ?? a.identityID ?? a.IdentityId ?? a.IdentityID ??
    a.uid ?? a.UUID ?? a.uuid ?? a.uniqueId ?? a.uniqueID ??
    a.animal ?? a.name ?? a.code ?? a.animalCode ?? a.identifier ?? a.tag ?? a.earTag ?? a.ear_tag ?? a.identity
  )
  if (direct != null) return String(direct)

  // One-level nested common containers
  const nestedCandidates = [a.identity, a.meta, a.info, a.Animal, a.AnimalIdentity]
  for (const obj of nestedCandidates) {
    if (obj && typeof obj === 'object') {
      const nestedId = (obj.id ?? obj.ID ?? obj.Id ?? obj._id)
      if (nestedId != null) return String(nestedId)
    }
  }

  // Heuristic search: any key containing id/uid/uuid
  for (const [k, v] of Object.entries(a)) {
    if (typeof v === 'string' || typeof v === 'number') {
      if (/^(id|_id|animalid|identityid|uid|uuid)$/i.test(k)) return String(v)
      if (/(^|[^a-z])(id|uid|uuid)([^a-z]|$)/i.test(k) && String(v).length > 0) return String(v)
    }
    if (v && typeof v === 'object') {
      const vv: any = v
      const nested = vv.id ?? vv.ID ?? vv.Id ?? vv._id
      if (nested != null) return String(nested)
    }
  }
  return undefined
}

async function onRemove(id: string) {
  if (!id) {
    alert('Cannot remove: record has no ID.')
    return
  }
  const confirmed = window.confirm(`Remove animal '${id}'? This cannot be undone.`)
  if (!confirmed) return
  removingIds.value[id] = true
  error.value = null
  try {
    // Send using the backend's expected key 'animal', and include it as a query
    // param as well to accommodate handlers that read from query.
    const payload = { animal: id }
    const url = `/api/AnimalIdentity/removeAnimal?animal=${encodeURIComponent(id)}`
    // Optional console for local debugging
    console.debug('Removing animal', { id, url, payload })
    await postJson<typeof payload, any>(url, payload)
    // remove from local list
    animals.value = animals.value.filter(a => a.id !== id)
    // clean up details/removing flags
    delete detailsMap.value[id]
    delete removingIds.value[id]
  } catch (e: any) {
    removingIds.value[id] = false
    error.value = e?.message ?? String(e)
  }
}
</script>

<style scoped>
.error { color: red }
ul { padding-left: 0 }
li { list-style: none; padding: 0.25rem 0 }
.actions-cell { display: flex; gap: 0.5rem }
.danger { color: #b00020 }
</style>
