<template>
  <div class="home">
    <h2>Welcome</h2>
    <p>Choose an action:</p>
    <ul>
      <li><router-link to="/register">Register an animal</router-link></li>
      <li><router-link to="/animals">View registered animals</router-link></li>
      <li><router-link to="/groups">Manage groups</router-link></li>
    </ul>
  </div>
</template>

<style scoped>
.home { max-width: 700px }
ul { list-style: none; padding: 0 }
li { margin: 0.5rem 0 }
</style>
