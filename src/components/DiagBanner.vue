<template>
  <div class="diag">
    <div class="row"><strong>Last URL:</strong> <span>{{ diag.lastUrl || '-' }}</span></div>
    <div v-if="diag.lastResponse"><strong>Last Response:</strong> <pre>{{ diag.lastResponse }}</pre></div>
    <div v-if="diag.lastError" class="error"><strong>Last Error:</strong> {{ diag.lastError }}</div>

    <div class="divider"></div>
    <div><strong>Recent calls</strong></div>
    <ul class="history">
      <li v-for="(h, i) in recent" :key="h.ts + ':' + i">
        <div class="h-row">
          <span class="method" :class="(h.method || 'GET').toLowerCase()">{{ h.method || 'GET' }}</span>
          <span class="url">{{ h.url }}</span>
          <span class="ts">{{ formatTs(h.ts) }}</span>
        </div>
        <div v-if="h.response" class="resp"><pre>{{ h.response }}</pre></div>
        <div v-if="h.error" class="error">Error: {{ h.error }}</div>
      </li>
    </ul>
  </div>
  
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { diag } from '@/utils/diag'

const recent = computed(() => (diag.history || []).slice(-5).reverse())
function formatTs(ts: number) {
  try { return new Date(ts).toLocaleTimeString() } catch { return '' }
}
</script>

<style scoped>
.diag { margin: 0 0 1rem 0; padding: 0.6rem; border: 1px dashed #666; background: #f9f9f9 }
.row { display: flex; gap: 0.5rem; align-items: baseline }
.divider { border-top: 1px dashed #ccc; margin: 0.5rem 0 }
.history { list-style: none; padding-left: 0; margin: 0.25rem 0 0 0 }
.h-row { display: flex; gap: 0.5rem; align-items: baseline; flex-wrap: wrap }
.method { font-weight: 600; font-size: 0.85rem; padding: 0 0.35rem; border-radius: 4px; background: #eee }
.method.get { background: #e8f5e9 }
.method.post { background: #e3f2fd }
.url { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
.ts { color: #666; font-size: 0.8rem }
.resp pre { white-space: pre-wrap; word-break: break-word; max-height: 9rem; overflow: auto; background: #fff; border: 1px solid #eee; padding: 0.25rem; border-radius: 4px }
.error { color: red }
</style>
