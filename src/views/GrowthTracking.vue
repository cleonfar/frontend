<template>
  <div class="card">
    <h2>Growth Tracking</h2>

    <section>
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

    <section class="mt">
      <h3>Generate report</h3>
      <form @submit.prevent="onGenerateReport">
        <div class="row">
          <label>Animal ID</label>
          <input v-model="reportForm.animal" required placeholder="e.g. ANML-001" />
        </div>
        <div class="row">
          <label>Start</label>
          <input type="date" v-model="reportForm.startDateRange" required />
        </div>
        <div class="row">
          <label>End</label>
          <input type="date" v-model="reportForm.endDateRange" required />
        </div>
        <div class="row">
          <label>Report name</label>
          <input v-model="reportForm.reportName" required placeholder="e.g. Oct-2025-weight" />
        </div>
        <button :disabled="generating">{{ generating ? 'Generating…' : 'Generate' }}</button>
        <div v-if="reportError" class="error">{{ reportError }}</div>
      </form>

      <div v-if="reportResults" class="report-box mt">
        <h4>Report Results</h4>
        <pre class="results-pre">{{ reportResults }}</pre>
      </div>
    </section>
    
    <section class="mt">
      <h3>Animals with weight records</h3>
      <div class="row">
        <button @click="loadAnimalsWithWeightRecords" :disabled="animalsLoading">{{ animalsLoading ? 'Loading…' : 'Load animals' }}</button>
        <div v-if="animalsError" class="error">{{ animalsError }}</div>
      </div>
      <table v-if="animalsWithRecords.length">
        <thead>
          <tr>
            <th>Animal</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="id in animalsWithRecords" :key="id">
            <tr>
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
                        <span>{{ r.date }}</span>
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

    <section class="mt">
      <h3>Lookup report</h3>
      <form @submit.prevent="onLoadReport">
        <div class="row">
          <label>Report name</label>
          <input v-model="lookup.reportName" required placeholder="e.g. Oct-2025-weight" />
          <button :disabled="lookupLoading">{{ lookupLoading ? 'Loading…' : 'Load report' }}</button>
        </div>
        <div v-if="lookupError" class="error">{{ lookupError }}</div>
      </form>

      <div v-if="reportText" class="report-box mt">
        <h4>Report</h4>
        <pre class="results-pre">{{ reportText }}</pre>
        <div class="row mt">
          <button @click="onLoadSummary" :disabled="summaryLoading">{{ summaryLoading ? 'Summarizing…' : 'AI summary' }}</button>
          <div v-if="summaryError" class="error">{{ summaryError }}</div>
        </div>
        <div v-if="summaryText" class="summary-box mt">
          <h4>AI Summary</h4>
          <pre class="results-pre">{{ summaryText }}</pre>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { postJson } from '@/utils/api'

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
    if (typeof res === 'string') {
      text = res
    } else if (res && typeof res === 'object') {
      const r: any = res
      text = r.Results ?? r.results ?? r.report ?? r.text ?? r.content ?? r.data ?? null
      if (text && typeof text !== 'string') {
        text = JSON.stringify(text, null, 2)
      }
    }
    reportText.value = text ?? JSON.stringify(res, null, 2)
  } catch (e: any) {
    lookupError.value = e?.message ?? String(e)
  } finally {
    lookupLoading.value = false
  }
}

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
    animalsWithRecords.value = (list as any[]).map(x => String(x)).filter(Boolean)
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
</style>
