<template>
  <div class="card root-card">
  <h2>Mothers & Offspring</h2>

    <!-- Tabs -->
    <div class="tabs">
      <button :class="['tab', activeTab === 'mothers' && 'active']" @click="activeTab = 'mothers'">Mothers Overview</button>
      <button :class="['tab', activeTab === 'reports' && 'active']" @click="activeTab = 'reports'">Reports</button>
    </div>


    <!-- Mothers & Litters Tab -->
    <section v-if="activeTab === 'mothers'">
      <form @submit.prevent="onAddMother">
        <div class="row">
          <label>Mother ID</label>
          <input v-model="addMotherForm.motherId" required placeholder="e.g. M-0001" />
          <button :disabled="addingMother">{{ addingMother ? 'Adding…' : 'Add mother' }}</button>
        </div>
        <div v-if="addMotherError" class="error">{{ addMotherError }}</div>
        <div v-if="addMotherOk" class="ok">Added.</div>
      </form>

      <!-- Warning confirmation if mother is sold or deceased -->
      <div v-if="motherStatusConfirmNeeded" class="card sub mt">
        <h4>Confirm action</h4>
        <p class="muted">{{ motherStatusMessage }}</p>
        <div class="row mt">
          <button class="danger" @click="confirmProceedAddMother" :disabled="addingMother">{{ addingMother ? 'Adding…' : 'Proceed anyway' }}</button>
          <button class="ml" @click="cancelProceedAddMother" :disabled="addingMother">Cancel</button>
        </div>
      </div>

      <!-- Quick registration prompt if mother is not registered -->
      <div v-if="motherRegNeeded" class="card sub mt">
        <h4>This mother isn’t registered</h4>
        <p class="muted">Please provide registration details to continue.</p>
        <div class="grid-2">
          <label>Mother ID
            <input v-model="regMotherForm.id" readonly />
          </label>
          <label>Sex
            <select v-model="regMotherForm.sex">
              <option value="female">female</option>
              <option value="male">male</option>
              <option value="neutered">neutered</option>
            </select>
          </label>
          <div>
            <label>Species
              <select v-model="selectedMotherSpecies">
                <option value="">Select…</option>
                <option v-for="sp in KNOWN_SPECIES" :key="sp" :value="sp">{{ sp }}</option>
                <option value="other">Other</option>
              </select>
            </label>
            <div v-if="selectedMotherSpecies === 'other'">
              <input v-model="customMotherSpecies" placeholder="Enter species" aria-label="Species" />
            </div>
          </div>
          <label>Birth date
            <input type="date" v-model="regMotherForm.birthDate" />
          </label>
          <label>Breed (optional)
            <input v-model="regMotherForm.breed" placeholder="optional" />
          </label>
          <label>Notes
            <input v-model="regMotherForm.notes" placeholder="optional" />
          </label>
        </div>
        <div class="row mt">
          <button @click="onQuickRegisterAndAddMother" :disabled="regMotherLoading">{{ regMotherLoading ? 'Registering…' : 'Register and add mother' }}</button>
          <button class="ml" @click="motherRegNeeded = false" :disabled="regMotherLoading">Cancel</button>
          <div v-if="regMotherError" class="error ml">{{ regMotherError }}</div>
        </div>
      </div>

      <h3>Mothers</h3>
      <div class="row">
        <button @click="toggleSelectMothers">{{ selectMothers ? 'Done selecting' : 'Select mothers for report' }}</button>
        <button class="ml" v-if="selectMothers" @click="showBatch = !showBatch" :disabled="selectedMotherCount === 0">
          {{ showBatch ? 'Hide batch' : 'Create report for selected' }} ({{ selectedMotherCount }})
        </button>
        <div v-if="mothersError" class="error">{{ mothersError }}</div>
      </div>
      <div v-if="selectMothers && showBatch && selectedMotherCount > 0" class="mt">
        <div class="row">
          <label>Start</label>
          <input type="date" v-model="batch.start" required />
        </div>
        <div class="row">
          <label>End</label>
          <input type="date" v-model="batch.end" required />
        </div>
        <div class="row">
          <label>Report name</label>
          <input v-model="batch.name" required placeholder="e.g. Fall-2025" />
        </div>
        <button @click="onGenerateBatchSelected" :disabled="batching">{{ batching ? 'Generating…' : 'Generate for selected' }}</button>
        <div v-if="batchError" class="error">{{ batchError }}</div>
        <ul v-if="batchResults.length" class="mt">
          <li v-for="r in batchResults" :key="r">{{ r }}</li>
        </ul>
      </div>
      <table v-if="mothers.length">
        <thead>
          <tr>
            <th v-if="selectMothers">Select</th>
            <th>Mother ID</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="mid in mothers" :key="mid">
            <tr class="clickable-row" @click="toggleMother(mid)">
              <td v-if="selectMothers" @click.stop>
                <input type="checkbox" :checked="isMotherSelected(mid)" @change="toggleMotherSelected(mid)" />
              </td>
              <td><strong>{{ mid }}</strong></td>
              <td>
                <button @click.stop="goMother(mid)">Manage offspring</button>
                <template v-if="rowConfirmDeleteMother[mid]">
                  <button class="ml danger" @click.stop.prevent="confirmRemoveMother(mid)" :disabled="removingMother[mid]">
                    {{ removingMother[mid] ? 'Removing…' : 'Confirm' }}
                  </button>
                  <button class="ml" @click.stop.prevent="rowConfirmDeleteMother[mid] = false" :disabled="removingMother[mid]">Cancel</button>
                </template>
                <template v-else>
                  <button class="ml danger" @click.stop.prevent="rowConfirmDeleteMother[mid] = true" :disabled="removingMother[mid]">
                    Remove
                  </button>
                </template>
              </td>
            </tr>
            <tr v-if="expanded[mid]">
              <td colspan="2">
                <div class="offspring-box">
                  <strong>Litters</strong>
                  <div v-if="littersLoading[mid]" class="muted">Loading…</div>
                  <div v-else-if="littersError[mid]" class="error">{{ littersError[mid] }}</div>
                  <div v-else>
                    <template v-if="littersByMother[mid] && littersByMother[mid].length">
                      <div v-for="lit in littersByMother[mid]" :key="lit.litterId" class="litter-block">
                        <div class="litter-header">
                          <strong>Litter born {{ lit.date ? formatDate(lit.date) : 'unknown' }}</strong>
                          <span v-if="lit.notes" class="muted"> ({{ lit.notes }})</span>
                        </div>
                        <ul v-if="offspringByLitter[lit.litterId] && offspringByLitter[lit.litterId].length" class="offspring-list">
                          <li v-for="o in offspringByLitter[lit.litterId]" :key="o.offspringId" class="offspring-item">
                            <span><strong>{{ o.offspringId }}</strong> — {{ o.sex || 'unknown' }}</span>
                            <span class="status-pill" :class="statusClass(o)">{{ statusText(o) }}</span>
                            <span v-if="o.notes" class="muted"> ({{ o.notes }})</span>
                          </li>
                        </ul>
                        <div v-else-if="offspringByLitterLoading[lit.litterId]" class="muted">Loading…</div>
                        <div v-else-if="offspringByLitterError[lit.litterId]" class="error">{{ offspringByLitterError[lit.litterId] }}</div>
                        <div v-else><em>No offspring</em></div>
                      </div>
                    </template>
                    <div v-else><em>No litters</em></div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <div v-else-if="!mothersLoading">No mothers found.</div>
      <div v-if="deleteMotherError" class="error mt">{{ deleteMotherError }}</div>
    </section>

    <!-- Reports Tab: list existing reports and open by name -->
    <section class="mt" v-if="activeTab === 'reports'">
      <h3>Reports</h3>
      <div class="row">
        <div v-if="reproNamesError" class="error ml">{{ reproNamesError }}</div>
      </div>

      <table v-if="reproReportNames.length" class="mt">
        <thead>
          <tr>
            <th>Report name</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="name in reproReportNames" :key="name">
            <tr class="clickable-row" @click="toggleReproReport(name)">
              <td>{{ name }}</td>
              <td>
                <template v-if="reproRowConfirmDelete[name]">
                  <button class="danger" @click.stop="onDeleteReproReportName(name)" :disabled="reproRowDeleting[name]">
                    {{ reproRowDeleting[name] ? 'Deleting…' : 'Confirm' }}
                  </button>
                  <button class="ml" @click.stop="reproRowConfirmDelete[name] = false" :disabled="reproRowDeleting[name]">Cancel</button>
                </template>
                <template v-else>
                  <button class="danger" @click.stop="reproRowConfirmDelete[name] = true" :disabled="reproRowDeleting[name]">Delete</button>
                </template>
              </td>
            </tr>
            <tr v-if="expandedRepro[name]">
              <td colspan="2">
                <div class="report-box">
                  <div v-if="reproLoadingByName[name]" class="muted">Loading…</div>
                  <div v-else-if="reproErrorByName[name]" class="error">{{ reproErrorByName[name] }}</div>
                  <template v-else>
                    <div class="row" style="align-items:center; gap: 0.5rem;">
                      <h4 style="margin: 0;">Report</h4>
                      <button class="ml" @click.stop="onLoadReproSummaryByName(name)" :disabled="reproSummaryLoadingByName[name]">
                        {{ reproSummaryLoadingByName[name] ? 'Summarizing…' : 'AI summary' }}
                      </button>
                      <div v-if="reproSummaryErrorByName[name]" class="error ml">{{ reproSummaryErrorByName[name] }}</div>
                    </div>
                    <template v-if="performanceRowsForName(name).length">
                      <table class="mt">
                        <thead>
                          <tr>
                            <th>Animal</th>
                            <th>Avg Offspring/Litter</th>
                            <th>Avg Surviving Offspring/Litter</th>
                            <th>Survival</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="r in performanceRowsForName(name)" :key="r.animal">
                            <td>{{ r.animal }}</td>
                            <td>{{ r.avgOffspringPerLitter != null ? r.avgOffspringPerLitter.toFixed(2) : '-' }}</td>
                            <td>{{ r.avgSurvivingPerLitter != null ? r.avgSurvivingPerLitter.toFixed(2) : '-' }}</td>
                            <td>{{ r.survivalRatePct != null ? r.survivalRatePct.toFixed(2) + '%' : '-' }}</td>
                          </tr>
                        </tbody>
                      </table>
                      <div class="mt" v-if="reproAiSummaryFor(name)">
                        <h5>AI Summary</h5>
                        <p v-if="reproAiSummaryFor(name)?.insights" class="mt">{{ reproAiSummaryFor(name)!.insights }}</p>
                      </div>
                    </template>
                    <template v-else>
                      <div class="mt" v-if="reproAiSummaryFor(name)">
                        <h5>AI Summary</h5>
                        <p v-if="reproAiSummaryFor(name)?.insights" class="mt">{{ reproAiSummaryFor(name)!.insights }}</p>
                      </div>
                      <pre v-else class="results-pre">{{ reproReportTextByName[name] || toJson(reproReportObjByName[name]) }}</pre>
                    </template>
                  </template>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <div v-else-if="!reproNamesLoading" class="muted mt">No reports found.</div>
      <div v-if="reproDeleteListError" class="error mt">{{ reproDeleteListError }}</div>

      <div v-if="reportObj || reportText" class="report-box mt">
        <h3>Report</h3>
        <div class="row mt">
          <button @click="() => onLoadSummary()" :disabled="summaryLoading || !lookup.reportName">{{ summaryLoading ? 'Summarizing…' : 'AI summary' }}</button>
          <div v-if="summaryError" class="error ml">{{ summaryError }}</div>
        </div>
        <template v-if="performanceRowsMain.length">
          <table class="mt">
            <thead>
              <tr>
                <th>Animal</th>
                <th>Avg Offspring/Litter</th>
                <th>Avg Surviving Offspring/Litter</th>
                <th>Survival</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in performanceRowsMain" :key="r.animal">
                <td>{{ r.animal }}</td>
                <td>{{ r.avgOffspringPerLitter != null ? r.avgOffspringPerLitter.toFixed(2) : '-' }}</td>
                <td>{{ r.avgSurvivingPerLitter != null ? r.avgSurvivingPerLitter.toFixed(2) : '-' }}</td>
                <td>{{ r.survivalRatePct != null ? r.survivalRatePct.toFixed(2) + '%' : '-' }}</td>
              </tr>
            </tbody>
          </table>
        </template>
        <pre v-else class="results-pre">{{ reportText || toJson(reportObj) }}</pre>
      </div>
    </section>

    
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, getCurrentInstance, computed } from 'vue'
import { postJson } from '@/utils/api'
import { formatDateMDY } from '@/utils/format'
import { normalizeAiSummary } from '@/utils/aiSummary'
// Tabs
const props = defineProps<{ initialTab?: 'mothers' | 'reports' }>()
const activeTab = ref<'mothers' | 'reports'>(
  props.initialTab === 'reports' ? 'reports' : 'mothers'
)
watch(() => props.initialTab, (v) => {
  if (v) activeTab.value = v === 'reports' ? 'reports' : 'mothers'
})
const formatDate = formatDateMDY
function formatAdg(v: any) {
  const n = Number(v)
  return isFinite(n) ? n.toFixed(3) : '-'
}

// Async ack handling: some endpoints first return { request: 'id' } before the body is ready
const MAX_RETRIES = 8
const BASE_DELAY_MS = 400
function nextDelay(attempt: number) {
  return Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 2000)
}
function unwrapBody(res: any): any {
  if (res && typeof res === 'object') {
    if ('body' in res && res.body != null) return res.body
    if ('payload' in res && (res as any).payload != null) return (res as any).payload
    if ('result' in res && (res as any).result != null) return (res as any).result
    if ('content' in res && (res as any).content != null) return (res as any).content
  }
  return res
}


type Offspring = { offspringId: string; sex?: string; notes?: string; litterId?: string; isAlive?: boolean; survivedTillWeaning?: boolean; weanDate?: string; deathDate?: string }

// Add mother state
const addMotherForm = ref<{ motherId: string }>({ motherId: '' })
const addingMother = ref(false)
const addMotherError = ref<string | null>(null)
const addMotherOk = ref(false)
// Status confirmation for sold/deceased mothers
const motherStatusConfirmNeeded = ref(false)
const motherStatusType = ref<'sold' | 'deceased' | 'unknown' | null>(null)
const motherStatusMessage = ref('')
const motherPendingId = ref<string | null>(null)

function getStatusFromIdentity(obj: any): 'sold' | 'deceased' | 'active' | 'unknown' {
  if (!obj || typeof obj !== 'object') return 'unknown'
  const s = (obj as any).status ?? (obj as any).Status
  if (s != null && String(s).trim()) {
    const v = String(s).toLowerCase()
    if (v.includes('sold')) return 'sold'
    if (v.includes('deceased') || v.includes('dead')) return 'deceased'
    return 'active'
  }
  const sold = (obj as any).sold ?? (obj as any).isSold ?? (obj as any).Sold ?? (obj as any).IsSold
  if (sold === true || String(sold).toLowerCase() === 'true') return 'sold'
  const dead = (obj as any).deceased ?? (obj as any).isDeceased ?? (obj as any).dead ?? (obj as any).isDead ?? (obj as any).Deceased ?? (obj as any).IsDeceased
  if (dead === true || String(dead).toLowerCase() === 'true') return 'deceased'
  return 'unknown'
}

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

async function onAddMother() {
  addMotherError.value = null
  addMotherOk.value = false
  if (!addMotherForm.value.motherId) return
  // Precheck: ensure mother is registered using the overview list query
  const id = addMotherForm.value.motherId.trim()
  const record = await findRegisteredAnimal(id)
  if (!record) {
    // Show inline quick registration UI; do not proceed yet
    regMotherForm.value.id = id
    motherRegNeeded.value = true
    return
  }
  // If registered, check identity status from the list record and require confirmation if sold/deceased
  const st = getStatusFromIdentity(record)
  if ((st === 'sold' || st === 'deceased') && !motherStatusConfirmNeeded.value) {
    motherPendingId.value = id
    motherStatusType.value = st
    motherStatusMessage.value = st === 'sold'
      ? 'This animal is marked as sold. Do you want to proceed with adding as a mother?'
      : 'This animal is marked as deceased. Do you want to proceed with adding as a mother?'
    motherStatusConfirmNeeded.value = true
    return
  }
  addingMother.value = true
  try {
    const payload = { motherId: id }
    await postJson<typeof payload, any>('/api/ReproductionTracking/addMother', payload)
    addMotherOk.value = true
    // Clear input and refresh list
    addMotherForm.value.motherId = ''
    mothers.value = []
    await loadMothers()
  } catch (e: any) {
    addMotherError.value = e?.message ?? String(e)
  } finally {
    addingMother.value = false
  }
}

async function confirmProceedAddMother() {
  const id = (motherPendingId.value || '').trim()
  if (!id) { motherStatusConfirmNeeded.value = false; return }
  addMotherError.value = null
  addMotherOk.value = false
  addingMother.value = true
  try {
    const payload = { motherId: id }
    await postJson<typeof payload, any>('/api/ReproductionTracking/addMother', payload)
    addMotherOk.value = true
    addMotherForm.value.motherId = ''
    mothers.value = []
    await loadMothers()
  } catch (e: any) {
    addMotherError.value = e?.message ?? String(e)
  } finally {
    addingMother.value = false
    motherStatusConfirmNeeded.value = false
    motherStatusType.value = null
    motherStatusMessage.value = ''
    motherPendingId.value = null
  }
}

function cancelProceedAddMother() {
  motherStatusConfirmNeeded.value = false
  motherStatusType.value = null
  motherStatusMessage.value = ''
  motherPendingId.value = null
}

// Mothers listing and offspring expand
const mothers = ref<string[]>([])
const mothersLoading = ref(true)
const mothersError = ref<string | null>(null)
const expanded = ref<Record<string, boolean>>({})
const removingMother = ref<Record<string, boolean>>({})
const rowConfirmDeleteMother = ref<Record<string, boolean>>({})
const deleteMotherError = ref<string | null>(null)
// Quick registration for mothers
type RegReq = { id: string; species: string; sex: 'male'|'female'|'neutered'; birthDate: string; breed?: string; notes?: string }
const KNOWN_SPECIES = ['cow','sheep','goat','pig','horse','donkey','camel','buffalo','rabbit'] as const
const motherRegNeeded = ref(false)
const regMotherLoading = ref(false)
const regMotherError = ref<string | null>(null)
const todayRegStr = new Date().toISOString().slice(0,10)
const regMotherForm = ref<RegReq>({ id: '', species: '', sex: 'female', birthDate: todayRegStr, breed: '', notes: '' })
const selectedMotherSpecies = ref('')
const customMotherSpecies = ref('')

// Removed direct isRegistered lookup; registration is validated via list query

function resolveMotherSpecies(): string {
  return (selectedMotherSpecies.value === 'other' ? (customMotherSpecies.value || '') : (selectedMotherSpecies.value || '')).trim()
}

async function onQuickRegisterAndAddMother() {
  regMotherError.value = null
  regMotherLoading.value = true
  try {
    const payload: RegReq = {
      id: (regMotherForm.value.id || '').trim(),
      species: resolveMotherSpecies(),
      sex: regMotherForm.value.sex,
      birthDate: (regMotherForm.value.birthDate || '').trim(),
      breed: (regMotherForm.value.breed || '').trim(),
      notes: (regMotherForm.value.notes || '').trim()
    }
    if (!payload.id) throw new Error('Missing mother ID')
    if (!payload.species) throw new Error('Please select a species or enter a custom species')
    await postJson<RegReq, any>('/api/AnimalIdentity/registerAnimal', payload)
    motherRegNeeded.value = false
    // After registration, proceed to add mother
    await onAddMother()
  } catch (e: any) {
    regMotherError.value = e?.message ?? String(e)
  } finally {
    regMotherLoading.value = false
  }
}
// Grouped view: litters per mother and offspring per litter
type Litter = { litterId: string; notes?: string; internalLitterId?: string; [k: string]: any }
const littersByMother = ref<Record<string, Litter[]>>({})
const littersLoading = ref<Record<string, boolean>>({})
const littersError = ref<Record<string, string | undefined>>({})
const offspringByLitter = ref<Record<string, Offspring[]>>({})
const offspringByLitterLoading = ref<Record<string, boolean>>({})
const offspringByLitterError = ref<Record<string, string | undefined>>({})
// Selection for reports
const selectMothers = ref(false)
const selectedMothers = ref<Record<string, boolean>>({})
const showBatch = ref(false)
function toggleSelectMothers() { selectMothers.value = !selectMothers.value }
function isMotherSelected(id: string) { return !!selectedMothers.value[id] }
function toggleMotherSelected(id: string) { selectedMothers.value[id] = !selectedMothers.value[id] }
const selectedMotherIds = computed(() => Object.keys(selectedMothers.value).filter(k => selectedMothers.value[k]))
const selectedMotherCount = computed(() => selectedMotherIds.value.length)
const batch = ref<{ start: string; end: string; name: string }>({
  start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 10),
  end: new Date().toISOString().slice(0, 10),
  name: ''
})
const batching = ref(false)
const batchResults = ref<string[]>([])
const batchError = ref<string | null>(null)
async function onGenerateBatchSelected() {
  batchError.value = null
  batchResults.value = []
  if (!selectedMotherIds.value.length) { batchError.value = 'Select at least one mother'; return }
  if (!batch.value.start || !batch.value.end || !batch.value.name) { batchError.value = 'Start, End, and Report name are required'; return }
  batching.value = true
  try {
    const base = batch.value.name.trim()
    let hadFail = false
    for (const id of selectedMotherIds.value) {
      try {
        const payload = { target: id, startDateRange: batch.value.start, endDateRange: batch.value.end, name: base }
        await postJson<typeof payload, any>('/api/ReproductionTracking/generateReport', payload)
        batchResults.value.push(`OK: ${id}`)
      } catch (e: any) {
        batchResults.value.push(`FAIL ${id}: ${e?.message ?? String(e)}`)
        hadFail = true
      }
    }
    // If all succeeded, clear selection and collapse the batch UI
    if (!hadFail) {
      selectedMothers.value = {}
      showBatch.value = false
      // Automatically exit selection mode after successful batch
      selectMothers.value = false
    }
  } finally {
    batching.value = false
  }
}

// Overview page is read-only: no add/edit state needed here

// Key helper retained only if needed later
function getLitterKey(motherId: string, lit: Litter) {
  const internal = lit.internalLitterId || ''
  return `${motherId}|${internal || lit.litterId}`
}

async function loadMothers(attempt = 0) {
  mothersLoading.value = true
  mothersError.value = null
  try {
    const raw = await postJson<any, any>('/api/ReproductionTracking/_listMothers', {})
    const res = unwrapBody(raw)
    let list: any = []
    const tryParse = (x: any) => {
      if (typeof x === 'string') { try { return JSON.parse(x) } catch { return x } }
      return x
    }
    function extractArray(node: any, depth = 0): any[] | null {
      if (node == null || depth > 4) return null
      const v = tryParse(node)
      if (Array.isArray(v)) return v
      if (v && typeof v === 'object') {
        const keys = ['mothers','mother','items','data','list','Names','names','Reports','reports','Body','body']
        for (const k of keys) {
          if (k in v) {
            const arr = extractArray((v as any)[k], depth + 1)
            if (Array.isArray(arr)) return arr
          }
        }
        for (const val of Object.values(v)) {
          const arr = extractArray(val, depth + 1)
          if (Array.isArray(arr)) return arr
        }
      }
      return null
    }
    if (Array.isArray(res)) list = res
    else if (res && typeof res === 'object') {
      if (Array.isArray((res as any).mothers)) list = (res as any).mothers
      else if (Array.isArray((res as any).mother)) list = (res as any).mother
      else if (Array.isArray((res as any).items)) list = (res as any).items
      else if (Array.isArray((res as any).data)) list = (res as any).data
    }
    if (!Array.isArray(list) || !list.length) {
      const arr = extractArray(res)
      if (Array.isArray(arr)) list = arr
    }
    if ((!Array.isArray(list) || !list.length) && raw && typeof raw === 'object' && 'request' in raw && attempt < MAX_RETRIES) {
      setTimeout(() => loadMothers(attempt + 1), nextDelay(attempt))
      return
    }
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
    mothers.value = (list as any[])
      .map(x => {
        if (typeof x === 'string' || typeof x === 'number') return String(x)
        if (x && typeof x === 'object') {
          const obj: any = x
          // Prefer externalId for mother identity
          const id = obj.externalId ?? obj.ExternalId ?? obj.externalID ?? obj.motherExternalId ?? obj.MotherExternalId ?? obj.motherId ?? obj.MotherId ?? obj.id ?? obj.Id ?? obj._id
          return id ? String(id) : ''
        }
        return ''
      })
      .filter(Boolean)
      .sort((a, b) => collator.compare(a, b))
  } catch (e: any) {
    mothersError.value = e?.message ?? String(e)
  } finally {
    mothersLoading.value = false
  }
}

onMounted(() => {
  // Auto-load mothers when the view opens
  loadMothers()
})

// Auto-refresh when tabs open
watch(() => activeTab.value, (t) => {
  if (t === 'mothers') {
    // Always refresh the mothers list whenever the Mothers tab is opened
    loadMothers()
  }
  if (t === 'reports' && !reproReportNames.value.length && !reproNamesLoading.value) {
    loadReproReportNames()
  }
})

// Navigation to mother details
const inst = getCurrentInstance()
const router: any = (inst as any)?.proxy?.$router
function goMother(motherId: string) {
  const path = `/mothers/${encodeURIComponent(motherId)}`
  if (router && typeof router.push === 'function') router.push(path)
  else window.location.href = path
}

function toggleMother(motherId: string) {
  expanded.value[motherId] = !expanded.value[motherId]
  if (expanded.value[motherId] && !littersByMother.value[motherId] && !littersLoading.value[motherId]) {
    loadLitters(motherId)
  }
  // ensure forms exist
  // read-only: no form scaffolding
}
// read-only: no add litter state

// read-only: no add litter function

// read-only: no per-litter add toggles

// read-only: no add offspring from overview

async function onRemoveMother(motherId: string) {
  deleteMotherError.value = null
  const id = String(motherId || '').trim()
  if (!id) return
  removingMother.value[id] = true
  try {
    await postJson('/api/ReproductionTracking/removeMother', { motherId: id })
    // Remove locally
    mothers.value = mothers.value.filter(m => m !== id)
    // cleanup expanded/litter state
    delete expanded.value[id]
    delete littersByMother.value[id]
    delete littersLoading.value[id]
    delete littersError.value[id]
    rowConfirmDeleteMother.value[id] = false
    // Refresh from server to ensure consistency
    await loadMothers()
  } catch (e: any) {
    deleteMotherError.value = e?.message ?? String(e)
  } finally {
    removingMother.value[id] = false
  }
}

function confirmRemoveMother(id: string) {
  onRemoveMother(id)
}

async function loadLitters(motherId: string, attempt = 0) {
  littersLoading.value[motherId] = true
  littersError.value[motherId] = undefined
  try {
    const payload = { motherId }
    const raw = await postJson<typeof payload, any>('/api/ReproductionTracking/_listLittersByMother', payload)
    const res = unwrapBody(raw)
    let list: any = []
    if (Array.isArray(res)) list = res
    else if (res && typeof res === 'object') {
      if (Array.isArray((res as any).litters)) list = (res as any).litters
      else if (Array.isArray((res as any).litter)) list = (res as any).litter
      else if (Array.isArray((res as any).items)) list = (res as any).items
      else if (Array.isArray((res as any).data)) list = (res as any).data
    }
    if ((!Array.isArray(list) || !list.length) && raw && typeof raw === 'object' && 'request' in raw && attempt < MAX_RETRIES) {
      setTimeout(() => loadLitters(motherId, attempt + 1), nextDelay(attempt))
      return
    }
  const normLitters: Litter[] = (list as any[]).map(l => {
      const isNumeric = (v: any) => typeof v === 'number' || (typeof v === 'string' && /^\d+$/.test(v))
      // Prefer a human-friendly numeric ID if present
      let id: any = (l as any).id ?? (l as any).Id ?? (l as any).ID
      if (!isNumeric(id)) id = (l as any).litterNumber ?? (l as any).LitterNumber ?? (l as any).number ?? (l as any).no ?? (l as any).litterNo ?? (l as any).LitterNo
      const internal = (l as any).litterId ?? (l as any).LitterId ?? (l as any)._id
      if (!isNumeric(id)) id = internal
      if (id == null || String(id) === '') id = internal
      const litterId = id != null ? String(id) : ''
      const date = (l as any).birthDate ?? (l as any).BirthDate ?? (l as any).date ?? (l as any).Date ?? undefined
      return {
        ...l,
        litterId,
        notes: (l as any).notes ?? (l as any).Notes,
        internalLitterId: internal != null ? String(internal) : undefined,
        date,
      }
    }).filter((l: Litter) => !!l.litterId)
    littersByMother.value[motherId] = normLitters
    // Load offspring for each litter (in parallel)
    await Promise.all(normLitters.map(l => loadOffspringByLitter(l.litterId)))
  } catch (e: any) {
    littersError.value[motherId] = e?.message ?? String(e)
  } finally {
    littersLoading.value[motherId] = false
  }
}

async function loadOffspringByLitter(litterId: string, attempt = 0) {
  if (!litterId) return
  offspringByLitterLoading.value[litterId] = true
  offspringByLitterError.value[litterId] = undefined
  try {
    const payload = { litterId }
    const raw = await postJson<typeof payload, any>('/api/ReproductionTracking/_listOffspringByLitter', payload)
    const res = unwrapBody(raw)
    let list: any = []
    if (Array.isArray(res)) list = res
    else if (res && typeof res === 'object') {
      if (Array.isArray((res as any).offspring)) list = (res as any).offspring
      else if (Array.isArray((res as any).items)) list = (res as any).items
      else if (Array.isArray((res as any).data)) list = (res as any).data
    }
    if ((!Array.isArray(list) || !list.length) && raw && typeof raw === 'object' && 'request' in raw && attempt < MAX_RETRIES) {
      setTimeout(() => loadOffspringByLitter(litterId, attempt + 1), nextDelay(attempt))
      return
    }
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
    const norm = (list as any[]).map(o => ({
      offspringId: String(o.externalId ?? o.ExternalId ?? o.offspringId ?? o.OffspringId ?? o.id ?? o.Id ?? o._id ?? ''),
      sex: o.sex ?? o.Sex,
      notes: o.notes ?? o.Notes,
      litterId: String(o.litterId ?? o.LitterId ?? litterId),
      isAlive: o.isAlive ?? o.alive ?? o.Alive,
      survivedTillWeaning: o.survivedTillWeaning ?? o.survivedUntilWeaning ?? o.weaned,
      weanDate: o.weanDate ?? o.weanedDate ?? o.dateWeaned,
      deathDate: o.deathDate ?? o.dateOfDeath ?? o.diedDate
    }))
      .filter((o: Offspring) => !!o.offspringId)
      .sort((a: Offspring, b: Offspring) => collator.compare(a.offspringId, b.offspringId))
    offspringByLitter.value[litterId] = norm
  } catch (e: any) {
    offspringByLitterError.value[litterId] = e?.message ?? String(e)
  } finally {
    offspringByLitterLoading.value[litterId] = false
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

// read-only: no add offspring form

// read-only: no edit offspring

// No separate reports tab: creation and viewing occur inline or via details pages
// Reports tab state and actions
const reproReportNames = ref<string[]>([])
const reproNamesLoading = ref(false)
const reproNamesError = ref<string | null>(null)
const reproRowDeleting = ref<Record<string, boolean>>({})
const reproRowConfirmDelete = ref<Record<string, boolean>>({})
const reproDeleteListError = ref<string | null>(null)
// Optional per-row dropdown state to support closing on navigation
const reproRowMenuOpen = ref<Record<string, boolean>>({})
const expandedRepro = ref<Record<string, boolean>>({})
const reproLoadingByName = ref<Record<string, boolean>>({})
const reproErrorByName = ref<Record<string, string | null>>({})
const reproReportObjByName = ref<Record<string, any | null>>({})
const reproReportTextByName = ref<Record<string, string | null>>({})
const reproSummaryTextByName = ref<Record<string, string | null>>({})
const reproSummaryLoadingByName = ref<Record<string, boolean>>({})
const reproSummaryErrorByName = ref<Record<string, string | null>>({})

async function loadReproReportNames(attempt = 0) {
  reproNamesLoading.value = true
  reproNamesError.value = null
  try {
    const raw = await postJson<any, any>('/api/ReproductionTracking/_listReports', {})
    const res = unwrapBody(raw)

    function asArray(maybe: any): any[] {
      return Array.isArray(maybe) ? maybe : []
    }
    function tryParseJson(text: any): any {
      if (typeof text !== 'string') return text
      try { return JSON.parse(text) } catch {
        // try loose splits for simple csv/newline lists
        const s = text.trim()
        if (s.includes('\n')) return s.split(/\r?\n/).map(x => x.trim()).filter(Boolean)
        if (s.includes(',')) return s.split(',').map(x => x.trim()).filter(Boolean)
        return text
      }
    }
    function extractList(body: any): any[] {
      const seen = new Set<any>()
      function walk(node: any, depth = 0): any[] | null {
        if (node == null || depth > 3 || seen.has(node)) return null
        seen.add(node)
        const b = tryParseJson(node)
        if (Array.isArray(b)) return b
        if (b && typeof b === 'object') {
          const keys = ['names','Names','reports','Reports','reportNames','items','Items','data','Data','list','List','result','Result','results','Results']
          for (const k of keys) {
            if (k in b) {
              const v = (b as any)[k]
              const arr = walk(v, depth + 1)
              if (Array.isArray(arr)) return arr
            }
          }
          // last resort: scan all properties for an array of strings
          for (const v of Object.values(b)) {
            const arr = walk(v, depth + 1)
            if (Array.isArray(arr)) return arr
          }
        }
        return null
      }
      return walk(body) || []
    }
    const rawList = extractList(res)
    if ((!Array.isArray(rawList) || !rawList.length) && raw && typeof raw === 'object' && 'request' in raw && attempt < MAX_RETRIES) {
      setTimeout(() => loadReproReportNames(attempt + 1), nextDelay(attempt))
      return
    }
    const names = rawList.map(x => {
      if (typeof x === 'string' || typeof x === 'number') return String(x)
      if (x && typeof x === 'object') return String((x as any).name ?? (x as any).reportName ?? (x as any).id ?? (x as any).Id ?? (x as any)._id ?? '')
      return ''
    }).filter(Boolean)
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
    reproReportNames.value = names.sort((a, b) => collator.compare(a, b))
  } catch (e: any) {
    reproNamesError.value = e?.message ?? String(e)
  } finally {
    reproNamesLoading.value = false
  }
}

function openName(name: string) {
  // Close any open dropdown for report rows when navigating to a report
  reproRowMenuOpen.value = {}
  lookup.value.reportName = name
  onLoadReport()
}

function toggleReproReport(name: string) {
  reproRowMenuOpen.value = {}
  expandedRepro.value[name] = !expandedRepro.value[name]
  if (expandedRepro.value[name] && !reproReportObjByName.value[name] && !reproReportTextByName.value[name] && !reproLoadingByName.value[name]) {
    loadReproReportByName(name)
  }
}

async function loadReproReportByName(name: string, attempt = 0) {
  reproLoadingByName.value[name] = true
  reproErrorByName.value[name] = null
  try {
    const payload = { reportName: name.trim() }
    const raw = await postJson<typeof payload, any>('/api/ReproductionTracking/_viewReport', payload)
    const res = unwrapBody(raw)
    let text: string | null = null
    let obj: any | null = null
    if (typeof res === 'string') {
      text = res
      try {
        const parsed = JSON.parse(res)
        const candidate: any = (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && typeof (parsed as any).data === 'object' && !Array.isArray((parsed as any).data)) ? (parsed as any).data : parsed
        if (candidate && (candidate.results || candidate.reportName || candidate.aiGeneratedSummary)) obj = candidate
      } catch {}
    } else if (res && typeof res === 'object') {
      const r: any = res
      text = r.Results ?? r.results ?? r.report ?? r.text ?? r.content ?? r.data ?? null
      if (r && (r.results || r.reportName || r.aiGeneratedSummary)) obj = r
      if (!obj && typeof text === 'string') {
        try {
          const parsed = JSON.parse(text)
          const inner: any = (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && typeof (parsed as any).data === 'object' && !Array.isArray((parsed as any).data)) ? (parsed as any).data : parsed
          if (inner && (inner.results || inner.reportName || inner.aiGeneratedSummary)) obj = inner
        } catch {}
      }
    }
    if (!obj && raw && typeof raw === 'object' && 'request' in raw && attempt < MAX_RETRIES) {
      setTimeout(() => loadReproReportByName(name, attempt + 1), nextDelay(attempt))
      return
    }
    reproReportTextByName.value[name] = text ?? JSON.stringify(res, null, 2)
    reproReportObjByName.value[name] = obj
  } catch (e: any) {
    reproErrorByName.value[name] = e?.message ?? String(e)
  } finally {
    reproLoadingByName.value[name] = false
  }
}

function reproAiSummaryFor(name: string) {
  const obj = reproReportObjByName.value[name]
  const sumText = reproSummaryTextByName.value[name]
  if (obj && obj.aiGeneratedSummary) return normalizeAiSummary(obj.aiGeneratedSummary)
  if (sumText) return normalizeAiSummary(sumText)
  return null
}

async function onLoadReproSummaryByName(name: string, attempt = 0) {
  const reportName = String(name || '').trim()
  if (!reportName) return
  reproSummaryErrorByName.value[reportName] = null
  reproSummaryLoadingByName.value[reportName] = true
  try {
    const payload = { reportName }
    const raw = await postJson<typeof payload, any>('/api/ReproductionTracking/_aiSummary', payload)
    const res = unwrapBody(raw)
    let text: string | null = null
    if (typeof res === 'string') text = res
    else if (res && typeof res === 'object') {
      const r: any = res
      text = r.summary ?? r.Summary ?? r.result ?? r.text ?? r.content ?? null
      if (text && typeof text !== 'string') text = JSON.stringify(text, null, 2)
    }
    if (!text && raw && typeof raw === 'object' && 'request' in raw && attempt < MAX_RETRIES) {
      setTimeout(() => onLoadReproSummaryByName(name, attempt + 1), nextDelay(attempt))
      return
    }
    reproSummaryTextByName.value[reportName] = text ?? JSON.stringify(res, null, 2)
    // Reflect AI summary immediately in the inline report view
    const cur = reproReportObjByName.value[reportName]
    if (cur && typeof cur === 'object') {
      reproReportObjByName.value[reportName] = { ...cur, aiGeneratedSummary: reproSummaryTextByName.value[reportName] }
    }
    // Optionally refresh to pick up server-side persistence
    loadReproReportByName(reportName)
  } catch (e: any) {
    reproSummaryErrorByName.value[reportName] = e?.message ?? String(e)
  } finally {
    reproSummaryLoadingByName.value[reportName] = false
  }
}

function toJson(v: any) {
  try { return v == null ? '' : JSON.stringify(v, null, 2) } catch { return String(v) }
}

// Performance report parsing
type PerfRow = { animal: string; litters: number; offspring: number; avgOffspringPerLitter: number | null; avgSurvivingPerLitter: number | null; survivalRatePct: number | null }
const perfRe = /Performance for\s+(.+?)\s*\(.*?\):\s*Litters:\s*(\d+),\s*Offspring:\s*(\d+),\s*Weaning Survival:\s*([\d.]+)%/i
function round(n: number, d = 2) { return Math.round(n * 10 ** d) / 10 ** d }
function toLines(input: any): string[] {
  // Accept array of strings, a single string (possibly JSON or newline-delimited), or arrays nested in common keys
  if (Array.isArray(input)) return input.map(x => String(x))
  if (typeof input === 'string') {
    // Try JSON array first
    try {
      const parsed = JSON.parse(input)
      if (Array.isArray(parsed)) return parsed.map(x => String(x))
    } catch {}
    const s = input.trim()
    if (!s) return []
    // Split by newlines when present
    if (s.includes('\n')) return s.split(/\r?\n/).map(x => x.trim()).filter(Boolean)
    // Otherwise treat as a single line
    return [s]
  }
  if (input && typeof input === 'object') {
    const keys = ['lines','results','data','items','report','content','text','Results','Data','Items']
    for (const k of keys) {
      if (k in input) {
        const v: any = (input as any)[k]
        const l = toLines(v)
        if (l.length) return l
      }
    }
  }
  return []
}
function parsePerformance(input: any): PerfRow[] {
  const lines = toLines(input)
  if (!lines.length) return []
  const rows: PerfRow[] = []
  for (const line of lines) {
    const m = String(line).match(perfRe)
    if (!m) continue
    const [, animal, littersStr, offspringStr, survivalStr] = m
    const litters = Number(littersStr)
    const offspring = Number(offspringStr)
    const survivalRatePct = Number(survivalStr)
    const avg = litters > 0 ? round(offspring / litters, 2) : null
    const survPct = isFinite(survivalRatePct) ? round(survivalRatePct, 2) : null
    const survivors = survPct != null ? (offspring * (survPct / 100)) : null
    const avgSurv = (survivors != null && litters > 0) ? round(survivors / litters, 2) : null
    rows.push({ animal: String(animal).trim(), litters, offspring, avgOffspringPerLitter: avg, avgSurvivingPerLitter: avgSurv, survivalRatePct: survPct })
  }
  return rows
}

function performanceRowsForName(name: string): PerfRow[] {
  const txt = reproReportTextByName.value[name]
  const obj = reproReportObjByName.value[name]
  const r1 = parsePerformance(txt)
  if (r1.length) return r1
  return parsePerformance(obj)
}

const performanceRowsMain = computed<PerfRow[]>(() => {
  const r1 = parsePerformance(reportText.value)
  if (r1.length) return r1
  return parsePerformance(reportObj.value)
})

async function onDeleteReproReportName(name: string) {
  reproDeleteListError.value = null
  const reportName = String(name || '').trim()
  if (!reportName) return
  reproRowDeleting.value[reportName] = true
  try {
    const payload = { reportName }
    await postJson<typeof payload, any>('/api/ReproductionTracking/deleteReport', payload)
    reproReportNames.value = reproReportNames.value.filter(n => n !== reportName)
    if (!reproReportNames.value.length) await loadReproReportNames()
    reproRowConfirmDelete.value[reportName] = false
  } catch (e: any) {
    reproDeleteListError.value = e?.message ?? String(e)
  } finally {
    reproRowDeleting.value[reportName] = false
  }
}

const lookup = ref<{ reportName: string }>({ reportName: '' })
const lookupLoading = ref(false)
const lookupError = ref<string | null>(null)
const reportText = ref<string | null>(null)
const reportObj = ref<any | null>(null)
const summaryText = ref<string | null>(null)
const summaryLoading = ref(false)
const summaryError = ref<string | null>(null)
const aiSummaryObj = computed(() => {
  if (reportObj.value && reportObj.value.aiGeneratedSummary) return normalizeAiSummary(reportObj.value.aiGeneratedSummary)
  if (summaryText.value) return normalizeAiSummary(summaryText.value)
  return null
})


async function onLoadReport(attempt = 0) {
  lookupError.value = null
  reportText.value = null
  summaryText.value = null
  if (!lookup.value.reportName) return
  lookupLoading.value = true
  try {
    const payload = { reportName: lookup.value.reportName.trim() }
    // Canonical endpoint for viewing reproduction reports
    const raw = await postJson<typeof payload, any>('/api/ReproductionTracking/_viewReport', payload)
    const res = unwrapBody(raw)
    let text: string | null = null
    if (typeof res === 'string') {
      text = res
    } else if (res && typeof res === 'object') {
      const r: any = res
      text = r.Results ?? r.results ?? r.report ?? r.text ?? r.content ?? r.data ?? null
      if (text && typeof text !== 'string') {
        text = JSON.stringify(text, null, 2)
      }
      if (r && (r.results || r.reportName || r.aiGeneratedSummary)) {
        reportObj.value = r
      } else {
        reportObj.value = null
      }
    }
    if (!reportObj.value && raw && typeof raw === 'object' && 'request' in raw && attempt < MAX_RETRIES) {
      setTimeout(() => onLoadReport(attempt + 1), nextDelay(attempt))
      return
    }
    reportText.value = text ?? JSON.stringify(res, null, 2)
  } catch (e: any) {
    lookupError.value = e?.message ?? String(e)
  } finally {
    lookupLoading.value = false
  }
}

// delete handled at list row level; no delete button in report view

async function onLoadSummary(attempt = 0) {
  summaryError.value = null
  summaryText.value = null
  if (!lookup.value.reportName) return
  summaryLoading.value = true
  try {
    const payload = { reportName: lookup.value.reportName.trim() }
    const raw = await postJson<typeof payload, any>('/api/ReproductionTracking/_aiSummary', payload)
    const res = unwrapBody(raw)
    let text: string | null = null
    if (typeof res === 'string') text = res
    else if (res && typeof res === 'object') {
      const r: any = res
      text = r.summary ?? r.Summary ?? r.result ?? r.text ?? r.content ?? null
      if (text && typeof text !== 'string') text = JSON.stringify(text, null, 2)
    }
    if (!text && raw && typeof raw === 'object' && 'request' in raw && attempt < MAX_RETRIES) {
      setTimeout(() => onLoadSummary(attempt + 1), nextDelay(attempt))
      return
    }
    summaryText.value = text ?? JSON.stringify(res, null, 2)
    // Update report object so AI Summary renders immediately
    if (reportObj.value && typeof reportObj.value === 'object') {
      reportObj.value = { ...reportObj.value, aiGeneratedSummary: summaryText.value }
    }
  } catch (e: any) {
    summaryError.value = e?.message ?? String(e)
  } finally {
    summaryLoading.value = false
  }
}

// Offspring event forms removed; events are handled elsewhere
</script>

<style scoped>
.results-pre { white-space: pre-wrap }
.muted { color: #666 }
.offspring-box { background: #fafafa; border: 1px solid #eee; border-radius: 6px; padding: 0.75rem }
.offpsring-list { list-style: none; padding: 0 }
.offspring-item { display: flex; align-items: center; gap: 0.5rem }
.status-pill { padding: 0.1rem 0.4rem; border-radius: 999px; font-size: 0.75rem }
.status-pill.ok { background: var(--olive-100); color: var(--tone-olive) }
.status-pill.warn { background: var(--peach-100); color: var(--tone-clay) }
.status-pill.danger { background: var(--danger-bg); color: var(--danger) }
.danger { color: #b00020 }
.ml { margin-left: 0.5rem }
.small { font-size: 0.85rem }
.litter-block { border-top: 1px dashed #ddd; padding: 0.5rem 0 }
.litter-header { display: flex; align-items: center; gap: 0.5rem }
.summary-box { background: #f6faff; border: 1px solid #e0f0ff; border-radius: 6px; padding: 0.75rem }
.report-box { background: #f9f9f9; border: 1px solid #eee; border-radius: 6px; padding: 0.75rem }
/* Tabs - segmented control style */
.tabs {
  display: flex;
  gap: 0.25rem;
  margin: 0 0 1rem;
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
.grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; }
.card.sub { padding: 1rem; }
.clickable-row { cursor: pointer }
.clickable-row:hover { background: var(--surface-2, #fafafa) }
.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem }
</style>
