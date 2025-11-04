<template>
  <div class="card root-card">
    <h2>Registered Animals</h2>
    <div v-if="loading">Loading...</div>
    <div v-if="error" class="error">Error: {{ error }}</div>
    <table v-if="activeAnimals.length">
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
        <template v-for="a in activeAnimals" :key="a.id">
          <tr class="clickable-row" @click="onRowClick(a.id, $event)">
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
            <td>{{ formatDate(a.birthDate) }}</td>
            <td>{{ a.breed ?? '-' }}</td>
            <td class="actions-cell">
              <button @click.stop="openMarkSold(a.id)" :disabled="busyIds[a.id] || markSoldOpen[a.id]">{{ markSoldOpen[a.id] ? 'Add notes…' : (busyIds[a.id] ? 'Marking…' : 'Mark sold') }}</button>
              <button @click.stop="openMarkDead(a.id)" :disabled="busyIds[a.id] || markDeadOpen[a.id]">{{ markDeadOpen[a.id] ? 'Add cause…' : (busyIds[a.id] ? 'Marking…' : 'Mark dead') }}</button>
              <button
                class="danger"
                :disabled="removingIds[a.id]"
                :title="!a.id ? 'Missing ID on this record' : ''"
                @click.prevent.stop="onRemove(a.id)"
              >
                {{ removingIds[a.id] ? 'Removing…' : 'Remove' }}
              </button>
            </td>
          </tr>
          <!-- Slide-down cause of death panel for Mark dead -->
          <tr v-if="markDeadOpen[a.id]">
            <td colspan="6">
              <div class="sell-panel">
                <label class="row">
                  <span>Cause of death (optional)</span>
                  <input
                    :placeholder="'Add notes (cause, date confirmed)…'"
                    v-model="deathCause[a.id]"
                  />
                </label>
                <div class="row gap">
                  <button class="primary" @click="confirmMarkDead(a.id)" :disabled="busyIds[a.id]">Confirm deceased</button>
                  <button type="button" @click="cancelMarkDead(a.id)" :disabled="busyIds[a.id]">Cancel</button>
                </div>
              </div>
            </td>
          </tr>
          <!-- Slide-down buyer notes panel for Mark sold -->
          <tr v-if="markSoldOpen[a.id]">
            <td colspan="6">
              <div class="sell-panel">
                <label class="row">
                  <span>Buyer notes (optional)</span>
                  <input
                    :placeholder="'Add context (price, buyer, terms)…'"
                    v-model="buyerNotes[a.id]"
                  />
                </label>
                <div class="row gap">
                  <button class="primary" @click="confirmMarkSold(a.id)" :disabled="busyIds[a.id]">Confirm sold</button>
                  <button type="button" @click="cancelMarkSold(a.id)" :disabled="busyIds[a.id]">Cancel</button>
                </div>
              </div>
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
    <div v-else-if="!loading">No active animals.</div>

    <!-- Sold animals section -->
    <div class="mt" v-if="soldAnimals.length || (!loading && showSold)">
      <div class="row between">
        <h3>Sold animals ({{ soldAnimals.length }})</h3>
        <button type="button" @click="showSold = !showSold">{{ showSold ? 'Hide' : 'Show' }}</button>
      </div>
      <table v-show="showSold && soldAnimals.length">
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
          <template v-for="a in soldAnimals" :key="'sold_'+a.id">
            <tr class="clickable-row" @click="onRowClick(a.id, $event)">
              <td>
                <router-link v-if="a.id" :to="`/animals/${encodeURIComponent(a.id)}`">{{ a.id }}</router-link>
                <template v-else><em>(no id)</em></template>
              </td>
              <td>{{ a.species }}</td>
              <td>{{ a.sex }}</td>
              <td>{{ formatDate(a.birthDate) }}</td>
              <td>{{ a.breed ?? '-' }}</td>
              <td class="actions-cell">
                <button
                  class="danger"
                  :disabled="removingIds[a.id]"
                  :title="!a.id ? 'Missing ID on this record' : ''"
                  @click.prevent.stop="onRemove(a.id)"
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
      <div v-show="showSold && !soldAnimals.length && !loading" class="muted">No sold animals.</div>
    </div>

    <!-- Deceased animals section -->
    <div class="mt" v-if="deadAnimals.length || (!loading && showDead)">
      <div class="row between">
        <h3>Deceased animals ({{ deadAnimals.length }})</h3>
        <button type="button" @click="showDead = !showDead">{{ showDead ? 'Hide' : 'Show' }}</button>
      </div>
      <table v-show="showDead && deadAnimals.length">
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
          <template v-for="a in deadAnimals" :key="'dead_'+a.id">
            <tr class="clickable-row" @click="onRowClick(a.id, $event)">
              <td>
                <router-link v-if="a.id" :to="`/animals/${encodeURIComponent(a.id)}`">{{ a.id }}</router-link>
                <template v-else><em>(no id)</em></template>
              </td>
              <td>{{ a.species }}</td>
              <td>{{ a.sex }}</td>
              <td>{{ formatDate(a.birthDate) }}</td>
              <td>{{ a.breed ?? '-' }}</td>
              <td class="actions-cell">
                <button
                  class="danger"
                  :disabled="removingIds[a.id]"
                  :title="!a.id ? 'Missing ID on this record' : ''"
                  @click.prevent.stop="onRemove(a.id)"
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
      <div v-show="showDead && !deadAnimals.length && !loading" class="muted">No deceased animals.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { postJson } from '@/utils/api'
import { formatDateMDY } from '@/utils/format'

const formatDate = formatDateMDY

type Animal = { id: string; species: string; sex: string; birthDate: string; breed?: string; notes?: string; status?: string }

const animals = ref<Animal[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const detailsMap = ref<Record<string, boolean>>({})
const removingIds = ref<Record<string, boolean>>({})
const busyIds = ref<Record<string, boolean>>({})
const markSoldOpen = ref<Record<string, boolean>>({})
const buyerNotes = ref<Record<string, string>>({})
const markDeadOpen = ref<Record<string, boolean>>({})
const deathCause = ref<Record<string, string>>({})

const showSold = ref(false)
const showDead = ref(false)
const SOLD_KEY = 'animals.showSold'
const DEAD_KEY = 'animals.showDead'
onMounted(() => {
  try {
    const s = localStorage.getItem(SOLD_KEY)
    if (s != null) showSold.value = s === '1'
    const d = localStorage.getItem(DEAD_KEY)
    if (d != null) showDead.value = d === '1'
  } catch {}
})
watch(showSold, v => { try { localStorage.setItem(SOLD_KEY, v ? '1' : '0') } catch {} })
watch(showDead, v => { try { localStorage.setItem(DEAD_KEY, v ? '1' : '0') } catch {} })

const activeAnimals = computed(() => animals.value.filter(a => (a.status || 'alive').toLowerCase() !== 'sold' && (a.status || 'alive').toLowerCase() !== 'deceased'))
const soldAnimals = computed(() => animals.value.filter(a => (a.status || '').toLowerCase() === 'sold'))
const deadAnimals = computed(() => animals.value.filter(a => (a.status || '').toLowerCase() === 'deceased'))

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

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
  animals.value = list
    .map(normalizeAnimal)
    .sort((a, b) => collator.compare(a.id || '', b.id || ''))
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

function onRowClick(id: string, e: MouseEvent) {
  // Ignore if clicking on interactive elements (safety net; buttons already stop propagation)
  const target = e.target as HTMLElement | null
  if (target && target.closest('button, a, input, textarea, select')) return
  toggleDetails(id)
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
  const status = a?.status ?? a?.Status

  return {
    id: id != null ? String(id) : '',
    species: species != null ? String(species) : '',
    sex: sex != null ? String(sex) : '',
    birthDate: birthDate != null ? String(birthDate) : '',
    breed: breed != null ? String(breed) : undefined,
    notes: notes != null ? String(notes) : undefined,
    status: status != null ? String(status) : undefined
  }
}

function extractId(a: any): string | undefined {
  if (a == null) return undefined
  if (typeof a === 'string' || typeof a === 'number') return String(a)
  // Direct common candidates
  const direct = (
    // Prefer AnimalID style first
    a.AnimalID ?? a.AnimalId ?? a.animalID ?? a.animalId ?? a.animal_id ??
    // Then other common explicit IDs (exclude _id until last resort)
    a.id ?? a.ID ?? a.Id ??
    a.identityId ?? a.identityID ?? a.IdentityId ?? a.IdentityID ??
    a.uid ?? a.UUID ?? a.uuid ?? a.uniqueId ?? a.uniqueID ??
    a.animal ?? a.name ?? a.code ?? a.animalCode ?? a.identifier ?? a.tag ?? a.earTag ?? a.ear_tag ?? a.identity ??
    // Last resort: backend object key
    a._id
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

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

async function onMarkSold(id: string) {
  if (!id || busyIds.value[id]) return
  // Open inline panel to capture buyer notes
  // Close any open 'Mark dead' panel for this row
  markDeadOpen.value[id] = false
  markSoldOpen.value[id] = true
  if (!(id in buyerNotes.value)) buyerNotes.value[id] = ''
}

function openMarkSold(id: string) { onMarkSold(id) }

function cancelMarkSold(id: string) {
  markSoldOpen.value[id] = false
}

async function confirmMarkSold(id: string) {
  if (!id || busyIds.value[id]) return
  busyIds.value[id] = true
  error.value = null
  try {
    const notes = (buyerNotes.value[id] || '').trim()
    const payload = { animal: id, date: todayISO(), buyerNotes: notes }
    await postJson<typeof payload, any>('/api/AnimalIdentity/markAsSold', payload)
    markSoldOpen.value[id] = false
    // Refresh list to reflect new status
    await fetchFromBackend()
  } catch (e: any) {
    error.value = e?.message ?? String(e)
  } finally {
    busyIds.value[id] = false
  }
}

function openMarkDead(id: string) {
  if (!id || busyIds.value[id]) return
  // Close any open 'Mark sold' panel for this row
  markSoldOpen.value[id] = false
  markDeadOpen.value[id] = true
  if (!(id in deathCause.value)) deathCause.value[id] = ''
}

function cancelMarkDead(id: string) {
  markDeadOpen.value[id] = false
}

async function confirmMarkDead(id: string) {
  if (!id || busyIds.value[id]) return
  busyIds.value[id] = true
  error.value = null
  try {
    const cause = (deathCause.value[id] || '').trim()
    const payload = { animal: id, date: todayISO(), cause }
    await postJson<typeof payload, any>('/api/AnimalIdentity/markAsDeceased', payload)
    markDeadOpen.value[id] = false
    await fetchFromBackend()
  } catch (e: any) {
    error.value = e?.message ?? String(e)
  } finally {
    busyIds.value[id] = false
  }
}

// Back-compat alias if referenced elsewhere
function onMarkDead(id: string) { openMarkDead(id) }
</script>

<style scoped>
.error { color: red }
ul { padding-left: 0 }
li { list-style: none; padding: 0.25rem 0 }
.actions-cell { display: flex; gap: 0.5rem }
.danger { color: #b00020 }
.row { display: flex; align-items: center; gap: 0.5rem }
.row.between { justify-content: space-between }
.mt { margin-top: 1rem }
.muted { color: #666 }
.sell-panel { background: var(--surface, #fff); border: 1px solid var(--divider, #e5e7eb); border-radius: 8px; padding: 0.75rem; margin-top: 0.25rem }
.row.gap { gap: 0.5rem }
.clickable-row { cursor: pointer }
.clickable-row:hover { background: rgba(0,0,0,0.02) }
</style>
