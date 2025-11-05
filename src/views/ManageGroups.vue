<template>
  <div class="card root-card">
    <h2>Manage Groups (Herds)</h2>
    <div class="tabs">
      <button :class="['tab', tab==='groups' && 'active']" @click="goTab('groups')">Groups</button>
      <button :class="['tab', tab==='split' && 'active']" @click="goTab('split')">Split Herd</button>
    </div>

    <section v-if="tab==='groups'">
      <h3>Groups</h3>
      <!-- Create new group moved above the list -->
      <div class="card sub mt">
        <div class="row between">
          <h3>Create new group</h3>
          <button type="button" @click="createBoxOpen = !createBoxOpen" :aria-expanded="createBoxOpen ? 'true' : 'false'">
            {{ createBoxOpen ? 'Hide' : 'Show' }}
          </button>
        </div>
        <form v-show="createBoxOpen" @submit.prevent="onCreateHerd">
          <div class="row">
            <label>Name</label>
            <input v-model="newHerd.name" required />
          </div>
          <div class="row">
            <label>Description</label>
            <input v-model="newHerd.description" />
          </div>
          <button :disabled="creating">{{ creating ? 'Creating…' : 'Create' }}</button>
        </form>
      </div>
      <div class="row">
        <button @click="toggleSelectGroups">{{ selectGroups ? 'Done selecting' : 'Select groups to merge' }}</button>
        <label class="ml"><input type="checkbox" v-model="showArchived" /> Show archived herds</label>
      </div>
      <div v-if="selectGroups && selectedGroupCount > 0" class="mt">
        <div class="row">
          <label>Target herd</label>
          <select v-model="batchMerge.targetName" :disabled="selectedGroupCount < 2">
            <option value="" disabled>Select target</option>
            <option v-for="name in selectedGroupNames" :key="'opt_'+name" :value="name">{{ name }}</option>
          </select>
        </div>
        <div class="row">
          <label>Description</label>
          <input v-model="batchMerge.description" placeholder="optional" />
        </div>
        <button @click="onMergeSelected" :disabled="mergingSelected || !batchMerge.targetName || selectedGroupCount < 2">{{ mergingSelected ? 'Merging…' : 'Merge selected' }} ({{ selectedGroupCount }})</button>
        <div v-if="mergeSelectedError" class="error">{{ mergeSelectedError }}</div>
        <ul v-if="mergeSelectedResults.length" class="mt">
          <li v-for="r in mergeSelectedResults" :key="r">{{ r }}</li>
        </ul>
      </div>
      <div v-if="loading">Loading...</div>
      <div v-if="error" class="error">Error: {{ error }}</div>
      <table v-if="herds.length">
        <thead>
          <tr>
            <th v-if="selectGroups">Select</th>
            <th>Name</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="h in herds" :key="h.name">
            <tr :class="selectGroups ? 'clickable-row' : ''" @click="onRowToggleGroup(h.name, $event)">
              <td v-if="selectGroups"><input type="checkbox" :checked="isGroupSelected(h.name)" @change="toggleGroupSelected(h.name)" /></td>
              <td><strong>{{ h.name }}</strong></td>
              <td>{{ h.description ?? '-' }}</td>
              <td class="actions-cell">
                <button @click="toggleMembers(h.name)">{{ membersExpanded[h.name] ? 'Hide members' : 'Members' }}</button>
                <button @click="toggleManage(h.name)">{{ managing[h.name] ? 'Hide' : 'Add/Remove animal' }}</button>
                <button @click="openSplitFor(h.name)">Split</button>
                <template v-if="rowConfirmDeleteHerd[h.name]">
                  <button class="danger" @click="onDeleteHerd(h.name, false)" :disabled="busy[h.name]">
                    {{ busy[h.name] ? 'Deleting…' : 'Confirm' }}
                  </button>
                  <button class="ml" @click="rowConfirmDeleteHerd[h.name] = false" :disabled="busy[h.name]">Cancel</button>
                </template>
                <template v-else>
                  <button class="danger" @click="rowConfirmDeleteHerd[h.name] = true" :disabled="busy[h.name]">Delete</button>
                </template>
              </td>
            </tr>
            <tr v-if="membersExpanded[h.name]">
              <td :colspan="selectGroups ? 4 : 3">
                <div class="members-box">
                  <strong>Members</strong>
                  <div v-if="membersLoading[h.name]" class="muted">Loading members…</div>
                  <div v-else-if="membersError[h.name]" class="error">{{ membersError[h.name] }}</div>
                  <div v-else-if="h.members && h.members.length">
                    <div class="muted">({{ h.members.length }})</div>
                    <ul class="members-list">
                      <li v-for="m in h.members" :key="m">{{ m }}</li>
                    </ul>
                  </div>
                  <div v-else>
                    <em>No members</em>
                  </div>
                </div>
              </td>
            </tr>
            <tr v-if="managing[h.name]">
              <td colspan="3">
                <div class="manage-box">
                  <div class="row">
                    <label>Add animal to {{ h.name }}</label>
                    <input v-model="addAnimalInputs[h.name]" placeholder="animal id" />
                    <button :disabled="busy[h.name]" @click="onAddAnimal(h.name)">Add</button>
                  </div>
                  <div class="row">
                    <label>Remove animal from {{ h.name }}</label>
                    <input v-model="removeAnimalInputs[h.name]" placeholder="animal id" />
                    <button :disabled="busy[h.name]" @click="onRemoveAnimal(h.name)">Remove</button>
                  </div>
                  <!-- Quick registration prompt when the animal isn't registered -->
                  <div v-if="regNeeded[h.name]" class="card sub mt">
                    <h4>This animal isn’t registered</h4>
                    <p class="muted">Please provide the required registration details to continue.</p>
                    <div class="grid-2">
                      <label>Animal ID
                        <input :value="regForm[h.name]?.id" readonly />
                      </label>
                      <label>Sex
                        <select v-model="regForm[h.name].sex">
                          <option value="male">male</option>
                          <option value="female">female</option>
                          <option value="neutered">neutered</option>
                        </select>
                      </label>
                      <div>
                        <label>Species
                          <select v-model="selectedSpecies[h.name]">
                            <option value="">Select…</option>
                            <option v-for="sp in KNOWN_SPECIES" :key="sp" :value="sp">{{ sp }}</option>
                            <option value="other">Other</option>
                          </select>
                        </label>
                        <div v-if="selectedSpecies[h.name] === 'other'">
                          <input v-model="customSpecies[h.name]" placeholder="Enter species" aria-label="Species" />
                        </div>
                      </div>
                      <label>Birth date
                        <input type="date" v-model="regForm[h.name].birthDate" />
                      </label>
                      <label>Breed (optional)
                        <input v-model="regForm[h.name].breed" placeholder="optional" />
                      </label>
                      <label>Notes
                        <input v-model="regForm[h.name].notes" placeholder="optional" />
                      </label>
                    </div>
                    <div class="row mt">
                      <button @click="onQuickRegisterAndAdd(h.name)" :disabled="regLoading[h.name]">{{ regLoading[h.name] ? 'Registering…' : 'Register and add' }}</button>
                      <button class="ml" @click="regNeeded[h.name] = false" :disabled="regLoading[h.name]">Cancel</button>
                      <div v-if="regError[h.name]" class="error ml">{{ regError[h.name] }}</div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <div v-else-if="!loading">No groups found.</div>
      <div v-if="showArchived" class="mt">
        <h4>Archived herds</h4>
        <div v-if="archivedLoading">Loading archived…</div>
        <div v-if="archivedError" class="error">Error: {{ archivedError }}</div>
        <table v-if="archivedHerds.length">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="h in archivedHerds" :key="'arch_'+h.name">
              <tr>
                <td><strong>{{ h.name }}</strong> <span class="muted">(archived)</span></td>
                <td>{{ h.description ?? '-' }}</td>
                <td class="actions-cell">
                  <button @click="toggleMembers(h.name)">{{ membersExpanded[h.name] ? 'Hide members' : 'Members' }}</button>
                  <!-- Managing animals in archived herds is hidden by default to avoid accidental edits -->
                  <template v-if="rowConfirmRestoreHerd[h.name]">
                    <button @click="onRestoreHerd(h.name)" :disabled="busy[h.name]">
                      {{ busy[h.name] ? 'Restoring…' : 'Confirm restore' }}
                    </button>
                    <button class="ml" @click="rowConfirmRestoreHerd[h.name] = false" :disabled="busy[h.name]">Cancel</button>
                  </template>
                  <template v-else>
                    <button :disabled="busy[h.name]" @click="rowConfirmRestoreHerd[h.name] = true">Restore</button>
                  </template>
                  <template v-if="rowConfirmDeleteHerd[h.name]">
                    <button class="danger" @click="onDeleteHerd(h.name, true)" :disabled="busy[h.name]">
                      {{ busy[h.name] ? 'Deleting…' : 'Confirm' }}
                    </button>
                    <button class="ml" @click="rowConfirmDeleteHerd[h.name] = false" :disabled="busy[h.name]">Cancel</button>
                  </template>
                  <template v-else>
                    <button class="danger" @click="rowConfirmDeleteHerd[h.name] = true" :disabled="busy[h.name]">Delete</button>
                  </template>
                </td>
              </tr>
              <tr v-if="membersExpanded[h.name]">
                <td colspan="3">
                  <div class="members-box">
                    <strong>Members</strong>
                    <div v-if="membersLoading[h.name]" class="muted">Loading members…</div>
                    <div v-else-if="membersError[h.name]" class="error">{{ membersError[h.name] }}</div>
                    <div v-else-if="h.members && h.members.length">
                      <div class="muted">({{ h.members.length }})</div>
                      <ul class="members-list">
                        <li v-for="m in h.members" :key="m">{{ m }}</li>
                      </ul>
                    </div>
                    <div v-else>
                      <em>No members</em>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
        <div v-else-if="!archivedLoading">No archived herds.</div>
      </div>
    </section>

    

    <!-- Split tab content -->
    <section v-else-if="tab==='split'" class="mt">
      <SplitHerd @split-completed="onSplitCompleted" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, getCurrentInstance } from 'vue'
import { postJson } from '@/utils/api'
import SplitHerd from '@/views/SplitHerd.vue'

type Herd = { name: string; description?: string; members?: string[] }

const herds = ref<Herd[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const showArchived = ref(false)
const archivedHerds = ref<Herd[]>([])
const archivedLoading = ref(false)
const archivedError = ref<string | null>(null)

const managing = ref<Record<string, boolean>>({})
const membersExpanded = ref<Record<string, boolean>>({})
const membersLoading = ref<Record<string, boolean>>({})
const membersError = ref<Record<string, string | undefined>>({})
const membersFetched = ref<Record<string, boolean>>({})
const busy = ref<Record<string, boolean>>({})
const addAnimalInputs = ref<Record<string, string>>({})
const removeAnimalInputs = ref<Record<string, string>>({})
const rowConfirmDeleteHerd = ref<Record<string, boolean>>({})
const rowConfirmRestoreHerd = ref<Record<string, boolean>>({})
// Quick registration per-herd state for adding unregistered animals
type RegReq = { id: string; species: string; sex: 'male'|'female'|'neutered'; birthDate: string; breed?: string; notes?: string }
const KNOWN_SPECIES = ['cow','sheep','goat','pig','horse','donkey','camel','buffalo','rabbit'] as const
const regNeeded = ref<Record<string, boolean>>({})
const regForm = ref<Record<string, RegReq>>({})
const selectedSpecies = ref<Record<string, string>>({})
const customSpecies = ref<Record<string, string>>({})
const regLoading = ref<Record<string, boolean>>({})
const regError = ref<Record<string, string | null>>({})
// Collapsible state for Create new group box
const createBoxOpen = ref(true)
const CREATE_BOX_KEY = 'groups.createBoxOpen'
onMounted(() => {
  try {
    const s = typeof window !== 'undefined' ? window.localStorage.getItem(CREATE_BOX_KEY) : null
    if (s != null) createBoxOpen.value = s === '1'
  } catch {}
})
watch(createBoxOpen, (v) => {
  try { if (typeof window !== 'undefined') window.localStorage.setItem(CREATE_BOX_KEY, v ? '1' : '0') } catch {}
})

// Select-many to merge (bulk) state
const selectGroups = ref(false)
const selectedGroups = ref<Record<string, boolean>>({})
const selectedGroupNames = ref<string[]>([])
const selectedGroupCount = ref(0)
watch(selectedGroups, () => {
  const names = Object.keys(selectedGroups.value).filter(k => selectedGroups.value[k])
  selectedGroupNames.value = names
  selectedGroupCount.value = names.length
  // Default target to the first selected herd if current target is no longer valid
  if (!names.includes(batchMerge.value.targetName)) {
    batchMerge.value.targetName = names[0] || ''
  }
}, { deep: true })

function toggleSelectGroups() {
  selectGroups.value = !selectGroups.value
}
function isGroupSelected(name: string) { return !!selectedGroups.value[name] }
function toggleGroupSelected(name: string) { selectedGroups.value[name] = !selectedGroups.value[name] }

function isInteractiveElement(el: HTMLElement | null): boolean {
  if (!el) return false
  const tag = el.tagName
  if (['BUTTON','A','INPUT','SELECT','TEXTAREA','LABEL'].includes(tag)) return true
  // If the click happened inside the actions cell, don't toggle row selection
  if (el.closest && el.closest('.actions-cell')) return true
  // Content editable or role-based interactive
  const role = el.getAttribute && el.getAttribute('role')
  if (role && /button|link|checkbox|switch|menu|option/i.test(role)) return true
  return false
}

function onRowToggleGroup(name: string, e: MouseEvent) {
  if (!selectGroups.value) return
  const target = e.target as HTMLElement | null
  if (isInteractiveElement(target)) return
  toggleGroupSelected(name)
}

const batchMerge = ref<{ targetName: string; description?: string }>({ targetName: '' })
const mergingSelected = ref(false)
const mergeSelectedError = ref<string | null>(null)
const mergeSelectedResults = ref<string[]>([])

async function onMergeSelected() {
  mergeSelectedError.value = null
  mergeSelectedResults.value = []
  const names = selectedGroupNames.value
  if (!names.length) { mergeSelectedError.value = 'Select at least one group'; return }
  if (names.length < 2) { mergeSelectedError.value = 'Select at least two groups to merge'; return }
  if (!batchMerge.value.targetName) { mergeSelectedError.value = 'Choose a target herd from the selection'; return }
  if (!names.includes(batchMerge.value.targetName)) { mergeSelectedError.value = 'Target herd must be one of the selected herds'; return }
  mergingSelected.value = true
  try {
    const normalize = (s: string) => String(s || '').trim()
    const target = normalize(batchMerge.value.targetName)
    const desc = (batchMerge.value.description || '').trim() || undefined
    // Merge every other selected herd into the chosen target (no rename). Ensure exactly n-1 calls.
    const others = names.filter(n => normalize(n) && normalize(n) !== target)
    for (const raw of others) {
      const name = normalize(raw)
      if (!name || name === target) continue
      try {
        // Backend contract: { herdNameToKeep, herdNameToArchive }
        const payload: any = { herdNameToKeep: target, herdNameToArchive: name, description: desc }
        await postJson<typeof payload, any>('/api/HerdGrouping/mergeHerds', payload)
        mergeSelectedResults.value.push(`OK: ${name} -> ${target}`)
      } catch (e: any) {
        const msg = String(e?.message ?? e ?? '')
        mergeSelectedResults.value.push(`FAIL: ${name} -> ${target}: ${msg}`)
      }
    }
    // Refresh lists and clear selection on success path
    await loadHerds()
    if (showArchived.value) {
      // Refresh archived list too, since sources are archived after merge
      await loadArchivedHerds()
    }
    // After the lists are reloaded, refresh any open members panels so they don't appear empty
    refreshOpenMembers()
    selectedGroups.value = {}
    // Keep select mode active but collapse batch panel until new selection
    batchMerge.value = { targetName: '', description: '' as any }
  } finally {
    mergingSelected.value = false
  }
}

const newHerd = ref<{ name: string; description?: string }>({ name: '' })
const creating = ref(false)

// Merge groups state
const mergeForm = ref<{ herdA: string; herdB: string; targetName: string; description?: string }>({ herdA: '', herdB: '', targetName: '' })
const merging = ref(false)
const mergeError = ref<string | null>(null)
const mergeOk = ref(false)

// Tabs state
const tab = ref<'groups' | 'split'>('groups')
const inst = getCurrentInstance()
const router: any = (inst as any)?.proxy?.$router
function goTab(t: 'groups' | 'split') {
  tab.value = t
  try {
    const q = new URLSearchParams(window.location.search)
    if (t === 'groups') q.delete('tab'); else q.set('tab', 'split')
    const url = `${window.location.pathname}${q.toString() ? '?' + q.toString() : ''}`
    if (router && typeof router.replace === 'function') router.replace(url)
    else window.history.replaceState({}, '', url)
  } catch {}
  // Whenever switching to groups section, refresh lists
  if (t === 'groups') {
    // Fire and forget; UI will show loading state
    loadHerds()
    if (showArchived.value) loadArchivedHerds()
  }
}
onMounted(() => {
  try {
    const qs = new URLSearchParams(window.location.search)
    const t = qs.get('tab')
    if (t === 'split') tab.value = 'split'
  } catch {}
})

function openSplitFor(name: string) {
  try {
    const q = new URLSearchParams(window.location.search)
    q.set('tab', 'split')
    q.set('source', name)
    const url = `${window.location.pathname}?${q.toString()}`
    if (router && typeof router.replace === 'function') router.replace(url)
    else window.history.replaceState({}, '', url)
  } catch {}
  tab.value = 'split'
}

// merge feature temporarily disabled

function toStringArray(val: any): string[] | undefined {
  if (!val) return undefined
  if (Array.isArray(val)) return val.map(v => String(v))
  return undefined
}

function normalizeHerd(h: any): Herd {
  const name = h?.name ?? h?.herdName ?? h?.HerdName ?? h?.id ?? h?.Id ?? ''
  const members = toStringArray(h?.members ?? h?.Members)
  return { name: String(name), description: h?.description ?? h?.Description, members }
}

// Helpers to locate a registered animal via the overview list endpoint
function extractId(a: any): string | undefined {
  if (a == null) return undefined
  if (typeof a === 'string' || typeof a === 'number') return String(a)
  const direct = (
    a.AnimalID ?? a.AnimalId ?? a.animalID ?? a.animalId ?? a.animal_id ??
    a.id ?? a.ID ?? a.Id ??
    a.identityId ?? a.identityID ?? a.IdentityId ?? a.IdentityID ??
    a.uid ?? a.UUID ?? a.uuid ?? a.uniqueId ?? a.uniqueID ??
    a.animal ?? a.name ?? a.code ?? a.animalCode ?? a.identifier ?? a.tag ?? a.earTag ?? a.ear_tag ?? a.identity ??
    a._id
  )
  if (direct != null) return String(direct)
  const nestedCandidates = [a.identity, a.meta, a.info, a.Animal, a.AnimalIdentity]
  for (const obj of nestedCandidates) {
    if (obj && typeof obj === 'object') {
      const nestedId = (obj.id ?? obj.ID ?? obj.Id ?? obj._id)
      if (nestedId != null) return String(nestedId)
    }
  }
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

async function findRegisteredAnimal(id: string): Promise<any | null> {
  const target = (id || '').trim()
  if (!target) return null
  try {
    const res = await postJson<any, any>('/api/AnimalIdentity/_getAllAnimals', {})
    let list: any[] = []
    if (Array.isArray(res)) list = res
    else if (res && typeof res === 'object') {
      if (Array.isArray(res.animals)) list = res.animals
      else if (Array.isArray(res.data)) list = res.data
      else if (Array.isArray(res.items)) list = res.items
      else if (res.body && typeof res.body === 'object') {
        if (Array.isArray(res.body.animals)) list = res.body.animals
        else if (Array.isArray(res.body.data)) list = res.body.data
        else if (Array.isArray(res.body.items)) list = res.body.items
      }
    }
    for (const a of list) {
      const aid = extractId(a)
      if (aid && String(aid) === target) return a
    }
    return null
  } catch {
    return null
  }
}

async function loadHerds() {
  loading.value = true
  error.value = null
  try {
  const res = await postJson<any, any>('/api/HerdGrouping/_listActiveHerds', {})
    let list: any[] = []
    if (Array.isArray(res)) list = res
    else if (res && typeof res === 'object') {
      if (Array.isArray(res.herds)) list = res.herds
      else if (Array.isArray(res.items)) list = res.items
      else if (Array.isArray(res.data)) list = res.data
    }
    herds.value = list.map(normalizeHerd).filter(h => h.name)
  } catch (e: any) {
    error.value = e?.message ?? String(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadHerds())

async function loadArchivedHerds() {
  archivedLoading.value = true
  archivedError.value = null
  try {
    const res = await postJson<any, any>('/api/HerdGrouping/_listArchivedHerds', {})
    let list: any[] = []
    if (Array.isArray(res)) list = res
    else if (res && typeof res === 'object') {
      if (Array.isArray(res.herds)) list = res.herds
      else if (Array.isArray(res.items)) list = res.items
      else if (Array.isArray(res.data)) list = res.data
    }
    archivedHerds.value = list.map(normalizeHerd).filter(h => h.name)
  } catch (e: any) {
    archivedError.value = e?.message ?? String(e)
  } finally {
    archivedLoading.value = false
  }
}

watch(showArchived, async (val) => {
  if (val && archivedHerds.value.length === 0 && !archivedLoading.value) {
    await loadArchivedHerds()
  }
})

function toggleManage(name: string) {
  managing.value[name] = !managing.value[name]
}

function toggleMembers(name: string) {
  membersExpanded.value[name] = !membersExpanded.value[name]
  if (membersExpanded.value[name]) {
    // When expanding, fetch if not already fetched and not currently loading
    const herd = herds.value.find(h => h.name === name)
    // Always refresh on expand to ensure up-to-date composition
    if (!membersLoading.value[name]) {
      loadHerdMembers(name, herd)
    }
  }
}

function resolveSpeciesFor(name: string): string {
  const sel = (selectedSpecies.value[name] || '').trim()
  const custom = (customSpecies.value[name] || '').trim()
  return sel === 'other' ? custom : sel
}

async function onQuickRegisterAndAdd(name: string) {
  regError.value[name] = null
  regLoading.value[name] = true
  try {
    const form = regForm.value[name]
    if (!form || !form.id) throw new Error('Missing animal ID')
    const species = resolveSpeciesFor(name)
    if (!species) throw new Error('Please select a species or enter a custom species')
    const payload: RegReq = {
      id: String(form.id).trim(),
      species,
      sex: form.sex,
      birthDate: (form.birthDate || '').trim(),
      breed: (form.breed || '').trim(),
      notes: (form.notes || '').trim()
    }
    await postJson<RegReq, any>('/api/AnimalIdentity/registerAnimal', payload)
    regNeeded.value[name] = false
    // After successful registration, attempt the add again
    await onAddAnimal(name)
  } catch (e: any) {
    regError.value[name] = e?.message ?? String(e)
  } finally {
    regLoading.value[name] = false
  }
}

async function loadHerdMembers(name: string, herd?: Herd) {
  membersLoading.value[name] = true
  membersError.value[name] = undefined
  try {
    const payload = { herdName: name }
    const res = await postJson<any, any>('/api/HerdGrouping/_viewComposition', payload)
    // Accept various shapes: { members: [...] } | { animals: [...] } | [...] | { data/items: [...] }
    let members: any = undefined
    if (Array.isArray(res)) {
      members = res
    } else if (res && typeof res === 'object') {
      if (Array.isArray(res.members)) members = res.members
      else if (Array.isArray(res.animals)) members = res.animals
      else if (Array.isArray(res.items)) members = res.items
      else if (Array.isArray(res.data)) members = res.data
    }
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
    const memberIds = Array.isArray(members)
      ? members.map((x: any) => String(x)).filter(Boolean).sort((a, b) => collator.compare(a, b))
      : []
    // Update the herd entry in-place
    let idx = herds.value.findIndex(h => h.name === name)
    if (idx >= 0) {
      const h = herds.value[idx]
      herds.value[idx] = { ...h, members: memberIds }
    } else {
      // If not in active herds, try archived
      const j = archivedHerds.value.findIndex(h => h.name === name)
      if (j >= 0) {
        const h = archivedHerds.value[j]
        archivedHerds.value[j] = { ...h, members: memberIds }
      }
    }
    membersFetched.value[name] = true
  } catch (e: any) {
    membersError.value[name] = e?.message ?? String(e)
  } finally {
    membersLoading.value[name] = false
  }
}

async function onCreateHerd() {
  if (!newHerd.value.name.trim()) return
  creating.value = true
  error.value = null
  try {
    const payload = { name: newHerd.value.name, description: newHerd.value.description || '' }
    await postJson<typeof payload, any>('/api/HerdGrouping/createHerd', payload)
    newHerd.value = { name: '' }
    await loadHerds()
  } catch (e: any) {
    error.value = e?.message ?? String(e)
  } finally {
    creating.value = false
  }
}

async function onDeleteHerd(name: string, isArchived: boolean) {
  busy.value[name] = true
  error.value = null
  try {
    const payload = { herdName: name }
    await postJson<typeof payload, any>('/api/HerdGrouping/deleteHerd', payload)
    // Remove from the right list and clear state caches
    if (isArchived) {
      archivedHerds.value = archivedHerds.value.filter(h => h.name !== name)
    } else {
      herds.value = herds.value.filter(h => h.name !== name)
      // Deleting an active herd archives it; refresh archived list to reflect the change
      await loadArchivedHerds()
    }
    delete managing.value[name]
    delete membersExpanded.value[name]
    delete membersLoading.value[name]
    delete membersError.value[name]
    delete membersFetched.value[name]
    delete busy.value[name]
    delete addAnimalInputs.value[name]
    delete removeAnimalInputs.value[name]
    rowConfirmDeleteHerd.value[name] = false
  } catch (e: any) {
    error.value = e?.message ?? String(e)
  } finally {
    busy.value[name] = false
  }
}

function refreshHerdMembersIfCached(name: string) {
  // If members panel has been expanded before (cached) or is currently expanded,
  // refresh the composition so the UI stays in sync after add/remove.
  if (membersExpanded.value[name] || membersFetched.value[name]) {
    // Trigger a background refresh; UI will show loading state if expanded
    loadHerdMembers(name)
  }
}

async function onAddAnimal(name: string) {
  const animal = (addAnimalInputs.value[name] || '').trim()
  if (!animal) return
  // Check registration first; if missing, prompt for quick registration
  error.value = null
  try {
    const record = await findRegisteredAnimal(animal)
    if (!record) {
      const todayStr = new Date().toISOString().slice(0,10)
      regForm.value[name] = { id: animal, species: '', sex: 'male', birthDate: todayStr, breed: '', notes: '' }
      selectedSpecies.value[name] = ''
      customSpecies.value[name] = ''
      regError.value[name] = null
      regNeeded.value[name] = true
      return
    }
  } catch {}
  busy.value[name] = true
  try {
    const payload = { herdName: name, animal }
    await postJson<typeof payload, any>('/api/HerdGrouping/addAnimal', payload)
    addAnimalInputs.value[name] = ''
    // After a successful add, refresh members if the list was viewed before
    refreshHerdMembersIfCached(name)
  } catch (e: any) {
    error.value = e?.message ?? String(e)
  } finally {
    busy.value[name] = false
  }
}

async function onRemoveAnimal(name: string) {
  const animal = (removeAnimalInputs.value[name] || '').trim()
  if (!animal) return
  busy.value[name] = true
  error.value = null
  try {
    const payload = { herdName: name, animal }
    await postJson<typeof payload, any>('/api/HerdGrouping/removeAnimal', payload)
    removeAnimalInputs.value[name] = ''
    // After a successful removal, refresh members if the list was viewed before
    refreshHerdMembersIfCached(name)
  } catch (e: any) {
    error.value = e?.message ?? String(e)
  } finally {
    busy.value[name] = false
  }
}

// Split & Merge handlers
async function onMergeHerds() {
  mergeError.value = null
  mergeOk.value = false
  if (!mergeForm.value.herdA || !mergeForm.value.herdB || !mergeForm.value.targetName) {
    mergeError.value = 'Please select two groups and enter the herd to keep.'
    return
  }
  if (mergeForm.value.herdA === mergeForm.value.herdB) {
    mergeError.value = 'Choose two different groups to merge.'
    return
  }
  // Target must be one of the two herds (no rename supported by backend)
  const t = (mergeForm.value.targetName || '').trim()
  if (t !== mergeForm.value.herdA && t !== mergeForm.value.herdB) {
    mergeError.value = 'Target must be one of the two selected herds.'
    return
  }
  merging.value = true
  try {
    const target = t
    const source = mergeForm.value.herdA === target ? mergeForm.value.herdB : mergeForm.value.herdA
    const payload: any = {
      herdNameToKeep: target,
      herdNameToArchive: source,
      description: (mergeForm.value.description || '').trim() || undefined,
    }
    await postJson<typeof payload, any>('/api/HerdGrouping/mergeHerds', payload)
    mergeOk.value = true
    await loadHerds()
    if (showArchived.value) {
      await loadArchivedHerds()
    }
    // Ensure any expanded members panels are refreshed to reflect updated compositions
    refreshOpenMembers()
    mergeForm.value = { herdA: '', herdB: '', targetName: '', description: '' as any }
  } catch (e: any) {
    mergeError.value = e?.message ?? String(e)
  } finally {
    merging.value = false
  }
}


async function onRestoreHerd(name: string) {
  busy.value[name] = true
  error.value = null
  try {
    const payload = { herdName: name }
    await postJson<typeof payload, any>('/api/HerdGrouping/restoreHerd', payload)
    // Move from archived to active
    archivedHerds.value = archivedHerds.value.filter(h => h.name !== name)
    // Refresh active herds to include it (ensures we reflect server shape accurately)
    await loadHerds()
    // Clear any cached per-herd UI state
    delete managing.value[name]
    delete membersExpanded.value[name]
    delete membersLoading.value[name]
    delete membersError.value[name]
    delete membersFetched.value[name]
    delete addAnimalInputs.value[name]
    delete removeAnimalInputs.value[name]
    rowConfirmRestoreHerd.value[name] = false
  } catch (e: any) {
    error.value = e?.message ?? String(e)
  } finally {
    busy.value[name] = false
  }
}

function refreshOpenMembers() {
  const names = Object.keys(membersExpanded.value).filter(n => membersExpanded.value[n])
  for (const name of names) {
    // Fire and forget; if the herd is in archived list instead, loadHerdMembers will update it
    loadHerdMembers(name)
  }
}
// Handle split completion from SplitHerd tab: refresh herds and recompute members for affected herds
async function onSplitCompleted(evt: { source: string; target: string }) {
  try {
    // Navigate back to groups tab and clean URL
    tab.value = 'groups'
    try {
      const q = new URLSearchParams(window.location.search)
      q.delete('tab')
      q.delete('source')
      const url = `${window.location.pathname}${q.toString() ? '?' + q.toString() : ''}`
      if (router && typeof router.replace === 'function') router.replace(url)
      else window.history.replaceState({}, '', url)
    } catch {}

    await loadHerds()
    if (showArchived.value) {
      await loadArchivedHerds()
    }
    const src = (evt?.source || '').trim()
    const tgt = (evt?.target || '').trim()
    if (src) await loadHerdMembers(src)
    if (tgt) await loadHerdMembers(tgt)
  } catch {}
}
</script>

<style scoped>
.error { color: #b00020; margin: 0.5rem 0 }
.mt { margin-top: 1.5rem }
.row { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem }
.actions-cell { display: flex; gap: 0.5rem }
.danger { color: #b00020 }
.manage-box { background: #fafafa; padding: 0.75rem; border: 1px solid #eee; border-radius: 6px }
.keeps { display: flex; gap: 0.75rem; align-items: center }
.muted { color: #666 }
input, select { padding: 0.25rem 0.5rem }
button { padding: 0.35rem 0.7rem }
.grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1rem }
.card.sub { padding: 1rem }
 .row.between { justify-content: space-between }
 /* Segmented tab style (consistent across views) */
 .tabs {
  display: flex;
  gap: 0.25rem;
  margin: 0.5rem 0 1rem;
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
.ml { margin-left: 0.5rem }
.root-card { max-width: 900px; margin: 0 auto; }
.clickable-row { cursor: pointer }
.clickable-row:hover { background: var(--surface-2, #fafafa) }
</style>
