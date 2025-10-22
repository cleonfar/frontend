<template>
  <div class="card">
    <h2>Reproduction Tracking</h2>

    <section>
      <h3>Add mother</h3>
      <form @submit.prevent="onAddMother">
        <div class="row">
          <label>Mother ID</label>
          <input v-model="addMotherForm.motherId" required placeholder="e.g. M-0001" />
          <button :disabled="addingMother">{{ addingMother ? 'Adding…' : 'Add mother' }}</button>
        </div>
        <div v-if="addMotherError" class="error">{{ addMotherError }}</div>
        <div v-if="addMotherOk" class="ok">Added.</div>
      </form>
    </section>

    <section>
      <h3>Mothers</h3>
      <div class="row">
        <button @click="loadMothers" :disabled="mothersLoading">{{ mothersLoading ? 'Loading…' : 'Load mothers' }}</button>
        <div v-if="mothersError" class="error">{{ mothersError }}</div>
      </div>
      <table v-if="mothers.length">
        <thead>
          <tr>
            <th>Mother ID</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="mid in mothers" :key="mid">
            <tr>
              <td>{{ mid }}</td>
              <td><button @click="toggleMother(mid)">{{ expanded[mid] ? 'Hide offspring' : 'View offspring' }}</button></td>
            </tr>
            <tr v-if="expanded[mid]">
              <td colspan="2">
                <div class="offspring-box">
                  <strong>Offspring</strong>
                  <div v-if="offspringLoading[mid]" class="muted">Loading…</div>
                  <div v-else-if="offspringError[mid]" class="error">{{ offspringError[mid] }}</div>
                  <div v-else>
                    <ul v-if="offspringByMother[mid] && offspringByMother[mid].length" class="offspring-list">
                      <li v-for="o in offspringByMother[mid]" :key="o.offspringId" class="offspring-item">
                        <span><strong>{{ o.offspringId }}</strong> — {{ o.sex || 'unknown' }}</span>
                        <span v-if="o.notes" class="muted"> ({{ o.notes }})</span>
                        <button class="ml" @click="startEditOffspring(mid, o)">Edit</button>
                      </li>
                    </ul>
                    <div v-else><em>No offspring</em></div>
                  </div>

                  <div class="mt">
                    <details>
                      <summary>Add offspring</summary>
                      <form @submit.prevent="onAddOffspring(mid)">
                        <div class="row">
                          <label>Litter ID</label>
                          <input v-model="addForm[mid].litterId" required placeholder="e.g. LIT-2025-01" />
                        </div>
                        <div class="row">
                          <label>Offspring ID</label>
                          <input v-model="addForm[mid].offspringId" required placeholder="e.g. OFF-0001" />
                        </div>
                        <div class="row">
                          <label>Sex</label>
                          <select v-model="addForm[mid].sex" required>
                            <option value="male">male</option>
                            <option value="female">female</option>
                            <option value="neutered">neutered</option>
                          </select>
                        </div>
                        <div class="row">
                          <label>Notes</label>
                          <input v-model="addForm[mid].notes" placeholder="optional" />
                        </div>
                        <button :disabled="adding[mid]">{{ adding[mid] ? 'Adding…' : 'Add offspring' }}</button>
                        <div v-if="addError[mid]" class="error">{{ addError[mid] }}</div>
                        <div v-if="addOk[mid]" class="ok">Added.</div>
                      </form>
                    </details>
                  </div>

                  <div v-if="editing[mid]" class="mt">
                    <details open>
                      <summary>Edit offspring</summary>
                      <form @submit.prevent="onEditOffspring(mid)">
                        <div class="row">
                          <label>Offspring ID</label>
                          <input v-model="editForm[mid].offspringId" required />
                        </div>
                        <div class="row">
                          <label>Litter ID</label>
                          <input v-model="editForm[mid].litterId" placeholder="optional" />
                        </div>
                        <div class="row">
                          <label>Sex</label>
                          <select v-model="editForm[mid].sex">
                            <option value="male">male</option>
                            <option value="female">female</option>
                            <option value="neutered">neutered</option>
                          </select>
                        </div>
                        <div class="row">
                          <label>Notes</label>
                          <input v-model="editForm[mid].notes" placeholder="optional" />
                        </div>
                        <button :disabled="saving[mid]">{{ saving[mid] ? 'Saving…' : 'Save changes' }}</button>
                        <button type="button" class="ml" @click="cancelEdit(mid)">Cancel</button>
                        <div v-if="saveError[mid]" class="error">{{ saveError[mid] }}</div>
                        <div v-if="saveOk[mid]" class="ok">Saved.</div>
                      </form>
                    </details>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <div v-else-if="!mothersLoading">No mothers found.</div>
    </section>

    <section class="mt">
      <h3>Generate reproduction report</h3>
      <form @submit.prevent="onGenerateReport">
        <div class="row">
          <label>Mother ID</label>
          <input v-model="reportForm.animal" required placeholder="e.g. M-0001" />
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
          <input v-model="reportForm.reportName" required placeholder="e.g. Repro-Oct-2025" />
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
          <input v-model="lookup.reportName" required placeholder="e.g. Repro-Oct-2025" />
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

type Offspring = { offspringId: string; sex?: string; notes?: string; litterId?: string }

// Add mother state
const addMotherForm = ref<{ motherId: string }>({ motherId: '' })
const addingMother = ref(false)
const addMotherError = ref<string | null>(null)
const addMotherOk = ref(false)

async function onAddMother() {
  addMotherError.value = null
  addMotherOk.value = false
  if (!addMotherForm.value.motherId) return
  addingMother.value = true
  try {
    const payload = { motherId: addMotherForm.value.motherId.trim() }
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

// Mothers listing and offspring expand
const mothers = ref<string[]>([])
const mothersLoading = ref(false)
const mothersError = ref<string | null>(null)
const expanded = ref<Record<string, boolean>>({})
const offspringByMother = ref<Record<string, Offspring[]>>({})
const offspringLoading = ref<Record<string, boolean>>({})
const offspringError = ref<Record<string, string | undefined>>({})

// Add offspring per-mother state
const addForm = ref<Record<string, { litterId: string; offspringId: string; sex: string; notes?: string }>>({})
const adding = ref<Record<string, boolean>>({})
const addError = ref<Record<string, string | undefined>>({})
const addOk = ref<Record<string, boolean>>({})

// Edit offspring per-mother state
const editing = ref<Record<string, boolean>>({})
const editForm = ref<Record<string, { offspringId: string; litterId?: string; sex?: string; notes?: string }>>({})
const saving = ref<Record<string, boolean>>({})
const saveError = ref<Record<string, string | undefined>>({})
const saveOk = ref<Record<string, boolean>>({})

async function loadMothers() {
  mothersLoading.value = true
  mothersError.value = null
  try {
    const res = await postJson<any, any>('/api/ReproductionTracking/_listMothers', {})
    let list: any = []
    if (Array.isArray(res)) list = res
    else if (res && typeof res === 'object') {
      if (Array.isArray((res as any).mothers)) list = (res as any).mothers
      else if (Array.isArray((res as any).items)) list = (res as any).items
      else if (Array.isArray((res as any).data)) list = (res as any).data
    }
    mothers.value = (list as any[]).map(x => String(x)).filter(Boolean)
  } catch (e: any) {
    mothersError.value = e?.message ?? String(e)
  } finally {
    mothersLoading.value = false
  }
}

function toggleMother(motherId: string) {
  expanded.value[motherId] = !expanded.value[motherId]
  if (expanded.value[motherId] && !offspringByMother.value[motherId] && !offspringLoading.value[motherId]) {
    loadOffspring(motherId)
  }
  // ensure forms exist
  if (!addForm.value[motherId]) addForm.value[motherId] = { litterId: '', offspringId: '', sex: 'female', notes: '' }
  if (!editForm.value[motherId]) editForm.value[motherId] = { offspringId: '', litterId: '', sex: undefined, notes: '' }
}

async function loadOffspring(motherId: string) {
  offspringLoading.value[motherId] = true
  offspringError.value[motherId] = undefined
  try {
    const payload = { motherId }
    const res = await postJson<typeof payload, any>('/api/ReproductionTracking/_getOffspringForMother', payload)
    let list: any = []
    if (Array.isArray(res)) list = res
    else if (res && typeof res === 'object') {
      if (Array.isArray((res as any).offspring)) list = (res as any).offspring
      else if (Array.isArray((res as any).items)) list = (res as any).items
      else if (Array.isArray((res as any).data)) list = (res as any).data
    }
    const norm = (list as any[]).map(o => ({
      offspringId: String(o.offspringId ?? o.id ?? o.OffspringId ?? ''),
      sex: o.sex ?? o.Sex,
      notes: o.notes ?? o.Notes,
      litterId: o.litterId ?? o.LitterId
    })).filter((o: Offspring) => !!o.offspringId)
    offspringByMother.value[motherId] = norm
  } catch (e: any) {
    offspringError.value[motherId] = e?.message ?? String(e)
  } finally {
    offspringLoading.value[motherId] = false
  }
}

async function onAddOffspring(motherId: string) {
  addError.value[motherId] = undefined
  addOk.value[motherId] = false
  adding.value[motherId] = true
  try {
    const form = addForm.value[motherId]
    const payload = {
      litterId: form.litterId.trim(),
      offspringId: form.offspringId.trim(),
      sex: form.sex,
      notes: (form.notes || '').trim() || undefined,
      // include motherId to help servers that accept it
      motherId
    }
    await postJson<typeof payload, any>('/api/ReproductionTracking/recordOffspring', payload)
    addOk.value[motherId] = true
    // refresh offspring list
    offspringByMother.value[motherId] = []
    await loadOffspring(motherId)
    // clear minimal fields for another add
    addForm.value[motherId].offspringId = ''
  } catch (e: any) {
    addError.value[motherId] = e?.message ?? String(e)
  } finally {
    adding.value[motherId] = false
  }
}

function startEditOffspring(motherId: string, o: Offspring) {
  editing.value[motherId] = true
  editForm.value[motherId] = { offspringId: o.offspringId, litterId: o.litterId, sex: o.sex, notes: o.notes }
}

function cancelEdit(motherId: string) {
  editing.value[motherId] = false
  saveError.value[motherId] = undefined
  saveOk.value[motherId] = false
}

async function onEditOffspring(motherId: string) {
  saveError.value[motherId] = undefined
  saveOk.value[motherId] = false
  saving.value[motherId] = true
  try {
    const form = editForm.value[motherId]
    const payload: any = {
      offspringId: form.offspringId.trim(),
      sex: form.sex,
      notes: (form.notes || '').trim() || undefined
    }
    if (form.litterId) payload.litterId = form.litterId.trim()
    await postJson<typeof payload, any>('/api/ReproductionTracking/updateOffspring', payload)
    saveOk.value[motherId] = true
    // refresh offspring list
    offspringByMother.value[motherId] = []
    await loadOffspring(motherId)
    editing.value[motherId] = false
  } catch (e: any) {
    saveError.value[motherId] = e?.message ?? String(e)
  } finally {
    saving.value[motherId] = false
  }
}

// Generate report
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
    const res = await postJson<typeof payload, any>('/api/ReproductionTracking/generateReport', payload)
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

// Lookup report + AI summary
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
    const res = await postJson<typeof payload, any>('/api/ReproductionTracking/_getReportByName', payload)
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
    const res = await postJson<typeof payload, any>('/api/ReproductionTracking/aiSummary', payload)
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
.offspring-box { background: #fafafa; border: 1px solid #eee; border-radius: 6px; padding: 0.75rem }
.offpsring-list { list-style: none; padding: 0 }
.offspring-item { display: flex; align-items: center; gap: 0.5rem }
.ml { margin-left: 0.5rem }
.summary-box { background: #f6faff; border: 1px solid #e0f0ff; border-radius: 6px; padding: 0.75rem }
.report-box { background: #f9f9f9; border: 1px solid #eee; border-radius: 6px; padding: 0.75rem }
</style>
