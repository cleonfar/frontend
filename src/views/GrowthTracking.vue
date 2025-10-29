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
                <button class="danger" @click.stop="onDeleteWeightReportName(name)" :disabled="rowDeleting[name]">
                  {{ rowDeleting[name] ? 'Deleting…' : 'Delete' }}
                </button>
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
            <tr>
              <td v-if="selectMode"><input type="checkbox" :checked="isSelected(id)" @change="toggleSelected(id)" /></td>
              <td><router-link :to="`/animals/${encodeURIComponent(id)}`">{{ id }}</router-link></td>
              <td><button @click="toggleAnimalRecords(id)">{{ expanded[id] ? 'Hide weights' : 'View weights' }}</button></td>
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

async function onRecordWeight() {
  recordError.value = null
  recordOk.value = false
  if (!weightForm.value.animal || !weightForm.value.dateGenerated || weightForm.value.weight == null) return
  recording.value = true
  try {
    const payload = {
      animal: weightForm.value.animal.trim(),
      dateGenerated: weightForm.value.dateGenerated,
      // Backward-compat: some backends expect 'date' instead of 'dateGenerated'
      date: weightForm.value.dateGenerated,
      // Also send epoch milliseconds for backends expecting a numeric timestamp
      dateGeneratedMs: new Date(`${weightForm.value.dateGenerated}T00:00:00Z`).getTime(),
      weight: Number(weightForm.value.weight),
      notes: (weightForm.value.notes || '').trim() || undefined
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
const selectMode = ref(false)
const selected = ref<Record<string, boolean>>({})
const showBatch = ref(false)

function toggleSelectMode() {
  selectMode.value = !selectMode.value
}
function isSelected(id: string) { return !!selected.value[id] }
function toggleSelected(id: string) { selected.value[id] = !selected.value[id] }
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

async function onLoadReport() {
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
      if (Array.isArray(node)) return null
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
        const keys = ['data','payload','body','result','Result','content','value','report']
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

async function loadWeightReportNames() {
  reportNamesLoading.value = true
  reportNamesError.value = null
  try {
    const res = await postJson<any, any>('/api/GrowthTracking/_listReports', {})
    let list: any[] = []
    let obj: any = res
    if (typeof res === 'string') {
      try { obj = JSON.parse(res) } catch { obj = res }
    }
    if (Array.isArray(obj)) list = obj
    else if (obj && typeof obj === 'object') {
      if (Array.isArray(obj.names)) list = obj.names
      else if (Array.isArray(obj.reports)) list = obj.reports
      else if (Array.isArray(obj.items)) list = obj.items
      else if (Array.isArray(obj.data)) list = obj.data
    }
    const names = list.map(x => {
      if (typeof x === 'string' || typeof x === 'number') return String(x)
      if (x && typeof x === 'object') return String((x as any).name ?? (x as any).reportName ?? (x as any).id ?? '')
      return ''
    }).filter(Boolean)
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
    weightReportNames.value = names.sort((a, b) => collator.compare(a, b))
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

async function loadReportByName(name: string) {
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
      if (Array.isArray(node)) return null
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
        const keys = ['data','payload','body','result','Result','content','value','report']
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
  } catch (e: any) {
    summaryErrorByName.value[reportName] = e?.message ?? String(e)
  } finally {
    summaryLoadingByName.value[reportName] = false
  }
}

async function onDeleteWeightReportName(name: string) {
  deleteListError.value = null
  const reportName = String(name || '').trim()
  if (!reportName) return
  const ok = confirm(`Delete report "${reportName}"? This cannot be undone.`)
  if (!ok) return
  rowDeleting.value[reportName] = true
  try {
    const payload = { reportName }
    await postJson<typeof payload, any>('/api/GrowthTracking/deleteReport', payload)
    // Remove locally for faster UX, then refresh list
    weightReportNames.value = weightReportNames.value.filter(n => n !== reportName)
    if (!weightReportNames.value.length) await loadWeightReportNames()
  } catch (e: any) {
    deleteListError.value = e?.message ?? String(e)
  } finally {
    rowDeleting.value[reportName] = false
  }
}

// Auto-load names when Reports opens, and refresh Browse list when opened
watch(() => activeTab.value, (t) => {
  if (t === 'reports' && !weightReportNames.value.length && !reportNamesLoading.value) {
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
    if (Array.isArray(res)) list = res
    else if (res && typeof res === 'object') {
      if (Array.isArray(res.animals)) list = res.animals
      else if (Array.isArray(res.items)) list = res.items
      else if (Array.isArray(res.data)) list = res.data
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
      if (Array.isArray((res as any).records)) list = (res as any).records
      else if (Array.isArray((res as any).weights)) list = (res as any).weights
      else if (Array.isArray((res as any).weightRecords)) list = (res as any).weightRecords
      else if (Array.isArray((res as any).entries)) list = (res as any).entries
      else if (Array.isArray((res as any).items)) list = (res as any).items
      else if (Array.isArray((res as any).data)) list = (res as any).data
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
  } catch (e: any) {
    weightsError.value[animal] = e?.message ?? String(e)
  } finally {
    weightsLoading.value[animal] = false
  }
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
</style>
