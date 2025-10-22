<template>
  <div class="diag">
    <div><strong>Last URL:</strong> {{ diag.lastUrl || '-' }}</div>
    <div v-if="diag.lastResponse"><strong>Last Response:</strong> <pre>{{ diag.lastResponse }}</pre></div>
    <div v-if="diag.lastError" class="error"><strong>Last Error:</strong> {{ diag.lastError }}</div>
  </div>
</template>

<script setup lang="ts">
import { diag } from '@/utils/diag'
</script>

<style scoped>
.diag { margin: 0 0 1rem 0; padding: 0.6rem; border: 1px dashed #666; background: #f9f9f9 }
.error { color: red }
pre { white-space: pre-wrap; word-break: break-word }
</style>
