<template>
  <div class="card root-card">
    <h2>Weights Reports</h2>
    <div class="row">
      <router-link class="button-link" to="/weights">Back to Weights</router-link>
      <div v-if="reportNamesError" class="error ml">{{ reportNamesError }}</div>
    </div>

    <div class="row mt">
      <label>Open by name</label>
      <input v-model="lookup.reportName" placeholder="Report name" />
      <button class="ml" @click="onLoadReport" :disabled="lookupLoading || !lookup.reportName">{{ lookupLoading ? 'Loading…' : 'Open' }}</button>
      <button class="ml" @click="onLoadSummary" :disabled="summaryLoading || !lookup.reportName">{{ summaryLoading ? 'Summarizing…' : 'AI summary' }}</button>
      <div v-if="lookupError" class="error ml">{{ lookupError }}</div>
      <div v-if="summaryError" class="error ml">{{ summaryError }}</div>
    </div>

    <table v-if="weightReportNames.length" class="mt">
      <thead>
        <tr><th>Report name</th></tr>
      </thead>
      <tbody>
        <tr v-for="name in weightReportNames" :key="name" class="clickable-row" @click="openName(name)">
          <td>{{ name }}</td>
        </tr>
      </tbody>
    </table>
    <div v-else-if="!reportNamesLoading" class="muted mt">No reports found.</div>

    <div v-if="reportObj" class="report-box mt">
      <h3>Report: {{ reportObj.reportName || lookup.reportName }}</h3>
      <div class="small muted">Generated {{ formatDate(reportObj.dateGenerated) }} by {{ reportObj.ownerId || 'unknown' }}</div>
      <table class="mt" v-if="summaryRows.length">
        <thead>
          <tr>
            <th>Animal ID</th>
            <th>Most recent weight</th>
            <th>Rate of gain (kg/day)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in summaryRows" :key="row.animalId">
            <td>{{ row.animalId }}</td>
            <td>{{ row.recentWeight != null ? row.recentWeight.toFixed(2) + ' kg' : '-' }}</td>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { postJson } from '@/utils/api'
import { formatDateMDY } from '@/utils/format'
import { normalizeAiSummary } from '@/utils/aiSummary'

const formatDate = formatDateMDY

const weightReportNames = ref<string[]>([])
const reportNamesLoading = ref(false)
const reportNamesError = ref<string | null>(null)

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
  lookup.value.reportName = name
  onLoadReport()
}

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
    }
    return { animalId: String(animalId || ''), recentWeight, adg }
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
    if (typeof res === 'string') {
      text = res
      // Try to parse stringified JSON report
      try {
        const parsed = JSON.parse(res)
        const candidate: any = (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && typeof (parsed as any).data === 'object' && !Array.isArray((parsed as any).data)) ? (parsed as any).data : parsed
        if (candidate && (candidate.results || candidate.reportName || candidate.aiGeneratedSummary || candidate.targetAnimals)) {
          reportObj.value = candidate
        }
      } catch {}
    } else if (res && typeof res === 'object') {
      const candidate: any = (res && typeof (res as any).data === 'object' && !Array.isArray((res as any).data)) ? (res as any).data : res
      const r: any = candidate
      text = r.Results ?? r.results ?? r.report ?? r.text ?? r.content ?? r.data ?? null
      if (text && typeof text !== 'string') {
        text = JSON.stringify(text, null, 2)
      }
      if (r && (r.results || r.reportName || r.aiGeneratedSummary || r.targetAnimals)) {
        reportObj.value = r
      } else {
        reportObj.value = null
      }
      // If the server wrapped the real report JSON as a string in Results, try to parse it
      if (!reportObj.value && typeof text === 'string') {
        try {
          const parsed = JSON.parse(text)
          const inner: any = (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && typeof (parsed as any).data === 'object' && !Array.isArray((parsed as any).data)) ? (parsed as any).data : parsed
          if (inner && (inner.results || inner.reportName || inner.aiGeneratedSummary || inner.targetAnimals)) {
            reportObj.value = inner
          }
        } catch {}
      }
    }
    reportText.value = text ?? JSON.stringify(res, null, 2)
  } catch (e: any) {
    lookupError.value = e?.message ?? String(e)
  } finally {
    lookupLoading.value = false
  }
}

// delete handled at list row level; no delete button in report view

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
</script>

<style scoped>
.results-pre { white-space: pre-wrap }
.muted { color: #666 }
.summary-box { background: #f6faff; border: 1px solid #e0f0ff; border-radius: 6px; padding: 0.75rem }
.report-box { background: #f9f9f9; border: 1px solid #eee; border-radius: 6px; padding: 0.75rem }
.clickable-row { cursor: pointer }
.clickable-row:hover { background: var(--surface-2, #fafafa) }
.ml { margin-left: 0.5rem }
.mt { margin-top: 0.75rem }
.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem }
</style>
