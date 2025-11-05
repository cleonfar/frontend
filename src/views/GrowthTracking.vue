<template>
  <div class="card root-card">
  <h2>Weights</h2>

    <!-- Tabs -->
    <div class="tabs">
      <button :class="['tab', activeTab === 'browse' && 'active']" @click="activeTab = 'browse'">Animals & Weights</button>
      <button :class="['tab', activeTab === 'record' && 'active']" @click="activeTab = 'record'">Record Weights</button>
      <button :class="['tab', activeTab === 'reports' && 'active']" @click="activeTab = 'reports'">Reports</button>
    </div>

    <!-- Reports Tab: list existing reports and open by name -->
    <section class="mt" v-if="activeTab === 'reports'">
      <h3>Reports</h3>
      <div class="row">
        <div v-if="reportNamesError" class="error ml">{{ reportNamesError }}</div>
      </div>

      <table v-if="weightReportNames.length" class="mt">
        <thead>
          <tr>
            <th>Report name</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="name in weightReportNames" :key="name">
            <tr class="clickable-row" @click="toggleReport(name)">
              <td>{{ name }}</td>
              <td>
                <template v-if="rowConfirmDelete[name]">
                  <button class="danger" @click.stop.prevent="confirmDelete(name)" :disabled="rowDeleting[name]">
                    {{ rowDeleting[name] ? 'Deleting…' : 'Confirm' }}
                  </button>
                  <button class="ml" @click.stop.prevent="rowConfirmDelete[name] = false" :disabled="rowDeleting[name]">Cancel</button>
                </template>
                <template v-else>
                  <button class="danger" @click.stop.prevent="rowConfirmDelete[name] = true" :disabled="rowDeleting[name]">
                    Delete
                  </button>
                </template>
              </td>
            </tr>
            <tr v-if="expandedReport[name]">
              <td colspan="2">
                <div class="report-box">
                  <div v-if="loadingReportByName[name]" class="muted">Loading…</div>
                  <div v-else-if="errorReportByName[name]" class="error">{{ errorReportByName[name] }}</div>
                  <template v-else>
                    <div v-if="reportObjByName[name]">
                      <h4 style="margin:0 0 0.25rem 0;">Report: {{ reportObjByName[name].reportName || name }}</h4>
                      <div class="small muted">Generated {{ formatDate(reportObjByName[name].dateGenerated) }} by {{ reportObjByName[name].ownerId || 'unknown' }}</div>
                      <div class="row mt">
                        <button @click.stop="onLoadSummaryByName(name)" :disabled="summaryLoadingByName[name]">
                          {{ summaryLoadingByName[name] ? 'Summarizing…' : 'AI summary' }}
                        </button>
                        <div v-if="summaryErrorByName[name]" class="error ml">{{ summaryErrorByName[name] }}</div>
                      </div>
                      <table class="mt" v-if="summaryRowsFor(reportObjByName[name]).length">
                        <thead>
                          <tr>
                            <th>Animal ID</th>
                            <th>Most recent weight</th>
                            <th>Expected weight today</th>
                            <th>Rate of gain (kg/day)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="row in summaryRowsFor(reportObjByName[name])" :key="row.animalId">
                            <td>{{ row.animalId }}</td>
                            <td>{{ row.recentWeight != null ? row.recentWeight.toFixed(2) + ' kg' : '-' }}</td>
                            <td>{{ row.expectedWeightToday != null && isFinite(row.expectedWeightToday) ? row.expectedWeightToday.toFixed(2) + ' kg' : '-' }}</td>
                            <td>{{ row.adg != null && isFinite(row.adg) ? row.adg.toFixed(3) : '-' }}</td>
                          </tr>
                        </tbody>
                      </table>
                      <div class="mt" v-if="aiSummaryFor(name)">
                        <h5>AI Summary</h5>
                        <p v-if="aiSummaryFor(name)?.insights" class="mt">{{ aiSummaryFor(name)!.insights }}</p>
                        <div class="summary-grid mt">
                          <div>
                            <h6>High performers</h6>
                            <ul>
                              <li v-for="x in aiSummaryFor(name)!.highPerformers" :key="'hp-'+x">{{ x }}</li>
                              <li v-if="!aiSummaryFor(name)!.highPerformers.length" class="muted">None</li>
                            </ul>
                          </div>
                          <div>
                            <h6>Average performers</h6>
                            <ul>
                              <li v-for="x in aiSummaryFor(name)!.averagePerformers" :key="'avg-'+x">{{ x }}</li>
                              <li v-if="!aiSummaryFor(name)!.averagePerformers.length" class="muted">None</li>
                            </ul>
                          </div>
                          <div>
                            <h6>Low performers</h6>
                            <ul>
                              <li v-for="x in aiSummaryFor(name)!.lowPerformers" :key="'lp-'+x">{{ x }}</li>
                              <li v-if="!aiSummaryFor(name)!.lowPerformers.length" class="muted">None</li>
                            </ul>
                          </div>
                          <div>
                            <h6>Concerning trends</h6>
                            <ul>
                              <li v-for="x in aiSummaryFor(name)!.concerningTrends" :key="'ct-'+x">{{ x }}</li>
                              <li v-if="!aiSummaryFor(name)!.concerningTrends.length" class="muted">None</li>
                            </ul>
                          </div>
                          <div>
                            <h6>Potential record errors</h6>
                            <ul>
                              <li v-for="x in aiSummaryFor(name)!.potentialRecordErrors" :key="'err-'+x">{{ x }}</li>
                              <li v-if="!aiSummaryFor(name)!.potentialRecordErrors.length" class="muted">None</li>
                            </ul>
                          </div>
                          <div v-if="aiSummaryFor(name)!.insufficientData && aiSummaryFor(name)!.insufficientData.length">
                            <h6>Insufficient data</h6>
                            <ul>
                              <li v-for="x in aiSummaryFor(name)!.insufficientData" :key="'id-'+x">{{ x }}</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div v-else-if="reportTextByName[name]" class="report-box mt">
                      <h4>Report</h4>
                      <pre class="results-pre">{{ reportTextByName[name] }}</pre>
                    </div>
                    <div v-else class="muted">No content.</div>
                  </template>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <div v-else-if="!reportNamesLoading" class="muted mt">No reports found.</div>
      <div v-if="deleteListError" class="error mt">{{ deleteListError }}</div>

      <div v-if="reportObj" class="report-box mt">
        <h3>Report: {{ reportObj.reportName || lookup.reportName }}</h3>
        <div class="small muted">Generated {{ formatDate(reportObj.dateGenerated) }} by {{ reportObj.ownerId || 'unknown' }}</div>
        <div class="row mt">
          <button @click="onLoadSummary" :disabled="summaryLoading || !lookup.reportName">{{ summaryLoading ? 'Summarizing…' : 'AI summary' }}</button>
          <div v-if="summaryError" class="error ml">{{ summaryError }}</div>
        </div>
        <table class="mt" v-if="summaryRows.length">
          <thead>
            <tr>
              <th>Animal ID</th>
              <th>Most recent weight</th>
              <th>Expected weight today</th>
              <th>Rate of gain (kg/day)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in summaryRows" :key="row.animalId">
              <td>{{ row.animalId }}</td>
              <td>{{ row.recentWeight != null ? row.recentWeight.toFixed(2) + ' kg' : '-' }}</td>
              <td>{{ row.expectedWeightToday != null && isFinite(row.expectedWeightToday) ? row.expectedWeightToday.toFixed(2) + ' kg' : '-' }}</td>
              <td>{{ row.adg != null && isFinite(row.adg) ? row.adg.toFixed(3) : '-' }}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="mt" v-if="aiSummaryObj">
          <h4>AI Summary</h4>
          <p v-if="aiSummaryObj.insights" class="mt">{{ aiSummaryObj.insights }}</p>
          <div class="summary-grid mt">
            <div>
              <h5>High performers</h5>
              <ul>
                <li v-for="x in aiSummaryObj.highPerformers" :key="'hp-'+x">{{ x }}</li>
                <li v-if="!aiSummaryObj.highPerformers.length" class="muted">None</li>
              </ul>
            </div>
            <div>
              <h5>Average performers</h5>
              <ul>
                <li v-for="x in aiSummaryObj.averagePerformers" :key="'avg-'+x">{{ x }}</li>
                <li v-if="!aiSummaryObj.averagePerformers.length" class="muted">None</li>
              </ul>
            </div>
            <div>
              <h5>Low performers</h5>
              <ul>
                <li v-for="x in aiSummaryObj.lowPerformers" :key="'lp-'+x">{{ x }}</li>
                <li v-if="!aiSummaryObj.lowPerformers.length" class="muted">None</li>
              </ul>
            </div>
            <div>
              <h5>Concerning trends</h5>
              <ul>
                <li v-for="x in aiSummaryObj.concerningTrends" :key="'ct-'+x">{{ x }}</li>
                <li v-if="!aiSummaryObj.concerningTrends.length" class="muted">None</li>
              </ul>
            </div>
            <div>
              <h5>Potential record errors</h5>
              <ul>
                <li v-for="x in aiSummaryObj.potentialRecordErrors" :key="'err-'+x">{{ x }}</li>
                <li v-if="!aiSummaryObj.potentialRecordErrors.length" class="muted">None</li>
              </ul>
            </div>
            <div v-if="aiSummaryObj.insufficientData && aiSummaryObj.insufficientData.length">
              <h5>Insufficient data</h5>
              <ul>
                <li v-for="x in aiSummaryObj.insufficientData" :key="'id-'+x">{{ x }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="reportText" class="report-box mt">
        <h3>Report</h3>
        <pre class="results-pre">{{ reportText }}</pre>
      </div>
      <div v-else-if="summaryText && !aiSummaryObj" class="summary-box mt">
        <h3>Summary</h3>
        <pre class="results-pre">{{ summaryText }}</pre>
      </div>
    </section>

    <!-- Record Weights Tab -->
    <section v-if="activeTab === 'record'">
      <h3>Record weight</h3>
      <form @submit.prevent="onRecordWeight">
        <div class="row">
          <label>Animal ID</label>
          <input v-model="weightForm.animal" required placeholder="e.g. ANML-001" />
        </div>
        <div class="row">
          <label>Date</label>
          <input type="date" v-model="weightForm.dateGenerated" required />
        </div>
        <div class="row">
          <label>Weight (kg)</label>
          <input type="number" step="0.01" v-model.number="weightForm.weight" required />
        </div>
        <div class="row">
          <label>Notes</label>
          <input v-model="weightForm.notes" placeholder="optional" />
        </div>
        <button :disabled="recording">{{ recording ? 'Recording…' : 'Record weight' }}</button>
        <div v-if="recordError" class="error">{{ recordError }}</div>
        <div v-if="recordOk" class="ok">Recorded.</div>
      </form>
      <!-- Quick registration prompt when animal doesn't exist -->
      <div v-if="regNeeded" class="card sub mt">
        <h4>This animal isn’t registered</h4>
        <p class="muted">Please provide the required registration details to continue.</p>
        <div class="grid-2">
          <label>Animal ID
            <input v-model="regForm.id" readonly />
          </label>
          <label>Sex
            <select v-model="regForm.sex">
              <option value="male">male</option>
              <option value="female">female</option>
              <option value="neutered">neutered</option>
            </select>
          </label>
          <div>
            <label>Species
              <select v-model="selectedSpecies">
                <option value="">Select…</option>
                <option v-for="sp in KNOWN_SPECIES" :key="sp" :value="sp">{{ sp }}</option>
                <option value="other">Other</option>
              </select>
            </label>
            <div v-if="selectedSpecies === 'other'">
              <input v-model="customSpecies" placeholder="Enter species" aria-label="Species" />
            </div>
          </div>
          <label>Birth date
            <input type="date" v-model="regForm.birthDate" />
          </label>
          <label>Breed (optional)
            <input v-model="regForm.breed" placeholder="optional" />
          </label>
          <label>Notes
            <input v-model="regForm.notes" placeholder="optional" />
          </label>
        </div>
        <div class="row mt">
          <button @click="onQuickRegisterAndRecord" :disabled="regLoading">{{ regLoading ? 'Registering…' : 'Register and record' }}</button>
          <button class="ml" @click="regNeeded = false" :disabled="regLoading">Cancel</button>
          <div v-if="regError" class="error ml">{{ regError }}</div>
        </div>
      </div>

      <!-- Warning confirmation if animal is sold or deceased -->
      <div v-if="statusConfirmNeeded" class="card sub mt">
        <h4>Confirm action</h4>
        <p class="muted">{{ statusMessage }}</p>
        <div class="row mt">
          <button class="danger" @click="confirmProceedRecord" :disabled="recording">{{ recording ? 'Recording…' : 'Proceed anyway' }}</button>
          <button class="ml" @click="cancelProceedRecord" :disabled="recording">Cancel</button>
        </div>
      </div>
    </section>

    
    
    <!-- Browse Tab -->
    <section class="mt" v-if="activeTab === 'browse'">
      <h3>Animals with weight records</h3>
      <div class="row">
        <button @click="toggleSelectMode">{{ selectMode ? 'Done selecting' : 'Select animals for report' }}</button>
        <button class="ml" v-if="selectMode" @click="showBatch = !showBatch" :disabled="selectedCount === 0">
          {{ showBatch ? 'Hide batch' : 'Create report for selected' }} ({{ selectedCount }})
        </button>
        <div v-if="animalsLoading" class="muted ml">Loading…</div>
        <div v-if="animalsError" class="error ml">{{ animalsError }}</div>
      </div>

      <div v-if="selectMode && showBatch && selectedCount > 0" class="mt">
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
          <input v-model="batch.name" required placeholder="e.g. Oct-2025" />
        </div>
        <button @click="onGenerateBatchSelected" :disabled="batching">{{ batching ? 'Generating…' : 'Generate for selected' }}</button>
        <div v-if="batchError" class="error">{{ batchError }}</div>
        <ul v-if="batchResults.length" class="mt">
          <li v-for="r in batchResults" :key="r">{{ r }}</li>
        </ul>
      </div>
      <table v-if="animalsWithRecords.length">
        <thead>
          <tr>
            <th v-if="selectMode">Select</th>
            <th>Animal</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="id in animalsWithRecords" :key="id">
            <tr :class="selectMode ? 'clickable-row' : ''" @click="onRowToggleAnimal(id, $event)">
              <td v-if="selectMode"><input type="checkbox" :checked="isSelected(id)" @change="toggleSelected(id)" /></td>
              <td><router-link :to="`/animals/${encodeURIComponent(id)}`">{{ id }}</router-link></td>
              <td class="actions-cell">
                <button @click="toggleAnimalRecords(id)">{{ expanded[id] ? 'Hide weights' : 'View weights' }}</button>
                <template v-if="rowConfirmDeleteAnimal[id]">
                  <button class="danger" @click.stop.prevent="confirmDeleteAnimal(id)" :disabled="rowDeletingAnimal[id]">
                    {{ rowDeletingAnimal[id] ? 'Deleting…' : 'Confirm' }}
                  </button>
                  <button class="ml" @click.stop.prevent="rowConfirmDeleteAnimal[id] = false" :disabled="rowDeletingAnimal[id]">Cancel</button>
                </template>
                <template v-else>
                  <button class="danger" @click.stop.prevent="rowConfirmDeleteAnimal[id] = true" :disabled="rowDeletingAnimal[id]">
                    Delete
                  </button>
                </template>
              </td>
            </tr>
            <tr v-if="expanded[id]">
              <td colspan="2">
                <div class="weights-box">
                  <strong>Weight records</strong>
                  <div v-if="weightsLoading[id]" class="muted">Loading weights…</div>
                  <div v-else-if="weightsError[id]" class="error">{{ weightsError[id] }}</div>
                  <div v-else-if="weightsByAnimal[id] && weightsByAnimal[id].length">
                    <ul class="weights-list">
                      <li v-for="r in weightsByAnimal[id]" :key="`${r.date}:${r.weight}`">
                        <span>{{ formatDate(r.date) }}</span>
                        <span> — </span>
                        <strong>{{ r.weight }}</strong>
                        <span> kg</span>
                        <span v-if="r.notes" class="muted"> ({{ r.notes }})</span>
                        <template v-if="weightRowConfirmDelete[id] && weightRowConfirmDelete[id][r.date]">
                          <button class="ml danger" @click.stop.prevent="confirmRemoveWeightRecord(id, r.date)" :disabled="weightRowDeleting[id] && weightRowDeleting[id][r.date]">
                            {{ (weightRowDeleting[id] && weightRowDeleting[id][r.date]) ? 'Deleting…' : 'Confirm' }}
                          </button>
                          <button class="ml" @click.stop.prevent="weightRowConfirmDelete[id][r.date] = false" :disabled="weightRowDeleting[id] && weightRowDeleting[id][r.date]">Cancel</button>
                        </template>
                        <template v-else>
                          <button class="ml danger" @click.stop.prevent="(weightRowConfirmDelete[id] = weightRowConfirmDelete[id] || {}, weightRowConfirmDelete[id][r.date] = true)" :disabled="weightRowDeleting[id] && weightRowDeleting[id][r.date]">Delete</button>
                        </template>
                        <span v-if="removeWeightError[id] && removeWeightError[id][r.date]" class="error ml">{{ removeWeightError[id][r.date] }}</span>
                      </li>
                    </ul>
                  </div>
                  <div v-else>
                    <em>No records</em>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <div v-else-if="!animalsLoading">No animals found.</div>
      <div v-if="deleteAnimalError" class="error mt">{{ deleteAnimalError }}</div>
    </section>

    <!-- Old lookup/summary removed from Weights; use Reports hub for details -->
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, getCurrentInstance } from 'vue'
import { postJson } from '@/utils/api'
import { formatDateMDY } from '@/utils/format'
import { normalizeAiSummary } from '@/utils/aiSummary'

const formatDate = formatDateMDY

// Async ack handling for Growth/Reports
const MAX_RETRIES = 8
const BASE_DELAY_MS = 400

// Tabs
const props = defineProps<{ initialTab?: 'record' | 'browse' | 'reports' }> ()
const activeTab = ref<'record' | 'browse' | 'reports'>(
  props.initialTab === 'record' ? 'record' : (props.initialTab === 'reports' ? 'reports' : 'browse')
)
watch(() => props.initialTab, (v) => {
  if (v) activeTab.value = v === 'record' ? 'record' : (v === 'reports' ? 'reports' : 'browse')
})

// Record weight form state
const weightForm = ref<{ animal: string; dateGenerated: string; weight: number | null; notes?: string }>({
  animal: '',
  dateGenerated: new Date().toISOString().slice(0, 10),
  weight: null,
  notes: ''
})
const recording = ref(false)
const recordError = ref<string | null>(null)
const recordOk = ref(false)
// Quick registration state for unregistered animals
type RegReq = { id: string; species: string; sex: 'male'|'female'|'neutered'; birthDate: string; breed?: string; notes?: string }
const KNOWN_SPECIES = ['cow','sheep','goat','pig','horse','donkey','camel','buffalo','rabbit'] as const
const regNeeded = ref(false)
const regLoading = ref(false)
const regError = ref<string | null>(null)
const todayStr = new Date().toISOString().slice(0,10)
const regForm = ref<RegReq>({ id: '', species: '', sex: 'male', birthDate: todayStr, breed: '', notes: '' })
const selectedSpecies = ref('')
const customSpecies = ref('')

// Status confirmation for sold/deceased animals before recording
const statusConfirmNeeded = ref(false)
const statusType = ref<'sold' | 'deceased' | 'unknown' | null>(null)
const statusMessage = ref('')
const pendingRecordPayload = ref<any | null>(null)

function getStatusFromIdentity(obj: any): 'sold' | 'deceased' | 'active' | 'unknown' {
  if (!obj || typeof obj !== 'object') return 'unknown'
  const s = obj.status ?? obj.Status
  if (s != null && String(s).trim()) {
    const v = String(s).toLowerCase()
    if (v.includes('sold')) return 'sold'
    if (v.includes('deceased') || v.includes('dead')) return 'deceased'
    return 'active'
  }
  const sold = obj.sold ?? obj.isSold ?? obj.Sold ?? obj.IsSold
  if (sold === true || String(sold).toLowerCase() === 'true') return 'sold'
  const dead = obj.deceased ?? obj.isDeceased ?? obj.dead ?? obj.isDead ?? obj.Deceased ?? obj.IsDeceased
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

function resolveSpecies(): string {
  return (selectedSpecies.value === 'other' ? (customSpecies.value || '') : (selectedSpecies.value || '')).trim()
}

async function onQuickRegisterAndRecord() {
  regError.value = null
  regLoading.value = true
  try {
    const payload: RegReq = {
      id: (regForm.value.id || '').trim(),
      species: resolveSpecies(),
      sex: regForm.value.sex,
      birthDate: (regForm.value.birthDate || '').trim(),
      breed: (regForm.value.breed || '').trim(),
      notes: (regForm.value.notes || '').trim()
    }
    if (!payload.id) throw new Error('Missing animal ID')
    if (!payload.species) throw new Error('Please select a species or enter a custom species')
    await postJson<RegReq, any>('/api/AnimalIdentity/registerAnimal', payload)
    regNeeded.value = false
    // After successful registration, try recording again
    await onRecordWeight()
  } catch (e: any) {
    regError.value = e?.message ?? String(e)
  } finally {
    regLoading.value = false
  }
}

async function onRecordWeight() {
  recordError.value = null
  recordOk.value = false
  if (!weightForm.value.animal || !weightForm.value.dateGenerated || weightForm.value.weight == null) return
  recording.value = true
  try {
    // Ensure the animal is registered first via the overview list query
    const record = await findRegisteredAnimal(weightForm.value.animal)
    if (!record) {
      // Show quick registration UI and prefill
      regForm.value.id = (weightForm.value.animal || '').trim()
      regNeeded.value = true
      recording.value = false
      return
    }
    // If registered, check status to see if it's sold/deceased and require confirmation
    const st = getStatusFromIdentity(record)
    if ((st === 'sold' || st === 'deceased') && !statusConfirmNeeded.value) {
      const payload = {
        animal: weightForm.value.animal.trim(),
        dateGenerated: weightForm.value.dateGenerated,
        date: weightForm.value.dateGenerated,
        dateGeneratedMs: new Date(`${weightForm.value.dateGenerated}T00:00:00Z`).getTime(),
        weight: Number(weightForm.value.weight),
        notes: (weightForm.value.notes || '').trim()
      }
      pendingRecordPayload.value = payload
      statusType.value = st
      statusMessage.value = st === 'sold'
        ? 'This animal is marked as sold. Do you want to proceed with recording a weight?'
        : 'This animal is marked as deceased. Do you want to proceed with recording a weight?'
      statusConfirmNeeded.value = true
      recording.value = false
      return
    }
    const payload = {
      animal: weightForm.value.animal.trim(),
      dateGenerated: weightForm.value.dateGenerated,
      // Backward-compat: some backends expect 'date' instead of 'dateGenerated'
      date: weightForm.value.dateGenerated,
      // Also send epoch milliseconds for backends expecting a numeric timestamp
      dateGeneratedMs: new Date(`${weightForm.value.dateGenerated}T00:00:00Z`).getTime(),
      weight: Number(weightForm.value.weight),
      // Always include notes as a string (empty when not provided)
      notes: (weightForm.value.notes || '').trim()
    }
    await postJson<typeof payload, any>('/api/GrowthTracking/recordWeight', payload)
    recordOk.value = true
    // Keep the form, but clear weight to ease repeated entries
    weightForm.value.weight = null
  } catch (e: any) {
    recordError.value = e?.message ?? String(e)
  } finally {
    recording.value = false
  }
}

async function confirmProceedRecord() {
  if (!pendingRecordPayload.value) { statusConfirmNeeded.value = false; return }
  recordError.value = null
  recordOk.value = false
  recording.value = true
  try {
    await postJson<any, any>('/api/GrowthTracking/recordWeight', pendingRecordPayload.value)
    recordOk.value = true
    weightForm.value.weight = null
  } catch (e: any) {
    recordError.value = e?.message ?? String(e)
  } finally {
    recording.value = false
    statusConfirmNeeded.value = false
    statusType.value = null
    statusMessage.value = ''
    pendingRecordPayload.value = null
  }
}

function cancelProceedRecord() {
  statusConfirmNeeded.value = false
  statusType.value = null
  statusMessage.value = ''
  pendingRecordPayload.value = null
}

// Generate report state
const reportForm = ref<{ animal: string; startDateRange: string; endDateRange: string; reportName: string }>(
  {
    animal: '',
    startDateRange: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 10),
    endDateRange: new Date().toISOString().slice(0, 10),
    reportName: ''
  }
)
const generating = ref(false)
const reportError = ref<string | null>(null)
const reportResults = ref<string | null>(null)

async function onGenerateReport() {
  reportError.value = null
  reportResults.value = null
  if (!reportForm.value.animal || !reportForm.value.startDateRange || !reportForm.value.endDateRange || !reportForm.value.reportName) return
  generating.value = true
  try {
    const payload = { ...reportForm.value }
    const res = await postJson<typeof payload, any>('/api/GrowthTracking/generateReport', payload)
    // Accept different response shapes; prefer Results or results
    let results: string | null = null
    if (res && typeof res === 'object') {
      results = (res.Results ?? res.results ?? res.output ?? res.text ?? null) as any
    }
    reportResults.value = results ?? JSON.stringify(res, null, 2)
  } catch (e: any) {
    reportError.value = e?.message ?? String(e)
  } finally {
    generating.value = false
  }
}

// Animals with weight records
type WeightRecord = { date: string; weight: number; notes?: string }
const animalsWithRecords = ref<string[]>([])
const animalsLoading = ref(false)
const animalsError = ref<string | null>(null)
const expanded = ref<Record<string, boolean>>({})
const weightsLoading = ref<Record<string, boolean>>({})
const weightsError = ref<Record<string, string | undefined>>({})
const weightsByAnimal = ref<Record<string, WeightRecord[]>>({})
// Inline remove-weight controls state per animal/date
const weightRowConfirmDelete = ref<Record<string, Record<string, boolean>>>({})
const weightRowDeleting = ref<Record<string, Record<string, boolean>>>({})
const removeWeightError = ref<Record<string, Record<string, string | undefined>>>({})
const selectMode = ref(false)
const selected = ref<Record<string, boolean>>({})
const showBatch = ref(false)
const rowConfirmDeleteAnimal = ref<Record<string, boolean>>({})
const rowDeletingAnimal = ref<Record<string, boolean>>({})
const deleteAnimalError = ref<string | null>(null)

function toggleSelectMode() {
  selectMode.value = !selectMode.value
}
function isSelected(id: string) { return !!selected.value[id] }
function toggleSelected(id: string) { selected.value[id] = !selected.value[id] }
function isInteractiveElement(el: HTMLElement | null): boolean {
  if (!el) return false
  const tag = el.tagName
  if (['BUTTON','A','INPUT','SELECT','TEXTAREA','LABEL'].includes(tag)) return true
  if (el.closest && el.closest('.actions-cell')) return true
  const role = el.getAttribute && el.getAttribute('role')
  if (role && /button|link|checkbox|switch|menu|option/i.test(role)) return true
  return false
}
function onRowToggleAnimal(id: string, e: MouseEvent) {
  if (!selectMode.value) return
  const target = e.target as HTMLElement | null
  if (isInteractiveElement(target)) return
  toggleSelected(id)
}
const selectedIds = computed(() => Object.keys(selected.value).filter(k => selected.value[k]))
const selectedCount = computed(() => selectedIds.value.length)
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
  if (!selectedIds.value.length) { batchError.value = 'Select at least one animal'; return }
  if (!batch.value.start || !batch.value.end || !batch.value.name) { batchError.value = 'Start, End, and Report name are required'; return }
  batching.value = true
  try {
    const base = batch.value.name.trim()
    let hadFail = false
    for (const id of selectedIds.value) {
      try {
        const payload = { animal: id, startDateRange: batch.value.start, endDateRange: batch.value.end, reportName: base }
        await postJson<typeof payload, any>('/api/GrowthTracking/generateReport', payload)
        batchResults.value.push(`OK: ${id}`)
      } catch (e: any) {
        batchResults.value.push(`FAIL ${id}: ${e?.message ?? String(e)}`)
        hadFail = true
      }
    }
    // If all succeeded, clear selection and collapse the batch UI
    if (!hadFail) {
      selected.value = {}
      showBatch.value = false
      // Automatically exit selection mode after successful batch
      selectMode.value = false
    }
  } finally {
    batching.value = false
  }
}

function normalizeWeightRecord(r: any): WeightRecord | null {
  if (!r) return null
  const weightRaw = r.weight ?? r.Weight ?? r.weightKg ?? r.WeightKg ?? r.kg ?? r.value ?? r.val
  const weight = typeof weightRaw === 'number' ? weightRaw : parseFloat(String(weightRaw))
  if (!isFinite(weight)) return null
  let date: string | undefined = r.dateGenerated ?? r.date ?? r.Date ?? r.recordedAt ?? r.timestamp
  if (!date && (r.dateGeneratedMs ?? r.timestampMs ?? r.epoch ?? r.ts ?? r.time)) {
    const ms = Number(r.dateGeneratedMs ?? r.timestampMs ?? r.epoch ?? r.ts ?? r.time)
    if (isFinite(ms)) date = new Date(ms).toISOString().slice(0, 10)
  }
  if (date) {
    const dStr = String(date)
    // If it's a full ISO datetime, normalize to YYYY-MM-DD; else if parseable, convert; else keep as-is
    if (dStr.length > 10) {
      const tIdx = dStr.indexOf('T')
      date = tIdx > 0 ? dStr.slice(0, 10) : (new Date(dStr).toString() !== 'Invalid Date' ? new Date(dStr).toISOString().slice(0,10) : dStr)
    } else {
      date = dStr
    }
  } else {
    date = ''
  }
  const notes = r.notes ?? r.Notes
  return { date, weight, notes }
}

// Report lookup and AI summary
const lookup = ref<{ reportName: string }>({ reportName: '' })
const lookupLoading = ref(false)
const lookupError = ref<string | null>(null)
const reportText = ref<string | null>(null)
const summaryLoading = ref(false)
const summaryError = ref<string | null>(null)
const summaryText = ref<string | null>(null)
const reportObj = ref<any | null>(null)
function formatAdg(v: any) {
  const n = Number(v)
  return isFinite(n) ? n.toFixed(3) : '-'
}
const aiSummaryObj = computed(() => {
  if (reportObj.value && reportObj.value.aiGeneratedSummary) return normalizeAiSummary(reportObj.value.aiGeneratedSummary)
  if (summaryText.value) return normalizeAiSummary(summaryText.value)
  return null
})
const summaryRows = computed(() => {
  const r = reportObj.value
  if (!r || !Array.isArray(r.results)) return []
  return r.results.map((item: any) => {
    const animalId = item.animalId ?? item.id ?? item.target ?? ''
    let recentWeight: number | null = null
    let adg: number | null = null
    let expectedWeightToday: number | null = null
    const recs: any[] = Array.isArray(item.recordedWeights) ? item.recordedWeights : []
    if (recs.length) {
      const sorted = [...recs].sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
      const last = sorted[sorted.length - 1]
      recentWeight = Number(last?.weight)
      if (item.averageDailyGain != null) {
        adg = Number(item.averageDailyGain)
      } else if (sorted.length >= 2) {
        const first = sorted[0]
        const days = (Date.parse(last.date) - Date.parse(first.date)) / (1000 * 60 * 60 * 24)
        const gain = Number(last.weight) - Number(first.weight)
        adg = days > 0 ? gain / days : null
      }
      // Expected weight as of today based on ADG and days since last weighing
      const lastMs = Date.parse(last.date)
      if (isFinite(lastMs) && adg != null && isFinite(adg) && recentWeight != null && isFinite(recentWeight)) {
        const nowMs = Date.now()
        let daysSince = (nowMs - lastMs) / (1000 * 60 * 60 * 24)
        if (!isFinite(daysSince) || daysSince < 0) daysSince = 0
        expectedWeightToday = recentWeight + adg * daysSince
      }
    }
    return { animalId: String(animalId || ''), recentWeight, expectedWeightToday, adg }
  })
})

async function onLoadReport(attempt = 0) {
  lookupError.value = null
  reportText.value = null
  summaryText.value = null
  if (!lookup.value.reportName) return
  lookupLoading.value = true
  try {
    const payload = { reportName: lookup.value.reportName.trim() }
    const res = await postJson<typeof payload, any>('/api/GrowthTracking/_getReportByName', payload)
    let text: string | null = null
    // Helper: recursively find a likely report object (handles strings, nesting, and Results/results case)
    const findReport = (node: any, depth = 0): any | null => {
      if (!node || depth > 4) return null
      if (typeof node === 'string') {
        try { const j = JSON.parse(node); return findReport(j, depth + 1) } catch { return null }
      }
      if (Array.isArray(node)) {
        for (const el of node) {
          const found = findReport(el, depth + 1)
          if (found) return found
        }
        return null
      }
      if (typeof node === 'object') {
        const obj = node as any
        // Normalize case variants and stringified results
        const hasResults = 'results' in obj || 'Results' in obj
        const hasName = 'reportName' in obj || 'ReportName' in obj || 'name' in obj
        const hasAi = 'aiGeneratedSummary' in obj || 'summary' in obj || 'Summary' in obj
        const hasTargets = 'targetAnimals' in obj || 'targets' in obj
        if (hasResults || hasName || hasAi || hasTargets) {
          // If results is a JSON string, parse it
          if (typeof obj.results === 'string') {
            try { obj.results = JSON.parse(obj.results) } catch {}
          }
          if (typeof obj.Results === 'string') {
            try { obj.Results = JSON.parse(obj.Results) } catch {}
          }
          return obj
        }
        const keys = ['data','payload','body','result','Result','content','value','report','reports']
        for (const k of keys) {
          if (k in obj) {
            const found = findReport((obj as any)[k], depth + 1)
            if (found) return found
          }
        }
      }
      return null
    }

    if (typeof res === 'string') {
      text = res
      reportObj.value = findReport(res)
    } else if (res && typeof res === 'object') {
      const r: any = res
      // Try common text containers for JSON fallback display
      const tCandidate: any = r.Results ?? r.results ?? r.report ?? r.text ?? r.content ?? r.data ?? null
      text = typeof tCandidate === 'string' ? tCandidate : (tCandidate && typeof tCandidate === 'object' ? JSON.stringify(tCandidate, null, 2) : null)
      reportObj.value = findReport(r)
      if (!reportObj.value && r.request && attempt < MAX_RETRIES) {
        const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 2000)
        setTimeout(() => onLoadReport(attempt + 1), delay)
        return
      }
    }
    if (!text) {
      try { text = JSON.stringify(res, null, 2) } catch { text = String(res) }
    }
    reportText.value = text
  } catch (e: any) {
    lookupError.value = e?.message ?? String(e)
  } finally {
    lookupLoading.value = false
  }
}

// Report names listing for Weights
const weightReportNames = ref<string[]>([])
const reportNamesLoading = ref(false)
const reportNamesError = ref<string | null>(null)
const rowDeleting = ref<Record<string, boolean>>({})
const deleteListError = ref<string | null>(null)
// Optional row actions dropdown state (future-proof): ensure we can close any open menus
const rowMenuOpen = ref<Record<string, boolean>>({})
const expandedReport = ref<Record<string, boolean>>({})
const loadingReportByName = ref<Record<string, boolean>>({})
const errorReportByName = ref<Record<string, string | null>>({})
const reportObjByName = ref<Record<string, any | null>>({})
const reportTextByName = ref<Record<string, string | null>>({})
const summaryTextByName = ref<Record<string, string | null>>({})
const summaryLoadingByName = ref<Record<string, boolean>>({})
const summaryErrorByName = ref<Record<string, string | null>>({})
const rowConfirmDelete = ref<Record<string, boolean>>({})
// If navigated with ?name=XYZ, auto-open this report after list load
const pendingOpenReportName = ref<string | null>(null)

async function loadWeightReportNames(attempt = 0) {
  if (attempt === 0) {
    reportNamesLoading.value = true
    reportNamesError.value = null
  }
  try {
    const res = await postJson<any, any>('/api/GrowthTracking/_listReports', {})
    function tryParseJson(text: any): any {
      if (typeof text !== 'string') return text
      try { return JSON.parse(text) } catch {
        const s = String(text)
        if (s.includes('\n')) return s.split(/\r?\n/).map(x => x.trim()).filter(Boolean)
        if (s.includes(',')) return s.split(',').map(x => x.trim()).filter(Boolean)
        return text
      }
    }
    function extractList(body: any): any[] {
      const seen = new Set<any>()
      function walk(node: any, depth = 0): any[] | null {
        if (node == null || depth > 4 || seen.has(node)) return null
        seen.add(node)
        const b = tryParseJson(node)
        if (Array.isArray(b)) return b
        if (b && typeof b === 'object') {
          const keys = ['names','Names','reports','Reports','reportNames','items','Items','data','Data','list','List','result','Result','results','Results','content','Content','payload','Payload','body','Body']
          for (const k of keys) {
            if (k in b) {
              const v = (b as any)[k]
              const arr = walk(v, depth + 1)
              if (Array.isArray(arr)) return arr
            }
          }
          for (const v of Object.values(b)) {
            const arr = walk(v, depth + 1)
            if (Array.isArray(arr)) return arr
          }
        }
        return null
      }
      return walk(body) || []
    }

    let rawList: any[] | null = null
    const r: any = res
    if (r && typeof r === 'object') {
      if (Array.isArray(r.body)) rawList = r.body
      else if (r.body && typeof r.body === 'object') {
        if (Array.isArray(r.body.reports)) rawList = r.body.reports
        else if (Array.isArray(r.body.Reports)) rawList = r.body.Reports
      }
      if (!rawList) {
        if (Array.isArray(r.reports)) rawList = r.reports
        else if (Array.isArray(r.Reports)) rawList = r.Reports
        else if (Array.isArray((r as any).Body)) rawList = (r as any).Body
      }
    }
    if (!rawList) rawList = extractList(res)
    if ((!rawList || rawList.length === 0) && r && typeof r === 'object' && 'request' in r && attempt < MAX_RETRIES) {
      const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 2000)
      setTimeout(() => loadWeightReportNames(attempt + 1), delay)
      return
    }
    const list: any[] = Array.isArray(rawList) ? rawList : []
    const used = new Map<string, number>()
    const looksLikeReport = (obj: any) => obj && typeof obj === 'object' && (('results' in obj) || ('Results' in obj) || ('reportName' in obj) || ('ReportName' in obj) || ('aiGeneratedSummary' in obj))
    const norm = (o: any) => {
      const x: any = { ...o }
      if (typeof x.results === 'string') { try { x.results = JSON.parse(x.results) } catch {} }
      if (Array.isArray(x.Results) && !Array.isArray(x.results)) x.results = x.Results
      return x
    }
    const producedNames: string[] = []
    reportObjByName.value = {}
    list.forEach((x, i) => {
      if (typeof x === 'string' || typeof x === 'number') {
        const base = String(x)
        const n = used.has(base) ? `${base} (${(used.get(base) || 1) + 1})` : base
        used.set(base, (used.get(base) || 0) + 1)
        producedNames.push(n)
      } else if (x && typeof x === 'object') {
        const base0 = (x as any).name ?? (x as any).reportName ?? (x as any).id
        let base = base0 != null && String(base0).trim() ? String(base0).trim() : `Report ${i + 1}`
        const n = used.has(base) ? `${base} (${(used.get(base) || 1) + 1})` : base
        used.set(base, (used.get(base) || 0) + 1)
        producedNames.push(n)
        if (looksLikeReport(x)) {
          reportObjByName.value[n] = norm(x)
        }
      }
    })
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
    weightReportNames.value = producedNames.sort((a, b) => collator.compare(a, b))
    // If we have a pending deep-linked name, expand it now (if present)
    if (pendingOpenReportName.value) {
      const target = pendingOpenReportName.value
      if (weightReportNames.value.includes(target)) {
        // Ensure row is expanded and content loaded
        expandedReport.value[target] = true
        if (!reportObjByName.value[target] && !reportTextByName.value[target] && !loadingReportByName.value[target]) {
          loadReportByName(target)
        }
        // Clear pending once handled
        pendingOpenReportName.value = null
      }
    }
  } catch (e: any) {
    reportNamesError.value = e?.message ?? String(e)
  } finally {
    reportNamesLoading.value = false
  }
}

function openName(name: string) {
  // Close any open row dropdowns when navigating to a report
  rowMenuOpen.value = {}
  lookup.value.reportName = name
  onLoadReport()
}

function toggleReport(name: string) {
  rowMenuOpen.value = {}
  expandedReport.value[name] = !expandedReport.value[name]
  if (expandedReport.value[name] && !reportObjByName.value[name] && !reportTextByName.value[name] && !loadingReportByName.value[name]) {
    loadReportByName(name)
  }
}

async function loadReportByName(name: string, attempt = 0) {
  loadingReportByName.value[name] = true
  errorReportByName.value[name] = null
  try {
    const payload = { reportName: name.trim() }
    const res = await postJson<typeof payload, any>('/api/GrowthTracking/_getReportByName', payload)
    let text: string | null = null
    let obj: any | null = null

    const findReport = (node: any, depth = 0): any | null => {
      if (!node || depth > 4) return null
      if (typeof node === 'string') {
        try { const j = JSON.parse(node); return findReport(j, depth + 1) } catch { return null }
      }
      if (Array.isArray(node)) { for (const el of node) { const f = findReport(el, depth + 1); if (f) return f } return null }
      if (typeof node === 'object') {
        const o = node as any
        const hasResults = 'results' in o || 'Results' in o
        const hasName = 'reportName' in o || 'ReportName' in o || 'name' in o
        const hasAi = 'aiGeneratedSummary' in o || 'summary' in o || 'Summary' in o
        const hasTargets = 'targetAnimals' in o || 'targets' in o
        if (hasResults || hasName || hasAi || hasTargets) {
          if (typeof o.results === 'string') { try { o.results = JSON.parse(o.results) } catch {} }
          if (typeof o.Results === 'string') { try { o.Results = JSON.parse(o.Results) } catch {} }
          return o
        }
        const keys = ['data','payload','body','result','Result','content','value','report','reports']
        for (const k of keys) {
          if (k in o) {
            const found = findReport(o[k], depth + 1)
            if (found) return found
          }
        }
      }
      return null
    }

    if (typeof res === 'string') {
      text = res
      obj = findReport(res)
    } else if (res && typeof res === 'object') {
      const r: any = res
      const tCandidate: any = r.Results ?? r.results ?? r.report ?? r.text ?? r.content ?? r.data ?? null
      text = typeof tCandidate === 'string' ? tCandidate : (tCandidate && typeof tCandidate === 'object' ? JSON.stringify(tCandidate, null, 2) : null)
      obj = findReport(r)
      if (!obj && r.request && attempt < MAX_RETRIES) {
        const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 2000)
        setTimeout(() => loadReportByName(name, attempt + 1), delay)
        return
      }
    }
    if (!text) {
      try { text = JSON.stringify(res, null, 2) } catch { text = String(res) }
    }
    reportTextByName.value[name] = text
    reportObjByName.value[name] = obj
  } catch (e: any) {
    errorReportByName.value[name] = e?.message ?? String(e)
  } finally {
    loadingReportByName.value[name] = false
  }
}

function summaryRowsFor(r: any) {
  if (!r || !Array.isArray(r.results)) return []
  return r.results.map((item: any) => {
    const animalId = item.animalId ?? item.id ?? item.target ?? ''
    let recentWeight: number | null = null
    let adg: number | null = null
    let expectedWeightToday: number | null = null
    const recs: any[] = Array.isArray(item.recordedWeights) ? item.recordedWeights : []
    if (recs.length) {
      const sorted = [...recs].sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
      const last = sorted[sorted.length - 1]
      recentWeight = Number(last?.weight)
      if (item.averageDailyGain != null) {
        adg = Number(item.averageDailyGain)
      } else if (sorted.length >= 2) {
        const first = sorted[0]
        const days = (Date.parse(last.date) - Date.parse(first.date)) / (1000 * 60 * 60 * 24)
        const gain = Number(last.weight) - Number(first.weight)
        adg = days > 0 ? gain / days : null
      }
      const lastMs = Date.parse(last.date)
      if (isFinite(lastMs) && adg != null && isFinite(adg) && recentWeight != null && isFinite(recentWeight)) {
        const nowMs = Date.now()
        let daysSince = (nowMs - lastMs) / (1000 * 60 * 60 * 24)
        if (!isFinite(daysSince) || daysSince < 0) daysSince = 0
        expectedWeightToday = recentWeight + adg * daysSince
      }
    }
    return { animalId: String(animalId || ''), recentWeight, expectedWeightToday, adg }
  })
}

function aiSummaryFor(name: string) {
  const obj = reportObjByName.value[name]
  const sumText = summaryTextByName.value[name]
  if (obj && obj.aiGeneratedSummary) return normalizeAiSummary(obj.aiGeneratedSummary)
  if (sumText) return normalizeAiSummary(sumText)
  return null
}

async function onLoadSummaryByName(name: string) {
  const reportName = String(name || '').trim()
  if (!reportName) return
  summaryErrorByName.value[reportName] = null
  summaryLoadingByName.value[reportName] = true
  try {
    const payload = { reportName }
    const res = await postJson<typeof payload, any>('/api/GrowthTracking/aiSummary', payload)
    let text: string | null = null
    if (typeof res === 'string') text = res
    else if (res && typeof res === 'object') {
      const r: any = res
      text = r.summary ?? r.Summary ?? r.result ?? r.text ?? r.content ?? null
      if (text && typeof text !== 'string') text = JSON.stringify(text, null, 2)
    }
    summaryTextByName.value[reportName] = text ?? JSON.stringify(res, null, 2)
    // Immediately reflect the AI summary in the inline view by setting it on the cached report object
    const current = reportObjByName.value[reportName]
    if (current && typeof current === 'object') {
      reportObjByName.value[reportName] = { ...current, aiGeneratedSummary: summaryTextByName.value[reportName] }
    }
    // Optionally refresh from server in case it persisted the summary to the report object
    // (non-blocking; UI already updated using local assignment above)
    loadReportByName(reportName)
  } catch (e: any) {
    summaryErrorByName.value[reportName] = e?.message ?? String(e)
  } finally {
    summaryLoadingByName.value[reportName] = false
  }
}

async function onDeleteWeightReportName(name: string) {
  deleteListError.value = null
  const displayName = String(name || '').trim()
  // Prefer the actual report object's canonical name if available
  const canonical = reportObjByName.value[displayName]
  const reportName = String(
    (canonical && (canonical.reportName || canonical.name || canonical.ReportName || canonical.Name)) || displayName
  ).trim()
  if (!reportName) return
  rowDeleting.value[displayName] = true
  try {
    const payload = { reportName }
    await postJson<typeof payload, any>('/api/GrowthTracking/deleteReport', payload)
    // Clear any cached inline content/state for the deleted report
    delete expandedReport.value[displayName]
    delete loadingReportByName.value[displayName]
    delete errorReportByName.value[displayName]
    delete reportObjByName.value[displayName]
    delete reportTextByName.value[displayName]
    delete summaryTextByName.value[displayName]
    delete summaryLoadingByName.value[displayName]
    delete summaryErrorByName.value[displayName]
    delete rowConfirmDelete.value[displayName]
    // Remove from the visible list immediately for better UX
    weightReportNames.value = weightReportNames.value.filter(n => n !== displayName)
    // Always refresh list to ensure we reflect server state (names may have changed)
    await loadWeightReportNames()
  } catch (e: any) {
    deleteListError.value = e?.message ?? String(e)
  } finally {
    rowDeleting.value[displayName] = false
  }
}

function confirmDelete(name: string) {
  // Separate small handler to make the template a bit cleaner
  onDeleteWeightReportName(name)
}

// Auto-load names when Reports opens, and refresh Browse list when opened
watch(() => activeTab.value, (t) => {
  if (t === 'reports') {
    // Always refresh the reports list whenever the Reports tab is opened
    loadWeightReportNames()
  }
  if (t === 'browse') {
    // Always refresh the animals list when opening the tab
    loadAnimalsWithWeightRecords()
  }
}, { immediate: true })

// Also refresh when top nav selects the Weights route
const inst = getCurrentInstance()
const route: any = (inst as any)?.proxy?.$route
watch(() => route?.path, (p) => {
  if ((p === '/weights' || p === '/weights/browse') && activeTab.value === 'browse') {
    loadAnimalsWithWeightRecords()
  }
})
// Watch for deep-link to a specific report name via query param and auto-open it
watch(() => (route?.query && (route.query as any).name) as any, (n) => {
  const q = typeof n === 'string' ? n.trim() : ''
  if (!q) return
  // Switch to Reports tab and open after list loads
  activeTab.value = 'reports'
  pendingOpenReportName.value = q
  // If names are already loaded, attempt immediate open
  if (!reportNamesLoading.value && weightReportNames.value.length) {
    const target = pendingOpenReportName.value
    if (target && weightReportNames.value.includes(target)) {
      expandedReport.value[target] = true
      if (!reportObjByName.value[target] && !reportTextByName.value[target] && !loadingReportByName.value[target]) {
        loadReportByName(target)
      }
      pendingOpenReportName.value = null
    }
  } else {
    // Ensure the list loads
    loadWeightReportNames()
  }
}, { immediate: true })

async function onLoadSummary() {
  summaryError.value = null
  summaryText.value = null
  if (!lookup.value.reportName) return
  summaryLoading.value = true
  try {
    const payload = { reportName: lookup.value.reportName.trim() }
    const res = await postJson<typeof payload, any>('/api/GrowthTracking/aiSummary', payload)
    let text: string | null = null
    if (typeof res === 'string') text = res
    else if (res && typeof res === 'object') {
      const r: any = res
      text = r.summary ?? r.Summary ?? r.result ?? r.text ?? r.content ?? null
      if (text && typeof text !== 'string') text = JSON.stringify(text, null, 2)
    }
    summaryText.value = text ?? JSON.stringify(res, null, 2)
    // Update the current report object so the AI Summary section appears immediately
    if (reportObj.value && typeof reportObj.value === 'object') {
      reportObj.value = { ...reportObj.value, aiGeneratedSummary: summaryText.value }
    }
    // Optionally reload the report to reflect any persisted changes on the server
    onLoadReport(0)
  } catch (e: any) {
    summaryError.value = e?.message ?? String(e)
  } finally {
    summaryLoading.value = false
  }
}

// delete handled at list row level; no delete button in report view

function refreshExpandedWeights() {
  // For any animals currently expanded, ensure their weights are loaded/refreshed
  const ids = Object.keys(expanded.value).filter(k => expanded.value[k])
  for (const id of ids) {
    if (!weightsLoading.value[id]) {
      loadWeightRecords(id)
    }
  }
}

async function loadAnimalsWithWeightRecords() {
  animalsLoading.value = true
  animalsError.value = null
  try {
    const res = await postJson<any, any>('/api/GrowthTracking/_getAllAnimalsWithWeightRecords', {})
    let list: any = []
    // Accept direct array
    if (Array.isArray(res)) list = res
    // Accept common envelope shapes
    else if (res && typeof res === 'object') {
      const r: any = res
      if (Array.isArray(r.animals)) list = r.animals
      else if (Array.isArray(r.items)) list = r.items
      else if (Array.isArray(r.data)) list = r.data
      // Accept nested envelopes like { body: { animals: [...] } }
      else if (r.body && typeof r.body === 'object') {
        if (Array.isArray(r.body.animals)) list = r.body.animals
        else if (Array.isArray(r.body.items)) list = r.body.items
        else if (Array.isArray(r.body.data)) list = r.body.data
      }
      else if (r.payload && typeof r.payload === 'object') {
        if (Array.isArray(r.payload.animals)) list = r.payload.animals
        else if (Array.isArray(r.payload.items)) list = r.payload.items
        else if (Array.isArray(r.payload.data)) list = r.payload.data
      }
      else if (r.result && typeof r.result === 'object') {
        if (Array.isArray(r.result.animals)) list = r.result.animals
        else if (Array.isArray(r.result.items)) list = r.result.items
        else if (Array.isArray(r.result.data)) list = r.result.data
      }
      else if (r.content && typeof r.content === 'object') {
        if (Array.isArray(r.content.animals)) list = r.content.animals
        else if (Array.isArray(r.content.items)) list = r.content.items
        else if (Array.isArray(r.content.data)) list = r.content.data
      }
      // If only a request id was returned, surface a helpful console warning
      if (!Array.isArray(list) || !list.length) {
        if (r.request && !r.animals && !(r.body && r.body.animals)) {
          console.warn('Weights: _getAllAnimalsWithWeightRecords returned request id without animals. Expected array or { animals: string[] }. Response:', r)
        }
      }
    }
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
    animalsWithRecords.value = (list as any[])
      .map(x => String(x))
      .filter(Boolean)
      .sort((a, b) => collator.compare(a, b))
    // After (re)loading animals, refresh weights for any expanded rows
    refreshExpandedWeights()
  } catch (e: any) {
    animalsError.value = e?.message ?? String(e)
  } finally {
    animalsLoading.value = false
  }
}

function toggleAnimalRecords(animal: string) {
  expanded.value[animal] = !expanded.value[animal]
  if (expanded.value[animal] && !weightsByAnimal.value[animal] && !weightsLoading.value[animal]) {
    loadWeightRecords(animal)
  }
}

async function loadWeightRecords(animal: string) {
  weightsLoading.value[animal] = true
  weightsError.value[animal] = undefined
  try {
    const payload = { animal }
  const res = await postJson<typeof payload, any>('/api/GrowthTracking/_getAnimalWeights', payload)
    let list: any = []
    if (Array.isArray(res)) list = res
    else if (res && typeof res === 'object') {
      const r: any = res
      // Top-level common keys
      if (Array.isArray(r.records)) list = r.records
      else if (Array.isArray(r.weights)) list = r.weights
      else if (Array.isArray(r.weightRecords)) list = r.weightRecords
      else if (Array.isArray(r.entries)) list = r.entries
      else if (Array.isArray(r.items)) list = r.items
      else if (Array.isArray(r.data)) list = r.data
      // Nested envelope keys: body/payload/result/content
      else if (r.body && typeof r.body === 'object') {
        const b = r.body
        if (Array.isArray(b.weightRecords)) list = b.weightRecords
        else if (Array.isArray(b.records)) list = b.records
        else if (Array.isArray(b.weights)) list = b.weights
        else if (Array.isArray(b.entries)) list = b.entries
        else if (Array.isArray(b.items)) list = b.items
        else if (Array.isArray(b.data)) list = b.data
      } else if (r.payload && typeof r.payload === 'object') {
        const p = r.payload
        if (Array.isArray(p.weightRecords)) list = p.weightRecords
        else if (Array.isArray(p.records)) list = p.records
        else if (Array.isArray(p.weights)) list = p.weights
        else if (Array.isArray(p.entries)) list = p.entries
        else if (Array.isArray(p.items)) list = p.items
        else if (Array.isArray(p.data)) list = p.data
      } else if (r.result && typeof r.result === 'object') {
        const q = r.result
        if (Array.isArray(q.weightRecords)) list = q.weightRecords
        else if (Array.isArray(q.records)) list = q.records
        else if (Array.isArray(q.weights)) list = q.weights
        else if (Array.isArray(q.entries)) list = q.entries
        else if (Array.isArray(q.items)) list = q.items
        else if (Array.isArray(q.data)) list = q.data
      } else if (r.content && typeof r.content === 'object') {
        const c = r.content
        if (Array.isArray(c.weightRecords)) list = c.weightRecords
        else if (Array.isArray(c.records)) list = c.records
        else if (Array.isArray(c.weights)) list = c.weights
        else if (Array.isArray(c.entries)) list = c.entries
        else if (Array.isArray(c.items)) list = c.items
        else if (Array.isArray(c.data)) list = c.data
      }
      // If only a request id is present, warn to aid troubleshooting
      if ((!Array.isArray(list) || !list.length) && r.request && !(r.body && (Array.isArray(r.body.weightRecords) || Array.isArray(r.body.records)))) {
        console.warn('Weights: _getAnimalWeights returned request id without weight records. Expected array or body.weightRecords[]. Response:', r)
      }
    }
    const normalized = (list as any[]).map(normalizeWeightRecord).filter(Boolean) as WeightRecord[]
    // Sort by date ascending using Date.parse when available
    normalized.sort((a, b) => {
      const ta = Date.parse(a.date)
      const tb = Date.parse(b.date)
      if (isFinite(ta) && isFinite(tb)) return ta - tb
      if (a.date === b.date) return 0
      return a.date < b.date ? -1 : 1
    })
    weightsByAnimal.value[animal] = normalized
    // reset any per-record errors that no longer apply
    removeWeightError.value[animal] = {}
  } catch (e: any) {
    weightsError.value[animal] = e?.message ?? String(e)
  } finally {
    weightsLoading.value[animal] = false
  }
}

async function onDeleteAnimal(animalId: string) {
  deleteAnimalError.value = null
  const id = String(animalId || '').trim()
  if (!id) return
  rowDeletingAnimal.value[id] = true
  try {
    // Backend expects the field to be named exactly "animal"
    const payload: any = { animal: id }
    await postJson<typeof payload, any>('/api/GrowthTracking/deleteAnimal', payload)
    // Remove from local lists and clear related UI state
    animalsWithRecords.value = animalsWithRecords.value.filter(a => a !== id)
    delete expanded.value[id]
    delete weightsLoading.value[id]
    delete weightsError.value[id]
    delete weightsByAnimal.value[id]
    delete selected.value[id]
    rowConfirmDeleteAnimal.value[id] = false
    // Refresh from server to ensure consistency (optional but safer)
    await loadAnimalsWithWeightRecords()
  } catch (e: any) {
    deleteAnimalError.value = e?.message ?? String(e)
  } finally {
    rowDeletingAnimal.value[id] = false
  }
}

function confirmDeleteAnimal(id: string) {
  onDeleteAnimal(id)
}

async function onRemoveWeightRecord(animal: string, date: string) {
  const a = String(animal || '').trim()
  const d = String(date || '').trim()
  if (!a || !d) return
  weightRowDeleting.value[a] = weightRowDeleting.value[a] || {}
  removeWeightError.value[a] = removeWeightError.value[a] || {}
  weightRowDeleting.value[a][d] = true
  removeWeightError.value[a][d] = undefined
  try {
    const payload: any = { animal: a, date: d }
    await postJson<typeof payload, any>('/api/GrowthTracking/removeWeightRecord', payload)
    // Refresh this animal's weights and close the confirm UI
    await loadWeightRecords(a)
    if (weightRowConfirmDelete.value[a]) weightRowConfirmDelete.value[a][d] = false
    // If the animal no longer has records, collapse and clear local state
    const recs = weightsByAnimal.value[a] || []
    if (!recs.length) {
      expanded.value[a] = false
      delete weightsByAnimal.value[a]
      delete weightsLoading.value[a]
      delete weightsError.value[a]
      delete selected.value[a]
    }
    // Always refresh the animals-with-records list to reflect server state
    await loadAnimalsWithWeightRecords()
  } catch (e: any) {
    removeWeightError.value[a][d] = e?.message ?? String(e)
  } finally {
    weightRowDeleting.value[a][d] = false
  }
}

function confirmRemoveWeightRecord(animal: string, date: string) {
  onRemoveWeightRecord(animal, date)
}
</script>

<style scoped>
.results-pre { white-space: pre-wrap }
.weights-box { background: #fafafa; border: 1px solid #eee; border-radius: 6px; padding: 0.75rem }
.muted { color: #666 }
.summary-box { background: #f6faff; border: 1px solid #e0f0ff; border-radius: 6px; padding: 0.75rem }
.actions-cell { display: flex; gap: 0.5rem }
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
.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem }
.clickable-row { cursor: pointer }
.clickable-row:hover { background: var(--surface-2, #fafafa) }
</style>
