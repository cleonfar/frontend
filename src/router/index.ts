import { createRouter, createWebHistory } from 'vue-router'

import RegisterAnimal from '@/views/RegisterAnimal.vue'
import Home from '@/views/Home.vue'
import AnimalsList from '@/views/AnimalsList.vue'
import ManageGroups from '@/views/ManageGroups.vue'
import GrowthTracking from '@/views/GrowthTracking.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/register', name: 'Register', component: RegisterAnimal },
  { path: '/animals', name: 'Animals', component: AnimalsList },
  { path: '/animals/:id', name: 'AnimalDetails', component: () => import('@/views/AnimalDetails.vue') },
  { path: '/groups', name: 'ManageGroups', component: ManageGroups },
  { path: '/growth', name: 'GrowthTracking', component: GrowthTracking },
  
]

export const router = createRouter({ history: createWebHistory(), routes })
