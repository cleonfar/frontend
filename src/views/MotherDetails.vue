<template>
  <div class="card root-card">
    <div class="header-row">
  <button class="icon-btn" @click="goBack" aria-label="Back"><span class="icon">←</span></button>
      <h2>Mother: {{ motherId }}</h2>
    </div>

    <section class="mt">
      <div class="row" v-if="littersError">
        <div class="error">{{ littersError }}</div>
      </div>

      <div class="mt">
        <details>
          <summary>Add litter</summary>
          <form @submit.prevent="onAddLitter">
            <div class="row">
              <label>Birth date</label>
              <input type="date" v-model="addLitter.birthDate" required />
            </div>
            <div class="row">
              <label>Father ID</label>
              <button class="small" @click="bulkWeanMother" :disabled="motherBulkWeanBusy">{{ motherBulkWeanBusy ? 'Weaning all offspring…' : 'Wean all offspring for this mother' }}</button>
              <div v-if="motherBulkWeanErr" class="error">{{ motherBulkWeanErr }}</div>
              <ul v-if="motherBulkWeanResults.length" class="muted small">
                <li v-for="r in motherBulkWeanResults" :key="r">{{ r }}</li>
              </ul>
              <input v-model="addLitter.fatherId" placeholder="optional" />
            </div>
            <div class="row">
              <label>Notes</label>
              <input v-model="addLitter.notes" placeholder="optional" />
            </div>
            <button :disabled="addingLitter">{{ addingLitter ? 'Adding…' : 'Add litter' }}</button>
            <div v-if="addLitterError" class="error">{{ addLitterError }}</div>
            <div v-if="addLitterOk" class="ok">Added.</div>
          </form>
        </details>
      </div>

      <div class="mt" v-if="litters.length">
        <div v-for="lit in litters" :key="lit.litterId" class="litter-block">
          <div class="litter-header">
            <strong>Litter born {{ lit.birthDate ? formatDate(lit.birthDate) : 'unknown' }}</strong>
            <span v-if="lit.notes" class="muted"> ({{ lit.notes }})</span>
            <button class="ml small" @click="toggleAddForLitter(lit)">{{ showAddByLitter[lit.litterId] ? 'Hide add form' : 'Add offspring to this litter' }}</button>
          </div>
          <ul v-if="offspringByLitter[lit.litterId] && offspringByLitter[lit.litterId].length" class="offspring-list">
            <li v-for="o in offspringByLitter[lit.litterId]" :key="o.offspringId" class="offspring-item">
              <span><strong>{{ o.offspringId }}</strong> — {{ o.sex || 'unknown' }}</span>
              <span class="status-pill" :class="statusClass(o)">{{ statusText(o) }}</span>
              <span v-if="o.notes" class="muted"> ({{ o.notes }})</span>
              <button class="ml small" @click="quickWean(o)" :disabled="acting[o.offspringId]">{{ acting[o.offspringId] ? 'Weaning…' : 'Wean' }}</button>
              <button class="ml small danger" @click="quickDeath(o)" :disabled="acting[o.offspringId]">{{ acting[o.offspringId] ? 'Marking…' : 'Mark dead' }}</button>
            </li>
          </ul>
          <div v-else-if="offspringByLitterLoading[lit.litterId]" class="muted">Loading…</div>
          <div v-else-if="offspringByLitterError[lit.litterId]" class="error">{{ offspringByLitterError[lit.litterId] }}</div>
          <div v-else><em>No offspring</em></div>

          <div v-if="showAddByLitter[lit.litterId]" class="mt">
            <form @submit.prevent="onAddOffspringForLitter(lit)">
              <div class="row">
                <label>Offspring ID</label>
                <input v-model="addByLitter[lit.litterId].offspringId" required placeholder="e.g. OFF-0001" />
              </div>
              <div class="row">
                <label>Sex</label>
                <select v-model="addByLitter[lit.litterId].sex" required>
                  <option value="male">male</option>
                  <option value="female">female</option>
                  <option value="neutered">neutered</option>
                </select>
              </div>
              <div class="row">
                <label>Notes</label>
                <input v-model="addByLitter[lit.litterId].notes" placeholder="optional" />
              </div>
              <button :disabled="addingByLitter[lit.litterId]">{{ addingByLitter[lit.litterId] ? 'Adding…' : 'Add offspring' }}</button>
              <div v-if="addErrByLitter[lit.litterId]" class="error">{{ addErrByLitter[lit.litterId] }}</div>
              <div v-if="addOkByLitter[lit.litterId]" class="ok">Added.</div>
            </form>
          </div>

          <div class="mt">
            <button class="small" @click="bulkWeanLitter(lit)" :disabled="bulkWeanBusy[lit.litterId]">{{ bulkWeanBusy[lit.litterId] ? 'Weaning litter…' : 'Wean entire litter' }}</button>
            <div v-if="bulkWeanErr[lit.litterId]" class="error">{{ bulkWeanErr[lit.litterId] }}</div>
            <ul v-if="bulkWeanResults[lit.litterId] && bulkWeanResults[lit.litterId].length" class="muted small">
              <li v-for="r in bulkWeanResults[lit.litterId]" :key="r">{{ r }}</li>
            </ul>
          </div>
        </div>
      </div>
      <div v-else-if="!littersLoading" class="muted">No litters found.</div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, getCurrentInstance } from 'vue'
import { postJson } from '@/utils/api'
import { formatDateMDY } from '@/utils/format'

const formatDate = formatDateMDY

const inst = getCurrentInstance()
const route: any = (inst as any)?.proxy?.$route
const router: any = (inst as any)?.proxy?.$router
const motherId = ref<string>('')

// Litter types and state
 type Litter = { litterId: string; birthDate?: string; notes?: string; internalLitterId?: string }
 type Offspring = { offspringId: string; sex?: string; notes?: string; litterId?: string; isAlive?: boolean; survivedTillWeaning?: boolean; weanDate?: string; deathDate?: string }

const litters = ref<Litter[]>([])
const littersLoading = ref(false)
const littersError = ref<string | null>(null)

const offspringByLitter = ref<Record<string, Offspring[]>>({})
const offspringByLitterLoading = ref<Record<string, boolean>>({})
const offspringByLitterError = ref<Record<string, string | undefined>>({})
const acting = ref<Record<string, boolean>>({})
const bulkWeanBusy = ref<Record<string, boolean>>({})
const bulkWeanErr = ref<Record<string, string | undefined>>({})
const bulkWeanResults = ref<Record<string, string[]>>({})

const showAddByLitter = ref<Record<string, boolean>>({})
const addByLitter = ref<Record<string, { offspringId: string; sex: string; notes?: string }>>({})
const addingByLitter = ref<Record<string, boolean>>({})
const addErrByLitter = ref<Record<string, string | undefined>>({})
const addOkByLitter = ref<Record<string, boolean>>({})

const addLitter = ref<{ birthDate: string; fatherId?: string; notes?: string }>({ birthDate: new Date().toISOString().slice(0,10), notes: '' })
const addingLitter = ref(false)
const addLitterError = ref<string | null>(null)
const addLitterOk = ref(false)
const motherBulkWeanBusy = ref(false)
const motherBulkWeanErr = ref<string | null>(null)
const motherBulkWeanResults = ref<string[]>([])

// Ack/backoff + envelope unwrapping helpers (match other Reproduction pages)
const MAX_RETRIES = 5
const BASE_DELAY_MS = 250
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))
const nextDelay = (attempt: number) => Math.min(2000, BASE_DELAY_MS * Math.pow(2, attempt))

function tryParseJSON<T = any>(val: any): T | any {
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return val }
  }
  return val
}

function unwrapEnvelope(obj: any): any {
  let cur = tryParseJSON(obj)
  let prev: any
  const keys = ['body','Body','payload','result','content','data','Data','Report','report']
  while (cur && typeof cur === 'object' && keys.some(k => k in cur) && cur !== prev) {
    prev = cur
    const next = (cur as any).body ?? (cur as any).Body ?? (cur as any).payload ?? (cur as any).result ?? (cur as any).content ?? (cur as any).data ?? (cur as any).Data ?? (cur as any).Report ?? (cur as any).report
    cur = tryParseJSON(next)
  }
  return cur
}

function extractArray(obj: any, preferredKeys: string[]): any[] {
  const o = tryParseJSON(unwrapEnvelope(obj))
  if (Array.isArray(o)) return o
  const keys = [
    ...preferredKeys,
    'litters','litter','offspring','items','data','list','results','children',
    'Litters','Litter','Offspring','Items','Data','List','Results','Children'
  ]
  if (o && typeof o === 'object') {
    for (const k of keys) {
      const v = (o as any)[k]
      if (Array.isArray(v)) return v
    }
    // scan one level deep
    for (const v of Object.values(o)) {
      if (Array.isArray(v)) return v
      const vv = tryParseJSON(v)
      if (vv && typeof vv === 'object') {
        for (const k of keys) {
          const nested = (vv as any)[k]
          if (Array.isArray(nested)) return nested
        }
      }
    }
  }
  return []
}

function normalizeLitter(l: any): Litter | null {
  if (!l) return null
  const isNumeric = (v: any) => typeof v === 'number' || (typeof v === 'string' && /^\d+$/.test(v))
  let id: any = l?.id ?? l?.Id ?? l?.ID
  if (!isNumeric(id)) id = l?.litterNumber ?? l?.LitterNumber ?? l?.number ?? l?.no ?? l?.litterNo ?? l?.LitterNo
  const internal = l?.litterId ?? l?.LitterId ?? l?._id
  if (!isNumeric(id)) id = internal
  if (id == null || String(id) === '') id = internal
  const litterId = id != null ? String(id) : ''
  const birthDate = l?.birthDate ?? l?.BirthDate ?? l?.date ?? l?.Date
  const notes = l?.notes ?? l?.Notes
  return litterId ? { litterId, birthDate: birthDate ? String(birthDate) : undefined, notes: notes ? String(notes) : undefined, internalLitterId: internal != null ? String(internal) : undefined } : null
}

async function loadLitters() {
  littersLoading.value = true
  littersError.value = null
  try {
    const payload = { motherId: motherId.value }
    let res: any
    let attempt = 0
    // Ack/retry loop
    // eslint-disable-next-line no-constant-condition
    while (true) {
      res = await postJson<typeof payload, any>('/api/ReproductionTracking/_listLittersByMother', payload)
      const unwrapped = unwrapEnvelope(res)
      const looksAck = res && typeof res === 'object' && typeof (res as any).request === 'string' && (!unwrapped || (Array.isArray(unwrapped) ? unwrapped.length === 0 : (typeof unwrapped !== 'object' || Object.keys(unwrapped).length === 0)))
      if (looksAck && attempt < MAX_RETRIES) {
        await sleep(nextDelay(attempt++))
        continue
      }
      break
    }
    const list = extractArray(res, ['litters','litter'])
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
    const normLitters = list.map(normalizeLitter).filter(Boolean) as Litter[]
    normLitters.sort((a, b) => collator.compare(a.litterId, b.litterId))
    litters.value = normLitters
    // Load offspring for each litter (use internal id for payload if available, but store by display id)
    await Promise.all(normLitters.map(l => loadOffspringByLitter(String(l.internalLitterId || l.litterId), l.litterId)))
  } catch (e: any) {
    littersError.value = e?.message ?? String(e)
  } finally {
    littersLoading.value = false
  }
}

async function loadOffspringByLitter(payloadLitterId: string, uiKey?: string) {
  const storeKey = uiKey || payloadLitterId
  offspringByLitterLoading.value[storeKey] = true
  offspringByLitterError.value[storeKey] = undefined
  try {
    const payload = { litterId: payloadLitterId }
    let res: any
    let attempt = 0
    // Ack/retry loop
    // eslint-disable-next-line no-constant-condition
    while (true) {
      res = await postJson<typeof payload, any>('/api/ReproductionTracking/_listOffspringByLitter', payload)
      const unwrapped = unwrapEnvelope(res)
      const looksAck = res && typeof res === 'object' && typeof (res as any).request === 'string' && (!unwrapped || (Array.isArray(unwrapped) ? unwrapped.length === 0 : (typeof unwrapped !== 'object' || Object.keys(unwrapped).length === 0)))
      if (looksAck && attempt < MAX_RETRIES) {
        await sleep(nextDelay(attempt++))
        continue
      }
      break
    }
    const list = extractArray(res, ['offspring'])
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
    const norm = list.map(o => ({
      offspringId: String((o as any).externalId ?? (o as any).ExternalId ?? (o as any).offspringId ?? (o as any).OffspringId ?? (o as any).id ?? (o as any).Id ?? (o as any)._id ?? ''),
      sex: (o as any).sex ?? (o as any).Sex,
      notes: (o as any).notes ?? (o as any).Notes,
      litterId: storeKey,
      isAlive: (o as any).isAlive ?? (o as any).alive ?? (o as any).Alive,
      survivedTillWeaning: (o as any).survivedTillWeaning ?? (o as any).survivedUntilWeaning ?? (o as any).weaned,
      weanDate: (o as any).weanDate ?? (o as any).weanedDate ?? (o as any).dateWeaned,
      deathDate: (o as any).deathDate ?? (o as any).dateOfDeath ?? (o as any).diedDate
    })).filter((o: Offspring) => !!o.offspringId).sort((a: Offspring, b: Offspring) => collator.compare(a.offspringId, b.offspringId))
    offspringByLitter.value[storeKey] = norm
  } catch (e: any) {
    offspringByLitterError.value[storeKey] = e?.message ?? String(e)
  } finally {
    offspringByLitterLoading.value[storeKey] = false
  }
}

function toggleAddForLitter(lit: Litter) {
  const id = lit.litterId
  showAddByLitter.value[id] = !showAddByLitter.value[id]
  if (!addByLitter.value[id]) addByLitter.value[id] = { offspringId: '', sex: 'female', notes: '' }
}

async function onAddLitter() {
  addLitterError.value = null
  addLitterOk.value = false
  addingLitter.value = true
  try {
    const p: any = {
      motherId: motherId.value,
      birthDate: (addLitter.value.birthDate || '').trim(),
      fatherId: (addLitter.value.fatherId || '').trim() || undefined,
      notes: (addLitter.value.notes || '').trim(),
    }
    await postJson<typeof p, any>('/api/ReproductionTracking/recordLitter', p)
    addLitterOk.value = true
    await loadLitters()
  } catch (e: any) {
    addLitterError.value = e?.message ?? String(e)
  } finally {
    addingLitter.value = false
  }
}

async function onAddOffspringForLitter(lit: Litter) {
  const id = lit.litterId
  addErrByLitter.value[id] = undefined
  addOkByLitter.value[id] = false
  addingByLitter.value[id] = true
  try {
    const form = addByLitter.value[id]
    const sendLitterId = lit.internalLitterId || lit.litterId
    const payload = {
      litterId: sendLitterId,
      offspringId: (form.offspringId || '').trim(),
      sex: form.sex,
      notes: (form.notes || '').trim(),
      motherId: motherId.value
    }
    await postJson<typeof payload, any>('/api/ReproductionTracking/recordOffspring', payload)
    addOkByLitter.value[id] = true
    await loadOffspringByLitter(String(sendLitterId), id)
    addByLitter.value[id].offspringId = ''
  } catch (e: any) {
    addErrByLitter.value[id] = e?.message ?? String(e)
  } finally {
    addingByLitter.value[id] = false
  }
}

onMounted(() => {
  try {
    const fromRoute = route?.params?.id ? String(route.params.id) : ''
    if (fromRoute) motherId.value = decodeURIComponent(fromRoute)
    if (!motherId.value) {
      const m = window.location.pathname.match(/\/mothers\/(.+)$/)
      if (m && m[1]) motherId.value = decodeURIComponent(m[1])
    }
  } catch {}
  if (motherId.value) loadLitters()
})

function goBack() {
  try {
    if (router && typeof router.back === 'function') router.back()
    else window.history.back()
  } catch {
    window.history.back()
  }
}

function statusText(o: Offspring) {
  if (o.deathDate || o.isAlive === false) return 'Died before weaning'
  if (o.weanDate || o.survivedTillWeaning === true) return 'Weaned'
  if (o.isAlive === true && o.survivedTillWeaning === false) return 'Not yet weaned'
  return '—'
}
function statusClass(o: Offspring) {
  const t = statusText(o)
  if (t === 'Weaned') return 'ok'
  if (t === 'Died before weaning') return 'danger'
  if (t === 'Not yet weaned') return 'warn'
  return 'muted'
}

async function quickWean(o: Offspring) {
  if (!o.offspringId) return
  acting.value[o.offspringId] = true
  try {
    const today = new Date().toISOString().slice(0,10)
    const p: any = { offspringId: o.offspringId, date: today, weanDate: today, notes: 'Weaned via manage view' }
    await postJson<typeof p, any>('/api/ReproductionTracking/recordWeaning', p)
    await loadOffspringByLitter(String(o.litterId))
  } catch (e: any) {
    alert(e?.message ?? String(e))
  } finally {
    acting.value[o.offspringId] = false
  }
}
async function quickDeath(o: Offspring) {
  if (!o.offspringId) return
  const ok = confirm(`Mark ${o.offspringId} as dead?`)
  if (!ok) return
  acting.value[o.offspringId] = true
  try {
    const today = new Date().toISOString().slice(0,10)
    const p: any = { offspringId: o.offspringId, date: today, deathDate: today, notes: 'Recorded via manage view' }
    await postJson<typeof p, any>('/api/ReproductionTracking/recordDeath', p)
    await loadOffspringByLitter(String(o.litterId))
  } catch (e: any) {
    alert(e?.message ?? String(e))
  } finally {
    acting.value[o.offspringId] = false
  }
}

async function bulkWeanLitter(lit: Litter) {
  const dataKey = lit.internalLitterId || lit.litterId
  const uiKey = lit.litterId
  if (!dataKey) return
  bulkWeanBusy.value[uiKey] = true
  bulkWeanErr.value[uiKey] = undefined
  bulkWeanResults.value[uiKey] = []
  try {
    // ensure offspring loaded
    if (!offspringByLitter.value[uiKey]) await loadOffspringByLitter(String(dataKey), uiKey)
  const kids = (offspringByLitter.value[uiKey] || []).filter(o => !o.weanDate && o.survivedTillWeaning !== true && !o.deathDate)
    const today = new Date().toISOString().slice(0,10)
    for (const o of kids) {
      try {
        const p: any = { offspringId: o.offspringId, date: today, weanDate: today, notes: `Weaned via litter bulk (${dataKey})` }
        await postJson<typeof p, any>('/api/ReproductionTracking/recordWeaning', p)
        bulkWeanResults.value[uiKey].push(`OK: ${o.offspringId}`)
      } catch (e: any) {
        bulkWeanResults.value[uiKey].push(`FAIL ${o.offspringId}: ${e?.message ?? String(e)}`)
      }
    }
    // refresh display by template key
    await loadOffspringByLitter(String(dataKey), uiKey)
  } catch (e: any) {
    bulkWeanErr.value[uiKey] = e?.message ?? String(e)
  } finally {
    bulkWeanBusy.value[uiKey] = false
  }
}

async function bulkWeanMother() {
  if (!litters.value.length) return
  motherBulkWeanBusy.value = true
  motherBulkWeanErr.value = null
  motherBulkWeanResults.value = []
  try {
    const today = new Date().toISOString().slice(0,10)
    for (const lit of litters.value) {
      const lid = lit.internalLitterId || lit.litterId // payload id
      const uiKey = lit.litterId
      if (!offspringByLitter.value[uiKey]) await loadOffspringByLitter(String(lid), uiKey)
      const kids = (offspringByLitter.value[uiKey] || []).filter(o => !o.weanDate && o.survivedTillWeaning !== true && !o.deathDate)
      for (const o of kids) {
        try {
          const p: any = { offspringId: o.offspringId, date: today, weanDate: today, notes: `Weaned via mother bulk (${motherId.value})` }
          await postJson<typeof p, any>('/api/ReproductionTracking/recordWeaning', p)
          motherBulkWeanResults.value.push(`OK: ${o.offspringId}`)
        } catch (e: any) {
          motherBulkWeanResults.value.push(`FAIL ${o.offspringId}: ${e?.message ?? String(e)}`)
        }
      }
      await loadOffspringByLitter(String(lid), uiKey)
    }
  } catch (e: any) {
    motherBulkWeanErr.value = e?.message ?? String(e)
  } finally {
    motherBulkWeanBusy.value = false
  }
}
</script>

<style scoped>
.mt { margin-top: 1rem }
.row { display: flex; gap: 0.5rem; align-items: center }
.error { color: #b00020 }
.ok { color: #2e7d32 }
.muted { color: #666 }
.small { font-size: 0.85rem }
.ml { margin-left: 0.5rem }
.litter-block { border-top: 1px dashed #ddd; padding: 0.5rem 0 }
.litter-header { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap }
.header-row { display: flex; align-items: center; gap: 0.75rem }
.header-row h2 { margin: 0 }
.icon-btn {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  background: var(--surface-2, #f5f5f5);
  color: var(--text, #1f2937);
  border: 1px solid var(--divider, #e5e7eb);
  border-radius: 999px;
}
.icon-btn .icon { display: inline-block; line-height: 1 }
.icon-btn:hover {
  background: #e8f5e9;
  color: var(--primary, #2e7d32);
  border-color: var(--primary, #2e7d32);
}
.icon-btn:focus {
  outline: 2px solid var(--primary, #2e7d32);
  outline-offset: 2px;
}
.offspring-list { list-style: none; padding: 0; margin: 0.25rem 0 }
.offspring-item { display: flex; align-items: center; gap: 0.5rem }
.status-pill { padding: 0.1rem 0.4rem; border-radius: 999px; font-size: 0.75rem }
.status-pill.ok { background: #e8f5e9 }
.status-pill.warn { background: #fff8e1 }
.status-pill.danger { background: #ffebee }
.danger { color: #b00020 }
</style>
