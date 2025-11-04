<template>
  <div class="root-card">
    <!-- Hero banner -->
    <div class="hero card">
      <div class="hero-content">
        <div>
          <h1>Welcome back</h1>
          <p class="muted">{{ todayStr }}</p>
        </div>
      </div>
    </div>

    <!-- Quick actions -->
    <div class="grid quick">
      <router-link class="qcard card" to="/weights/record">
        <div class="qtitle">Begin weighing</div>
        <div class="qdesc">Go straight to record weights</div>
      </router-link>
      <router-link class="qcard card" to="/births">
        <div class="qtitle">Record births</div>
        <div class="qdesc">Open mothers overview</div>
      </router-link>
      <router-link class="qcard card" to="/animals">
        <div class="qtitle">Animals</div>
        <div class="qdesc">Browse and manage animals</div>
      </router-link>
      <router-link class="qcard card" to="/weights/reports">
        <div class="qtitle">Weight Reports</div>
        <div class="qdesc">View and summarize reports</div>
      </router-link>
      <router-link class="qcard card" to="/births/reports">
        <div class="qtitle">Repro Reports</div>
        <div class="qdesc">Performance and survival</div>
      </router-link>
      <router-link class="qcard card" to="/groups">
        <div class="qtitle">Groups</div>
        <div class="qdesc">Create, merge, and manage</div>
      </router-link>
    </div>

    <!-- Overview stats -->
    <div class="stats grid">
      <div class="stat card">
        <div class="label">Animals</div>
        <div class="value">{{ fmt(animalsCount) }}</div>
        <div v-if="animalsError" class="error small">{{ animalsError }}</div>
      </div>
      <div class="stat card">
        <div class="label">Active groups</div>
        <div class="value">{{ fmt(herdsCount) }}</div>
        <div v-if="herdsError" class="error small">{{ herdsError }}</div>
      </div>
      <div class="stat card">
        <div class="label">Weight reports</div>
        <div class="value">{{ fmt(weightReportCount) }}</div>
        <div v-if="weightsNamesError" class="error small">{{ weightsNamesError }}</div>
      </div>
      <div class="stat card">
        <div class="label">Repro reports</div>
        <div class="value">{{ fmt(reproReportCount) }}</div>
        <div v-if="reproNamesError" class="error small">{{ reproNamesError }}</div>
      </div>
    </div>

    <!-- Recent reports -->
    <div class="grid cols">
      <div class="card">
        <h3>Recent weight reports</h3>
        <div v-if="weightsNamesLoading" class="muted">Loading…</div>
        <ul v-else-if="recentWeightReportNames.length" class="list">
          <li v-for="n in recentWeightReportNames" :key="'w-' + n">
            <router-link :to="{ path: '/weights/reports', query: { name: n } }">{{ n }}</router-link>
          </li>
        </ul>
        <div v-else class="muted">No reports found.</div>
      </div>
      <div class="card">
        <h3>Recent reproduction reports</h3>
        <div v-if="reproNamesLoading" class="muted">Loading…</div>
        <ul v-else-if="recentReproReportNames.length" class="list">
          <li v-for="n in recentReproReportNames" :key="'r-' + n">
            <router-link :to="{ path: '/births/reports', query: { name: n } }">{{ n }}</router-link>
          </li>
        </ul>
        <div v-else class="muted">No reports found.</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { postJson } from '@/utils/api'

const todayStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })

// Stats state
const animalsCount = ref<number | null>(null)
const animalsError = ref<string | null>(null)
const herdsCount = ref<number | null>(null)
const herdsError = ref<string | null>(null)
const weightReportCount = ref<number | null>(null)
const weightsNamesLoading = ref(false)
const weightsNamesError = ref<string | null>(null)
const weightReportNames = ref<string[]>([])
const reproReportCount = ref<number | null>(null)
const reproNamesLoading = ref(false)
const reproNamesError = ref<string | null>(null)
const reproReportNames = ref<string[]>([])

function fmt(n: number | null) {
  return n == null ? '—' : new Intl.NumberFormat().format(n)
}

function normalizeNames(res: any): string[] {
  // Accept array or wrapped arrays; parse JSON strings too
  const seen = new Set<any>()
  function tryParse(x: any): any {
    if (typeof x === 'string') {
      try { return JSON.parse(x) } catch { return x }
    }
    return x
  }
  function walk(node: any, depth = 0): any[] | null {
    if (node == null || depth > 4 || seen.has(node)) return null
    seen.add(node)
    const val = tryParse(node)
    if (Array.isArray(val)) return val
    if (val && typeof val === 'object') {
      const keys = ['names','Names','reports','Reports','reportNames','items','Items','data','Data','list','List','result','Result','results','Results']
      for (const k of keys) {
        if (k in val) {
          const arr = walk((val as any)[k], depth + 1)
          if (Array.isArray(arr)) return arr
        }
      }
      // last resort: any first array value
      for (const v of Object.values(val)) {
        const arr = walk(v, depth + 1)
        if (Array.isArray(arr)) return arr
      }
    }
    return null
  }
  const raw = walk(res) || []
  return raw.map((x: any) => {
    if (typeof x === 'string' || typeof x === 'number') return String(x)
    if (x && typeof x === 'object') return String((x as any).name ?? (x as any).reportName ?? (x as any).id ?? (x as any).Id ?? (x as any)._id ?? '')
    return ''
  }).filter(Boolean)
}

const recentWeightReportNames = computed(() => weightReportNames.value.slice(-5).reverse())
const recentReproReportNames = computed(() => reproReportNames.value.slice(-5).reverse())

async function loadAnimalsCount() {
  animalsError.value = null
  try {
    const res = await postJson<any, any>('/api/AnimalIdentity/_getAllAnimals', {})
    let list: any[] = []
    if (Array.isArray(res)) list = res
    else if (res && typeof res === 'object') {
      if (Array.isArray(res.animals)) list = res.animals
      else if (Array.isArray(res.data)) list = res.data
      else if (Array.isArray(res.items)) list = res.items
    }
    // Count only animals that are not sold or deceased
    const getStatus = (a: any): string => {
      const s = a?.status ?? a?.Status
      if (s != null && String(s).trim().length) return String(s).toLowerCase()
      // Derive from common boolean flags as a fallback
      const sold = a?.sold ?? a?.isSold ?? a?.Sold ?? a?.IsSold
      if (sold === true || String(sold).toLowerCase() === 'true') return 'sold'
      const dead = a?.deceased ?? a?.isDeceased ?? a?.dead ?? a?.isDead ?? a?.Deceased ?? a?.IsDeceased
      if (dead === true || String(dead).toLowerCase() === 'true') return 'deceased'
      return 'active'
    }
    const active = list.filter(a => {
      const st = getStatus(a)
      return st !== 'sold' && st !== 'deceased'
    })
    animalsCount.value = active.length
  } catch (e: any) {
    animalsError.value = e?.message ?? String(e)
    animalsCount.value = null
  }
}

async function loadHerdsCount() {
  herdsError.value = null
  try {
    const res = await postJson<any, any>('/api/HerdGrouping/_listActiveHerds', {})
    let list: any[] = []
    if (Array.isArray(res)) list = res
    else if (res && typeof res === 'object') {
      if (Array.isArray(res.herds)) list = res.herds
      else if (Array.isArray(res.items)) list = res.items
      else if (Array.isArray(res.data)) list = res.data
    }
    // Normalize by name presence
    const names = list.map((h: any) => String(h?.name ?? h?.herdName ?? h?.HerdName ?? h?.id ?? h?.Id ?? '')).filter(Boolean)
    herdsCount.value = names.length
  } catch (e: any) {
    herdsError.value = e?.message ?? String(e)
    herdsCount.value = null
  }
}

async function loadWeightReports() {
  weightsNamesLoading.value = true
  weightsNamesError.value = null
  try {
    const res = await postJson<any, any>('/api/GrowthTracking/_listReports', {})
    const names = normalizeNames(res)
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
    weightReportNames.value = names.sort((a, b) => collator.compare(a, b))
    weightReportCount.value = weightReportNames.value.length
  } catch (e: any) {
    weightsNamesError.value = e?.message ?? String(e)
    weightReportNames.value = []
    weightReportCount.value = null
  } finally {
    weightsNamesLoading.value = false
  }
}

async function loadReproReports() {
  reproNamesLoading.value = true
  reproNamesError.value = null
  try {
    const res = await postJson<any, any>('/api/ReproductionTracking/_listReports', {})
    const names = normalizeNames(res)
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
    reproReportNames.value = names.sort((a, b) => collator.compare(a, b))
    reproReportCount.value = reproReportNames.value.length
  } catch (e: any) {
    reproNamesError.value = e?.message ?? String(e)
    reproReportNames.value = []
    reproReportCount.value = null
  } finally {
    reproNamesLoading.value = false
  }
}

onMounted(() => {
  // Kick off loads in parallel
  loadAnimalsCount()
  loadHerdsCount()
  loadWeightReports()
  loadReproReports()
})
</script>

<style scoped>
.hero {
  padding: 1rem;
  background: linear-gradient(180deg, var(--peach-100), #fff);
}
.hero-content { display: flex; align-items: center; justify-content: center; gap: 0.5rem; flex-wrap: wrap; text-align: center; flex-direction: column }
.btn { display: inline-block; text-decoration: none; border: 1px solid var(--divider); background: var(--surface); color: var(--text); padding: 0.5rem 0.8rem; border-radius: 6px }
.btn.primary { background: var(--primary); border-color: var(--primary); color: #fff }

.grid { display: grid; gap: 0.75rem; margin-top: 1rem }
.grid.quick { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.grid.cols { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.stats { grid-template-columns: repeat(4, minmax(0, 1fr)); }
@media (max-width: 840px) { .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

.qcard { text-decoration: none; color: inherit; transition: transform .08s ease }
.qcard:hover { transform: translateY(-2px) }
.qtitle { font-weight: 600; }
.qdesc { color: var(--text-muted) }

.stat .label { color: var(--text-muted); font-size: 0.9rem }
.stat .value { font-size: 1.75rem; font-weight: 700 }

.list { list-style: none; padding-left: 0; margin: 0.5rem 0 0 0 }
.list li { padding: 0.25rem 0 }
.small { font-size: 0.85rem }
</style>
