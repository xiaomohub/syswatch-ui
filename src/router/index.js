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
        path: 'notify',
        name: 'Notify',
        component: () => import('../views/notify/notify.vue'),
        meta: { title: '通知管理' }
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
    // 需要登录但未登录，跳转到登录页
    next('/login')
  } else if (to.path === '/login' && token) {
    // 已登录访问登录页，跳转到首页
    next('/dashboard')
  } else {
    next()
  }
})

export default router