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
  <button class="ml" @click="() => onLoadReport()" :disabled="lookupLoading || !lookup.reportName">{{ lookupLoading ? 'Loading…' : 'Open' }}</button>
      <button class="ml" @click="onLoadSummary" :disabled="summaryLoading || !lookup.reportName">{{ summaryLoading ? 'Summarizing…' : 'AI summary' }}</button>
      <div v-if="lookupError" class="error ml">{{ lookupError }}</div>
      <div v-if="summaryError" class="error ml">{{ summaryError }}</div>
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
              <button class="ml" @click.stop="openName(name)">Open standalone</button>
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
                          <th>Rate of gain (kg/day)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="row in summaryRowsFor(reportObjByName[name])" :key="row.animalId">
                          <td>{{ row.animalId }}</td>
                          <td>{{ row.recentWeight != null ? row.recentWeight.toFixed(2) + ' kg' : '-' }}</td>
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
    <div v-else-if="!reportNamesLoading" class="muted mt">
      No reports found.
      <details class="mt small">
        <summary>Show raw last response</summary>
        <div class="small muted">Last URL: {{ diag.lastUrl }}</div>
        <pre class="results-pre">{{ diag.lastResponse || '(empty)' }}</pre>
        <div v-if="diag.lastError" class="error small">Error: {{ diag.lastError }}</div>
      </details>
    </div>

    

    <div v-if="reportObj" class="report-box mt">
      <h3>Report: {{ reportDisplayName }}</h3>
      <div class="small muted">Generated {{ formatDate(reportDisplayDate) }} by {{ reportDisplayOwner || 'unknown' }}</div>
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
import { ref, computed, onMounted, getCurrentInstance } from 'vue'
import { postJson } from '@/utils/api'
import { formatDateMDY } from '@/utils/format'
import { normalizeAiSummary } from '@/utils/aiSummary'
import { diag } from '@/utils/diag'

const formatDate = formatDateMDY
// Async ack handling
const MAX_RETRIES = 8
const BASE_DELAY_MS = 400

// debug panel removed

const weightReportNames = ref<string[]>([])
const weightReportsList = ref<any[]>([])
const reportNamesLoading = ref(false)
const reportNamesError = ref<string | null>(null)
// Inline report rows (expanded details)
const expandedReport = ref<Record<string, boolean>>({})
const loadingReportByName = ref<Record<string, boolean>>({})
const errorReportByName = ref<Record<string, string | null>>({})
const reportObjByName = ref<Record<string, any | null>>({})
const reportTextByName = ref<Record<string, string | null>>({})
const summaryTextByName = ref<Record<string, string | null>>({})
const summaryLoadingByName = ref<Record<string, boolean>>({})
const summaryErrorByName = ref<Record<string, string | null>>({})
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

    // Prefer explicit common shapes before generic walker
    let rawList: any[] | null = null
    const r: any = res
    if (r && typeof r === 'object') {
      // New contract: body itself may be the array of reports
      if (Array.isArray(r.body)) {
        rawList = r.body
      } else if (r.body && typeof r.body === 'object') {
        if (Array.isArray(r.body.reports)) {
          rawList = r.body.reports
        } else if (Array.isArray(r.body.Reports)) {
          rawList = r.body.Reports
        }
      }
      if (!rawList) {
        if (Array.isArray(r.reports)) {
          rawList = r.reports
        } else if (Array.isArray(r.Reports)) {
          rawList = r.Reports
        } else if (Array.isArray((r as any).Body)) {
          rawList = (r as any).Body
        }
      }
    }
    if (!rawList) {
      rawList = extractList(res)
    }

    if ((!rawList || rawList.length === 0) && r && typeof r === 'object' && 'request' in r && attempt < MAX_RETRIES) {
      const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 2000)
      console.warn(`GrowthTracking/_listReports returned only a request id; retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`)
      setTimeout(() => loadWeightReportNames(attempt + 1), delay)
      return
    }

    const list: any[] = Array.isArray(rawList) ? rawList : []
    weightReportsList.value = []
    const used = new Map<string, number>()
    const looksLikeReport = (obj: any) => obj && typeof obj === 'object' && (('results' in obj) || ('Results' in obj) || ('reportName' in obj) || ('ReportName' in obj) || ('aiGeneratedSummary' in obj))
    const norm = (o: any) => {
      const x: any = { ...o }
      if (typeof x.results === 'string') { try { x.results = JSON.parse(x.results) } catch {} }
      if (Array.isArray(x.Results) && !Array.isArray(x.results)) x.results = x.Results
      return x
    }
    const producedNames: string[] = []
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
          weightReportsList.value.push(reportObjByName.value[n])
        }
      }
    })
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
    weightReportNames.value = producedNames.sort((a, b) => collator.compare(a, b))
  } catch (e: any) {
    reportNamesError.value = e?.message ?? String(e)
  }
  reportNamesLoading.value = false
}

function openName(name: string) {
  lookup.value.reportName = name
  onLoadReport()
}

function toggleReport(name: string) {
  expandedReport.value[name] = !expandedReport.value[name]
  if (expandedReport.value[name]) {
    // If we don't already have an object from the list, try to load by name
    if (!reportObjByName.value[name] && !reportTextByName.value[name] && !loadingReportByName.value[name]) {
      loadReportByName(name)
    }
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
      if (typeof node === 'string') { try { const j = JSON.parse(node); return findReport(j, depth + 1) } catch { return null } }
      if (Array.isArray(node)) { for (const el of node) { const f = findReport(el, depth + 1); if (f) return f } return null }
      if (typeof node === 'object') {
        const o = node as any
        const hasResults = 'results' in o || 'Results' in o
        const hasName = 'reportName' in o || 'ReportName' in o || 'name' in o
        const hasAi = 'aiGeneratedSummary' in o || 'summary' in o || 'Summary' in o
        if (hasResults || hasName || hasAi) {
          if (typeof o.results === 'string') { try { o.results = JSON.parse(o.results) } catch {} }
          if (Array.isArray(o.Results) && !Array.isArray(o.results)) o.results = o.Results
          return o
        }
        const keys = ['data','payload','body','result','Result','content','value','report','reports']
        for (const k of keys) { if (k in o) { const f = findReport(o[k], depth + 1); if (f) return f } }
      }
      return null
    }
    if (typeof res === 'string') { text = res; obj = findReport(res) }
    else if (res && typeof res === 'object') {
      const r: any = res
      const tCandidate: any = r.Results ?? r.results ?? r.report ?? r.text ?? r.content ?? r.data ?? null
      text = typeof tCandidate === 'string' ? tCandidate : (tCandidate && typeof tCandidate === 'object' ? JSON.stringify(tCandidate, null, 2) : null)
      obj = findReport(r)
    }
    if (!text) { try { text = JSON.stringify(res, null, 2) } catch { text = String(res) } }
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
function getField(obj: any, ...keys: string[]) {
  if (!obj || typeof obj !== 'object') return undefined
  for (const k of keys) {
    if (k in obj && obj[k] != null) return obj[k]
  }
  return undefined
}
const reportDisplayName = computed(() => {
  const o = reportObj.value
  return (o ? (getField(o, 'reportName','ReportName','name','Name') as any) : null) || lookup.value.reportName
})
const reportDisplayDate = computed(() => {
  const o = reportObj.value
  return o ? (getField(o, 'dateGenerated','DateGenerated','generatedAt','GeneratedAt','createdAt','CreatedAt') as any) : null
})
const reportDisplayOwner = computed(() => {
  const o = reportObj.value
  return o ? (getField(o, 'ownerId','OwnerId','owner','Owner') as any) : null
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

// Auto-redirect to the unified Weights page (Reports tab) and support deep-link open by name
const inst = getCurrentInstance()
const route: any = (inst as any)?.proxy?.$route
const router: any = (inst as any)?.proxy?.$router
onMounted(() => {
  // Prefer the unified Reports tab under the Weights page
  try {
    router?.push({ path: '/weights', query: { tab: 'reports', name: route?.query?.name || '' } })
    return
  } catch {}

  // Fallback: load locally if navigation isn't available
  loadWeightReportNames()
  try {
    const initial = route?.query?.name ? String(route.query.name) : ''
    if (initial) {
      lookup.value.reportName = initial
      onLoadReport()
    }
  } catch {}
})

async function onLoadReport(attempt = 0) {
  lookupError.value = null
  reportText.value = null
  summaryText.value = null
  if (!lookup.value.reportName) return
  if (attempt === 0) lookupLoading.value = true
  try {
    const payload = { reportName: lookup.value.reportName.trim() }
    const res = await postJson<typeof payload, any>('/api/GrowthTracking/_getReportByName', payload)
    let text: string | null = null

    // Robustly locate the report object through nested envelopes, arrays, or stringified fields
    const targetName = lookup.value.reportName.trim()
    const looksLikeReport = (obj: any) => {
      if (!obj || typeof obj !== 'object') return false
      const hasResults = 'results' in obj || 'Results' in obj
      const hasName = 'reportName' in obj || 'ReportName' in obj || 'name' in obj
      const hasAi = 'aiGeneratedSummary' in obj || 'summary' in obj || 'Summary' in obj
      const hasTargets = 'targetAnimals' in obj || 'targets' in obj
      return hasResults || hasName || hasAi || hasTargets
    }
    const normalizeReport = (obj: any) => {
      if (!obj || typeof obj !== 'object') return obj
      // Normalize Results => results, and parse if string
      if (typeof obj.results === 'string') { try { obj.results = JSON.parse(obj.results) } catch {} }
      if (typeof obj.Results === 'string') { try { obj.Results = JSON.parse(obj.Results) } catch {} }
      if (Array.isArray(obj.Results) && !Array.isArray(obj.results)) obj.results = obj.Results
      return obj
    }
    const nameOf = (obj: any) => (obj ? (obj.reportName || obj.ReportName || obj.name || obj.Name) : undefined)
    const findReport = (node: any, depth = 0): any | null => {
      if (!node || depth > 4) return null
      if (typeof node === 'string') {
        try { const j = JSON.parse(node); return findReport(j, depth + 1) } catch { return null }
      }
      if (Array.isArray(node)) {
        // Prefer element matching target name; else first that looks like a report
        let candidate: any = null
        for (const el of node) {
          const found = findReport(el, depth + 1)
          if (found) {
            const n = nameOf(found)
            if (n && targetName && String(n) === targetName) return normalizeReport(found)
            candidate = candidate || found
          }
        }
        return candidate ? normalizeReport(candidate) : null
      }
      if (typeof node === 'object') {
        const obj = node as any
        if (looksLikeReport(obj)) return normalizeReport(obj)
        // If reports array exists, scan it
        if (Array.isArray(obj.reports) || Array.isArray(obj.Reports)) {
          const arr: any[] = (obj.reports || obj.Reports) as any[]
          const byName = arr.find((x: any) => String(nameOf(x) || '') === targetName)
          if (byName && looksLikeReport(byName)) return normalizeReport(byName)
          for (const el of arr) {
            const found = findReport(el, depth + 1)
            if (found) return normalizeReport(found)
          }
        }
        const keys = ['data','payload','body','result','Result','content','value','report','Report']
        for (const k of keys) {
          if (k in obj) {
            const found = findReport(obj[k], depth + 1)
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
      const tCandidate: any = r.Results ?? r.results ?? r.report ?? r.text ?? r.content ?? r.data ?? null
      text = typeof tCandidate === 'string' ? tCandidate : (tCandidate && typeof tCandidate === 'object' ? JSON.stringify(tCandidate, null, 2) : null)
      reportObj.value = findReport(r)
      // Highlight async ack-only responses
      if (!reportObj.value && r.request) {
        if (attempt < MAX_RETRIES) {
          const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 2000)
          console.warn(`GrowthTracking/_getReportByName returned only a request id; retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`)
          setTimeout(() => onLoadReport(attempt + 1), delay)
          return
        } else {
          console.warn('GrowthTracking/_getReportByName gave only request id after max retries.')
        }
      }
    }
    if (!text) {
      try { text = JSON.stringify(res, null, 2) } catch { text = String(res) }
    }
    reportText.value = text
  } catch (e: any) {
    lookupError.value = e?.message ?? String(e)
  }
  lookupLoading.value = false
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
