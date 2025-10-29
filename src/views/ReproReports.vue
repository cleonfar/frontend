<template>
  <div class="card root-card">
    <h2>Mothers & Offspring Reports</h2>
    <div class="row">
      <router-link class="button-link" to="/births">Back to Mothers & Offspring</router-link>
      <div v-if="reproNamesError" class="error ml">{{ reproNamesError }}</div>
    </div>

    <div class="row mt">
      <label>Open by name</label>
      <input v-model="lookup.reportName" placeholder="Report name" />
      <button class="ml" @click="onLoadReport" :disabled="lookupLoading || !lookup.reportName">{{ lookupLoading ? 'Loading…' : 'Open' }}</button>
      <button class="ml" @click="onLoadSummary" :disabled="summaryLoading || !lookup.reportName">{{ summaryLoading ? 'Summarizing…' : 'AI summary' }}</button>
      <div v-if="lookupError" class="error ml">{{ lookupError }}</div>
      <div v-if="summaryError" class="error ml">{{ summaryError }}</div>
    </div>

    <table v-if="reproReportNames.length" class="mt">
      <thead>
        <tr><th>Report name</th></tr>
      </thead>
      <tbody>
        <tr v-for="name in reproReportNames" :key="name" class="clickable-row" @click="openName(name)">
          <td>{{ name }}</td>
        </tr>
      </tbody>
    </table>
    <div v-else-if="!reproNamesLoading" class="muted mt">No reports found.</div>

    <div v-if="reportObj" class="report-box mt">
      <h3>Report: {{ reportObj.reportName || lookup.reportName }}</h3>
      <div class="small muted">Generated {{ formatDate(reportObj.dateGenerated) }} by {{ reportObj.ownerId || 'unknown' }}</div>
      <div class="mt" v-if="Array.isArray(reportObj.results) && reportObj.results.length">
        <div v-for="r in reportObj.results" :key="r.motherId || r.target || r.id || JSON.stringify(r)" class="animal-report">
          <h4>
            Target {{ r.motherId || r.target || r.id || r.animalId || 'item' }}
          </h4>
          <!-- If weights appear in a reproduction report, render them nicely too -->
          <template v-if="Array.isArray(r.recordedWeights) && r.recordedWeights.length">
            <table class="mt">
              <thead>
                <tr><th>Date</th><th>Weight (kg)</th></tr>
              </thead>
              <tbody>
                <tr v-for="w in (r.recordedWeights || [])" :key="`${w.date}:${w.weight}`">
                  <td>{{ formatDate(w.date) }}</td>
                  <td>{{ Number(w.weight).toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
            <div v-if="r.averageDailyGain != null" class="small mt">Average daily gain: <strong>{{ formatAdg(r.averageDailyGain) }}</strong> kg/day</div>
          </template>
          <!-- Generic arrays often found in reproduction reports -->
          <template v-if="Array.isArray(r.litters) && r.litters.length">
            <h5 class="mt">Litters</h5>
            <table>
              <thead><tr><th>Birth date</th><th>Notes</th></tr></thead>
              <tbody>
                <tr v-for="l in r.litters" :key="l.litterId || l.id || JSON.stringify(l)">
                  <td>{{ l.birthDate ? formatDate(l.birthDate) : (l.date ? formatDate(l.date) : '-') }}</td>
                  <td>{{ l.notes || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </template>
          <template v-if="Array.isArray(r.offspring) && r.offspring.length">
            <h5 class="mt">Offspring</h5>
            <table>
              <thead><tr><th>External ID</th><th>Sex</th><th>Notes</th></tr></thead>
              <tbody>
                <tr v-for="o in r.offspring" :key="(o.externalId || o.ExternalId || o.offspringId || o.id || JSON.stringify(o))">
                  <td>{{ o.externalId || o.ExternalId || o.offspringId || o.id }}</td>
                  <td>{{ o.sex || '-' }}</td>
                  <td>{{ o.notes || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </template>
          <template v-if="Array.isArray(r.events) && r.events.length">
            <h5 class="mt">Events</h5>
            <table>
              <thead><tr><th>Date</th><th>Type</th><th>Notes</th></tr></thead>
              <tbody>
                <tr v-for="ev in r.events" :key="(ev.date || ev.type || '') + (ev.notes || '')">
                  <td>{{ ev.date ? formatDate(ev.date) : '-' }}</td>
                  <td>{{ ev.type || ev.eventType || '-' }}</td>
                  <td>{{ ev.notes || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </template>
          <!-- Fallback if no known arrays to render -->
          <div v-if="!(Array.isArray(r.recordedWeights) || Array.isArray(r.litters) || Array.isArray(r.offspring) || Array.isArray(r.events))" class="mt">
            <pre class="results-pre small">{{ JSON.stringify(r, null, 2) }}</pre>
          </div>
        </div>
      </div>
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
    <div v-if="summaryText && !aiSummaryObj" class="summary-box mt">
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

const reproReportNames = ref<string[]>([])
const reproNamesLoading = ref(false)
const reproNamesError = ref<string | null>(null)

async function loadReproReportNames() {
  reproNamesLoading.value = true
  reproNamesError.value = null
  try {
    const res = await postJson<any, any>('/api/ReproductionTracking/_listReports', {})
    function tryParseJson(text: any): any {
      if (typeof text !== 'string') return text
      try { return JSON.parse(text) } catch {
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
  lookup.value.reportName = name
  onLoadReport()
}

const lookup = ref<{ reportName: string }>({ reportName: '' })
const lookupLoading = ref(false)
const lookupError = ref<string | null>(null)
const reportText = ref<string | null>(null)
const reportObj = ref<any | null>(null)
const summaryText = ref<string | null>(null)
const summaryLoading = ref(false)
const summaryError = ref<string | null>(null)
function formatAdg(v: any) {
  const n = Number(v)
  return isFinite(n) ? n.toFixed(3) : '-'
}
const aiSummaryObj = computed(() => {
  if (reportObj.value && reportObj.value.aiGeneratedSummary) return normalizeAiSummary(reportObj.value.aiGeneratedSummary)
  if (summaryText.value) return normalizeAiSummary(summaryText.value)
  return null
})

async function onLoadReport() {
  lookupError.value = null
  reportText.value = null
  if (!lookup.value.reportName) return
  lookupLoading.value = true
  try {
    const payload = { reportName: lookup.value.reportName.trim() }
    const res = await postJson<typeof payload, any>('/api/ReproductionTracking/_viewReport', payload)
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
  const res = await postJson<typeof payload, any>('/api/ReproductionTracking/_aiSummary', payload)
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
.report-box { background: #f9f9f9; border: 1px solid #eee; border-radius: 6px; padding: 0.75rem }
.clickable-row { cursor: pointer }
.clickable-row:hover { background: var(--surface-2, #fafafa) }
.ml { margin-left: 0.5rem }
.mt { margin-top: 0.75rem }
.summary-box { background: #f6faff; border: 1px solid #e0f0ff; border-radius: 6px; padding: 0.75rem }
.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem }
</style>
