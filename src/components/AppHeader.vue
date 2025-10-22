<template>
  <header class="header">
    <nav>
      <router-link to="/">Home</router-link>
      <router-link to="/register">Register Animal</router-link>
      <router-link to="/animals">View Animals</router-link>
      <router-link to="/groups">Manage Groups</router-link>
  <router-link to="/growth">Growth Tracking</router-link>
    </nav>
  </header>
</template>

<style scoped>
.header { padding: 0.5rem 0; margin-bottom: 1rem }
.header a { margin-right: 1rem }
</style>
