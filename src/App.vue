<template>
  <div id="app">
    <AppHeader />
    <router-view />
  </div>
</template>

<script setup lang="ts">
import AppHeader from './components/AppHeader.vue'
</script>

<style>
body { font-family: system-ui, Arial, sans-serif; }
#app { padding: 2rem; }
</style>
