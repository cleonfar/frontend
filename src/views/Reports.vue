<template>
  <div class="card root-card">
    <h2>Reports</h2>

    <div class="row">
      <label>Report type</label>
      <select v-model="selectedType">
        <option value="weights">Weights</option>
        <option value="reproduction">Reproduction</option>
      </select>
    </div>

    <section class="mt">
      <h3>Generate report</h3>
      <form @submit.prevent="onGenerateReport">
        <template v-if="selectedType === 'weights'">
          <div class="row">
            <label>Animal ID</label>
            <input v-model="wForm.animal" required placeholder="e.g. ANML-001" />
          </div>
        </template>
        <template v-else>
          <div class="row">
            <label>Mother ID</label>
            <input v-model="rForm.target" required placeholder="e.g. M-0001" />
          </div>
        </template>
        <div class="row">
          <label>Start</label>
          <input type="date" v-model="dateRange.start" required />
        </div>

      <div v-if="batchTargets.length" class="mt">
        <h4>Selected for batch</h4>
        <ul>
          <li v-for="t in batchTargets" :key="t">
            <button class="link" @click="selectedType === 'weights' ? (wForm.animal = t) : (rForm.target = t)">{{ t }}</button>
          </li>
        </ul>
        <button class="mt" @click="onGenerateBatch" :disabled="batching">{{ batching ? 'Generating…' : 'Generate for all' }}</button>
        <div class="mt" v-if="batchResults.length">
          <h4>Batch results</h4>
          <ul>
            <li v-for="r in batchResults" :key="r">{{ r }}</li>
          </ul>
        </div>
      </div>
        <div class="row">
          <label>End</label>
          <input type="date" v-model="dateRange.end" required />
        </div>
        <div class="row">
          <label>Report name</label>
          <input v-model="common.reportName" required placeholder="e.g. Oct-2025" />
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
      <h3>Lookup report</h3>
      <form @submit.prevent="onLoadReport">
        <div class="row">
          <label>Report name</label>
          <input v-model="lookupName" required placeholder="e.g. Oct-2025 or Repro-Oct-2025" />
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
import { ref, onMounted } from 'vue'
import { postJson } from '@/utils/api'

const props = defineProps<{ type?: 'weights' | 'reproduction' }>()

const urlType = (() => {
  try {
    const qs = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    const t = qs.get('type')
    return (t === 'weights' || t === 'reproduction') ? t : null
  } catch { return null }
})()

const selectedType = ref<'weights' | 'reproduction'>(props.type ?? urlType ?? 'weights')
const urlName = (() => {
  try {
    const qs = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    const n = qs.get('name')
    return n ? String(n) : ''
  } catch { return '' }
})()
const urlBatch = (() => {
  try {
    const qs = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    const b = qs.get('batch')
    return b ? String(b) : ''
  } catch { return '' }
})()

// Shared state
const dateRange = ref<{ start: string; end: string }>(
  { start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) }
)
const common = ref<{ reportName: string }>({ reportName: '' })
const generating = ref(false)
const reportError = ref<string | null>(null)
const reportResults = ref<string | null>(null)

// Weights form
const wForm = ref<{ animal: string }>({ animal: '' })

// Reproduction form
const rForm = ref<{ target: string }>({ target: '' })

async function onGenerateReport() {
  reportError.value = null
  reportResults.value = null
  if (!dateRange.value.start || !dateRange.value.end || !common.value.reportName) return
  if (selectedType.value === 'weights' && !wForm.value.animal) return
  if (selectedType.value === 'reproduction' && !rForm.value.target) return
  generating.value = true
  try {
    if (selectedType.value === 'weights') {
      const payload = {
        animal: wForm.value.animal.trim(),
        startDateRange: dateRange.value.start,
        endDateRange: dateRange.value.end,
        reportName: common.value.reportName.trim()
      }
      const res = await postJson<typeof payload, any>('/api/GrowthTracking/generateReport', payload)
      let results: string | null = null
      if (res && typeof res === 'object') results = (res.Results ?? res.results ?? res.output ?? res.text ?? null) as any
      reportResults.value = results ?? (typeof res === 'string' ? res : JSON.stringify(res, null, 2))
    } else {
      const payload = {
        target: rForm.value.target.trim(),
        startDateRange: dateRange.value.start,
        endDateRange: dateRange.value.end,
        name: common.value.reportName.trim()
      }
      const res = await postJson<typeof payload, any>('/api/ReproductionTracking/generateReport', payload)
      if (res && typeof res === 'object') {
        const r: any = res
        if (r.error) reportError.value = String(r.error)
        if (Array.isArray(r.results)) { reportResults.value = r.results.join('\n'); return }
      }
      reportResults.value = typeof res === 'string' ? res : JSON.stringify(res, null, 2)
    }
  } catch (e: any) {
    reportError.value = e?.message ?? String(e)
  } finally {
    generating.value = false
  }
}

// Lookup + summary
const lookupName = ref(urlName)
const batchTargets = ref<string[]>(urlBatch ? urlBatch.split(',').map(decodeURIComponent).filter(Boolean) : [])
const batchResults = ref<string[]>([])
const batching = ref(false)
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
  if (!lookupName.value) return
  lookupLoading.value = true
  try {
    if (selectedType.value === 'weights') {
      const payload = { reportName: lookupName.value.trim() }
      const res = await postJson<typeof payload, any>('/api/GrowthTracking/_getReportByName', payload)
      let text: string | null = null
      if (typeof res === 'string') text = res
      else if (res && typeof res === 'object') {
        const r: any = res
        text = r.Results ?? r.results ?? r.report ?? r.text ?? r.content ?? r.data ?? null
        if (text && typeof text !== 'string') text = JSON.stringify(text, null, 2)
      }
      reportText.value = text ?? JSON.stringify(res, null, 2)
    } else {
      const payload = { reportName: lookupName.value.trim() }
      const res = await postJson<typeof payload, any>('/api/ReproductionTracking/_viewReport', payload)
      let text: string | null = null
      if (typeof res === 'string') text = res
      else if (res && typeof res === 'object') {
        const r: any = res
        text = r.Results ?? r.results ?? r.report ?? r.text ?? r.content ?? r.data ?? null
        if (text && typeof text !== 'string') text = JSON.stringify(text, null, 2)
      }
      reportText.value = text ?? JSON.stringify(res, null, 2)
    }
  } catch (e: any) {
    lookupError.value = e?.message ?? String(e)
  } finally {
    lookupLoading.value = false
  }
}

// Auto-load when a report name is provided in the URL
onMounted(() => {
  if (lookupName.value) {
    onLoadReport()
  }
})

async function onGenerateBatch() {
  if (!batchTargets.value.length) return
  batchResults.value = []
  batching.value = true
  try {
    // Use common dateRange and common.reportName as base; append -<id> for uniqueness
    const baseName = (common.value.reportName || '').trim()
    const start = dateRange.value.start
    const end = dateRange.value.end
    if (!start || !end || !baseName) {
      reportError.value = 'Please set Start, End, and Report name before generating.'
      return
    }
    for (const target of batchTargets.value) {
      try {
        if (selectedType.value === 'weights') {
          const payload = { animal: target, startDateRange: start, endDateRange: end, reportName: `${baseName}-${target}` }
          await postJson<typeof payload, any>('/api/GrowthTracking/generateReport', payload)
          batchResults.value.push(`OK weights: ${target}`)
        } else {
          const payload = { target, startDateRange: start, endDateRange: end, name: `${baseName}-${target}` }
          await postJson<typeof payload, any>('/api/ReproductionTracking/generateReport', payload)
          batchResults.value.push(`OK reproduction: ${target}`)
        }
      } catch (e: any) {
        batchResults.value.push(`FAIL ${target}: ${e?.message ?? String(e)}`)
      }
    }
  } finally {
    batching.value = false
  }
}

async function onLoadSummary() {
  summaryError.value = null
  summaryText.value = null
  if (!lookupName.value) return
  summaryLoading.value = true
  try {
    const payload = { reportName: lookupName.value.trim() }
  const url = selectedType.value === 'weights' ? '/api/GrowthTracking/aiSummary' : '/api/ReproductionTracking/_aiSummary'
    const res = await postJson<typeof payload, any>(url, payload)
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
</script>

<style scoped>
.report-box { background: #f9f9f9; border: 1px solid #eee; border-radius: 6px; padding: 0.75rem }
.summary-box { background: #f6faff; border: 1px solid #e0f0ff; border-radius: 6px; padding: 0.75rem }
.results-pre { white-space: pre-wrap }
</style>
