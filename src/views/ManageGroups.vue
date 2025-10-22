<template>
  <div class="card">
    <h2>Manage Groups (Herds)</h2>

    <section>
      <h3>Groups</h3>
      <div v-if="loading">Loading...</div>
      <div v-if="error" class="error">Error: {{ error }}</div>
      <table v-if="herds.length">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="h in herds" :key="h.name">
            <tr>
              <td><strong>{{ h.name }}</strong></td>
              <td>{{ h.description ?? '-' }}</td>
              <td class="actions-cell">
                <button @click="toggleMembers(h.name)">{{ membersExpanded[h.name] ? 'Hide members' : 'Members' }}</button>
                <button @click="toggleManage(h.name)">{{ managing[h.name] ? 'Hide' : 'Manage' }}</button>
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
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <div v-else-if="!loading">No groups found.</div>
    </section>

    <section class="mt">
      <h3>Create new group</h3>
      <form @submit.prevent="onCreateHerd">
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
    </section>

    <!-- Merge groups temporarily disabled -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { postJson } from '@/utils/api'

type Herd = { name: string; description?: string; members?: string[] }

const herds = ref<Herd[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const managing = ref<Record<string, boolean>>({})
const membersExpanded = ref<Record<string, boolean>>({})
const membersLoading = ref<Record<string, boolean>>({})
const membersError = ref<Record<string, string | undefined>>({})
const membersFetched = ref<Record<string, boolean>>({})
const busy = ref<Record<string, boolean>>({})
const addAnimalInputs = ref<Record<string, string>>({})
const removeAnimalInputs = ref<Record<string, string>>({})

const newHerd = ref<{ name: string; description?: string }>({ name: '' })
const creating = ref(false)

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

async function loadHerds() {
  loading.value = true
  error.value = null
  try {
  const res = await postJson<any, any>('/api/HerdGrouping/_listHerds', {})
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

function toggleManage(name: string) {
  managing.value[name] = !managing.value[name]
}

function toggleMembers(name: string) {
  membersExpanded.value[name] = !membersExpanded.value[name]
  if (membersExpanded.value[name]) {
    // When expanding, fetch if not already fetched and not currently loading
    const herd = herds.value.find(h => h.name === name)
    if (!membersFetched.value[name] && !membersLoading.value[name]) {
      loadHerdMembers(name, herd)
    }
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
    const memberIds = Array.isArray(members) ? members.map((x: any) => String(x)) : []
    // Update the herd entry in-place
    const idx = herds.value.findIndex(h => h.name === name)
    if (idx >= 0) {
      const h = herds.value[idx]
      herds.value[idx] = { ...h, members: memberIds }
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
    const payload = { name: newHerd.value.name, description: newHerd.value.description }
    await postJson<typeof payload, any>('/api/HerdGrouping/createHerd', payload)
    newHerd.value = { name: '' }
    await loadHerds()
  } catch (e: any) {
    error.value = e?.message ?? String(e)
  } finally {
    creating.value = false
  }
}

// Remove herd action temporarily disabled

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
  busy.value[name] = true
  error.value = null
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

// onMerge temporarily removed (merge feature disabled)
</script>

<style scoped>
.card { max-width: 1000px }
.error { color: #b00020; margin: 0.5rem 0 }
.mt { margin-top: 1.5rem }
.row { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem }
.actions-cell { display: flex; gap: 0.5rem }
.danger { color: #b00020 }
.manage-box { background: #fafafa; padding: 0.75rem; border: 1px solid #eee; border-radius: 6px }
.keeps { display: flex; gap: 0.75rem; align-items: center }
input, select { padding: 0.25rem 0.5rem }
button { padding: 0.35rem 0.7rem }
</style>
