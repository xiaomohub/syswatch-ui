import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('../views/index/index.vue'),
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/dashboard/dashboard.vue'),
        meta: { title: '监控面板' }
      },
      {
        path: 'alert',
        name: 'Alert',
        component: () => import('../views/alert/alert.vue'),
        meta: { title: '告警统计' }
      },
      {
        path: 'alertconfig',
        name: 'AlertConfig',
        component: () => import('../views/alertconfig/alertconfig.vue'),
        meta: { title: '告警配置' }
      },
      {
        path: 'alertsilence',
        name: 'AlertSilence',
        component: () => import('../views/alertsilence/AlertSilence.vue'),
        meta: { title: '告警静默' }
      },
      {
        path: 'logquery',
        name: 'logquery',
        component: () => import('../views/logquery/LogQuery.vue'),
        meta: { title: '日志查询' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  
  if (to.meta.requiresAuth !== false && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router