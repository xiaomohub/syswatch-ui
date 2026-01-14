import { createRouter, createWebHistory } from 'vue-router'
import Login from '@/views/Login/Login.vue'
import Dashboard from '@/views/Dashboard/Dashboard.vue'
import { useUserStore } from '@/store/user'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', component: Login },
    {
      path: '/dashboard',
      component: Dashboard,
      meta: { requiresAuth: true }
    }
  ]
})

router.beforeEach((to, from, next) => {
  const user = useUserStore()
  if (to.meta.requiresAuth && !user.token) {
    next('/login')
  } else {
    next()
  }
})

export default router
