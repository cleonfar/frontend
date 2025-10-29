import { createRouter, createWebHistory } from 'vue-router'
import { isAuthenticated } from '@/utils/auth'

import RegisterAnimal from '@/views/RegisterAnimal.vue'
import Home from '@/views/Home.vue'
import AnimalsList from '@/views/AnimalsList.vue'
import Animals from '@/views/Animals.vue'
import ManageGroups from '@/views/ManageGroups.vue'
import GrowthTracking from '@/views/GrowthTracking.vue'
import WeightsReports from '@/views/WeightsReports.vue'
// Lazy-load ReproductionTracking to keep initial bundle small
const ReproductionTracking = () => import('@/views/ReproductionTracking.vue')
import ReproReports from '@/views/ReproReports.vue'
const Auth = () => import('@/views/Auth.vue')
const SplitHerd = () => import('@/views/SplitHerd.vue')

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/login', name: 'Login', component: Auth },
  { path: '/register-user', name: 'RegisterUser', component: Auth, props: { mode: 'register' } },
  { path: '/register', name: 'Register', component: RegisterAnimal },
  { path: '/animals', name: 'Animals', component: Animals },
  { path: '/animals/:id', name: 'AnimalDetails', component: () => import('@/views/AnimalDetails.vue') },
  { path: '/register', redirect: { path: '/animals', query: { tab: 'register' } } },
  { path: '/groups', name: 'ManageGroups', component: ManageGroups },
  { path: '/groups/split', name: 'SplitHerd', component: SplitHerd },
  // Category routes (split flows)
  { path: '/weights', name: 'WeightsHome', component: GrowthTracking, props: { initialTab: 'browse' } },
  { path: '/weights/browse', name: 'WeightsBrowse', component: GrowthTracking, props: { initialTab: 'browse' } },
  { path: '/weights/record', name: 'WeightsRecord', component: GrowthTracking, props: { initialTab: 'record' } },
  { path: '/weights/reports', name: 'WeightsReports', component: WeightsReports },
  { path: '/births', name: 'BirthsAndLitters', component: ReproductionTracking, props: { initialTab: 'mothers' } },
  { path: '/births/reports', name: 'ReproReports', component: ReproReports },
  { path: '/mothers/:id', name: 'MotherDetails', component: () => import('@/views/MotherDetails.vue') },
  // Legacy routes kept for compatibility
  { path: '/growth', name: 'GrowthTracking', component: GrowthTracking },
  { path: '/reproduction', name: 'ReproductionTracking', component: ReproductionTracking },
  
  
]

export const router = createRouter({ history: createWebHistory(), routes })

// Basic auth guard: require login for all routes except auth pages
router.beforeEach((to: any, from: any, next: any) => {
  const publicPaths = new Set(['/login', '/register-user'])
  if (publicPaths.has(to.path)) return next()
  if (isAuthenticated.value) return next()
  next({ path: '/login', query: to.fullPath ? { redirect: to.fullPath } : undefined })
})
