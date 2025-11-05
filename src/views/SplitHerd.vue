<template>
  <div class="card root-card">
    <h2>Split Herd</h2>

    <form class="row wrap" @submit.prevent>
      <div class="row">
        <label>Source herd</label>
        <select v-model="sourceHerd" @change="onSourceChange">
          <option value="">Select…</option>
          <option v-for="h in herds" :key="h.name" :value="h.name">{{ h.name }}</option>
        </select>
      </div>
      <div class="row">
        <label>New herd name</label>
        <input v-model="targetName" placeholder="e.g. Herd-B" />
      </div>
      <div class="row">
        <button class="secondary" type="button" @click="refreshMembers" :disabled="!sourceHerd || loadingMembers">{{ loadingMembers ? 'Refreshing…' : 'Refresh' }}</button>
      </div>
    </form>

    <div v-if="error" class="error">{{ error }}</div>

    <div class="split-grid mt" v-if="sourceHerd">
      <!-- Left: stays in source herd -->
      <div class="pane">
        <div class="pane-header">
          <h3>Current herd ({{ sourceHerd }})</h3>
          <span class="muted">{{ left.length }} animal(s)</span>
        </div>
        <div class="pane-actions">
          <label><input type="checkbox" :checked="allLeftChecked" @change="toggleAllLeft($event)" /> Select all</label>
          <button class="secondary" type="button" @click="moveSelectedLeftToRight" :disabled="!selectedLeft.size">Move selected →</button>
          <button class="secondary" type="button" @click="moveAllLeftToRight" :disabled="!left.length">Move all →</button>
        </div>
        <ul class="list">
          <li v-for="id in left" :key="`l_${id}`" class="row between">
            <label class="row">
              <input type="checkbox" :checked="selectedLeft.has(id)" @change="toggleLeft(id)" />
              <span>{{ id }}</span>
            </label>
            <button type="button" @click="moveOneLeftToRight(id)">→</button>
          </li>
        </ul>
      </div>

      <!-- Right: will be in new herd -->
      <div class="pane">
        <div class="pane-header">
          <h3>New herd ({{ targetName || 'unnamed' }})</h3>
          <span class="muted">{{ right.length }} animal(s)</span>
        </div>
        <div class="pane-actions">
          <label><input type="checkbox" :checked="allRightChecked" @change="toggleAllRight($event)" /> Select all</label>
          <button class="secondary" type="button" @click="moveSelectedRightToLeft" :disabled="!selectedRight.size">← Move selected</button>
          <button class="secondary" type="button" @click="moveAllRightToLeft" :disabled="!right.length">← Move all</button>
        </div>
        <ul class="list">
          <li v-for="id in right" :key="`r_${id}`" class="row between">
            <button type="button" @click="moveOneRightToLeft(id)">←</button>
            <label class="row">
              <input type="checkbox" :checked="selectedRight.has(id)" @change="toggleRight(id)" />
              <span>{{ id }}</span>
            </label>
          </li>
        </ul>
      </div>
    </div>

    <div class="row mt">
      <button class="primary" @click="onConfirm" :disabled="!canConfirm || busy">{{ busy ? 'Splitting…' : 'Confirm split' }}</button>
      <button class="ml" type="button" @click="onCancel">Cancel</button>
      <div v-if="ok" class="ok ml">Split completed.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, getCurrentInstance } from 'vue'
import { postJson } from '@/utils/api'
const emit = defineEmits<{ (e: 'split-completed', payload: { source: string; target: string; animals: string[] }): void }>()

// Herds list and source/target inputs
type Herd = { name: string; description?: string }
const herds = ref<Herd[]>([])
const sourceHerd = ref('')
const targetName = ref('')
const error = ref<string | null>(null)

// Members
const left = ref<string[]>([])
const right = ref<string[]>([])
const loadingMembers = ref(false)

// Selections
const selectedLeft = ref<Set<string>>(new Set())
const selectedRight = ref<Set<string>>(new Set())
const allLeftChecked = computed(() => left.value.length > 0 && selectedLeft.value.size === left.value.length)
const allRightChecked = computed(() => right.value.length > 0 && selectedRight.value.size === right.value.length)

function resetSelections() {
  selectedLeft.value = new Set()
  selectedRight.value = new Set()
}

function toggleLeft(id: string) {
  const s = new Set(selectedLeft.value)
  if (s.has(id)) s.delete(id); else s.add(id)
  selectedLeft.value = s
}
function toggleRight(id: string) {
  const s = new Set(selectedRight.value)
  if (s.has(id)) s.delete(id); else s.add(id)
  selectedRight.value = s
}
function toggleAllLeft(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  selectedLeft.value = checked ? new Set(left.value) : new Set()
}
function toggleAllRight(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  selectedRight.value = checked ? new Set(right.value) : new Set()
}

function moveOneLeftToRight(id: string) {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
  left.value = left.value.filter(x => x !== id)
  right.value = [...right.value, id].sort((a, b) => collator.compare(a, b))
  selectedLeft.value.delete(id)
}
function moveOneRightToLeft(id: string) {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
  right.value = right.value.filter(x => x !== id)
  left.value = [...left.value, id].sort((a, b) => collator.compare(a, b))
  selectedRight.value.delete(id)
}
function moveSelectedLeftToRight() {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
  const ids = Array.from(selectedLeft.value)
  left.value = left.value.filter(x => !selectedLeft.value.has(x))
  right.value = [...right.value, ...ids].sort((a, b) => collator.compare(a, b))
  selectedLeft.value.clear()
}
function moveSelectedRightToLeft() {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
  const ids = Array.from(selectedRight.value)
  right.value = right.value.filter(x => !selectedRight.value.has(x))
  left.value = [...left.value, ...ids].sort((a, b) => collator.compare(a, b))
  selectedRight.value.clear()
}
function moveAllLeftToRight() {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
  right.value = [...right.value, ...left.value].sort((a, b) => collator.compare(a, b))
  left.value = []
  selectedLeft.value.clear()
}
function moveAllRightToLeft() {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
  left.value = [...left.value, ...right.value].sort((a, b) => collator.compare(a, b))
  right.value = []
  selectedRight.value.clear()
}

async function loadActiveHerds() {
  try {
    const res = await postJson<any, any>('/api/HerdGrouping/_listActiveHerds', {})
    let list: any[] = []
    if (Array.isArray(res)) list = res
    else if (res && typeof res === 'object') {
      if (Array.isArray(res.herds)) list = res.herds
      else if (Array.isArray(res.items)) list = res.items
      else if (Array.isArray(res.data)) list = res.data
    }
    herds.value = list.map(h => ({ name: String(h?.name ?? h?.herdName ?? h?.id ?? '') })).filter(h => h.name)
  } catch (e: any) {
    error.value = e?.message ?? String(e)
  }
}

async function loadMembers(name: string) {
  if (!name) return
  loadingMembers.value = true
  error.value = null
  try {
    const payload = { herdName: name }
    const res = await postJson<any, any>('/api/HerdGrouping/_viewComposition', payload)
    let members: any[] = []
    if (Array.isArray(res)) members = res
    else if (res && typeof res === 'object') {
      if (Array.isArray(res.members)) members = res.members
      else if (Array.isArray(res.animals)) members = res.animals
      else if (Array.isArray(res.items)) members = res.items
      else if (Array.isArray(res.data)) members = res.data
    }
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
  left.value = members.map(x => String(x)).filter(Boolean).sort((a, b) => collator.compare(a, b))
    right.value = []
    resetSelections()
  } catch (e: any) {
    error.value = e?.message ?? String(e)
  } finally {
    loadingMembers.value = false
  }
}

function onSourceChange() {
  if (sourceHerd.value) loadMembers(sourceHerd.value)
}
async function refreshMembers() {
  if (sourceHerd.value) await loadMembers(sourceHerd.value)
}

const busy = ref(false)
const ok = ref(false)
const canConfirm = computed(() => {
  const s = (sourceHerd.value || '').trim()
  const t = (targetName.value || '').trim()
  if (!s || !t) return false
  // Prevent same-name split (case-insensitive, trimmed)
  if (s.toLowerCase() === t.toLowerCase()) return false
  return right.value.length >= 0
})

const inst = getCurrentInstance()
const router: any = (inst as any)?.proxy?.$router

async function onConfirm() {
  error.value = null
  ok.value = false
  if (!sourceHerd.value || !targetName.value) {
    error.value = 'Please select a source herd and enter a new herd name.'
    return
  }
  const s = (sourceHerd.value || '').trim()
  const t = (targetName.value || '').trim()
  if (!s || !t) {
    error.value = 'Please select a source herd and enter a new herd name.'
    return
  }
  if (s.toLowerCase() === t.toLowerCase()) {
    error.value = 'New herd name must be different from the source herd.'
    return
  }
  busy.value = true
  try {
    const animals = right.value.slice()
  // Backend contract expects { sourceHerdName, targetHerdName, animalsToMove }
  const payload: any = { sourceHerdName: s, targetHerdName: t, animalsToMove: animals, description: '' }
    await postJson<typeof payload, any>('/api/HerdGrouping/splitHerd', payload)
    ok.value = true
    // Notify parent (ManageGroups) so it can refresh lists/members
    emit('split-completed', { source: s, target: t, animals })
  } catch (e: any) {
    error.value = e?.message ?? String(e)
  } finally {
    busy.value = false
  }
}

function onCancel() {
  if (router && typeof router.push === 'function') router.push('/groups')
  else window.location.href = '/groups'
}

onMounted(async () => {
  await loadActiveHerds()
  // Preselect from URL if provided
  try {
    const qs = new URLSearchParams(window.location.search)
    const s = qs.get('source')
    if (s) {
      sourceHerd.value = s
      await loadMembers(s)
    }
  } catch {}
})
</script>

<style scoped>
.split-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem }
.pane { background: var(--surface, #fff); border: 1px solid var(--divider, #e5e7eb); border-radius: 8px; padding: 0.75rem }
.pane-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 0.25rem }
.pane-actions { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap }
.list { list-style: none; padding: 0; margin: 0; max-height: 50vh; overflow: auto }
.row { display: flex; gap: 0.5rem; align-items: center }
.row.wrap { flex-wrap: wrap }
.row.between { justify-content: space-between }
.ml { margin-left: 0.5rem }
</style>
