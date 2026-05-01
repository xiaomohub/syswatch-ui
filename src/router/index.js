import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/store/user'
import { PERM, defaultHomePath } from '@/constants/rbac'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/login.vue'),
    meta: { requiresAuth: false, title: '登录' }
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
        meta: { title: '监控面板', permission: PERM.MENU_DASHBOARD }
      },
      {
        path: 'alert',
        name: 'Alert',
        component: () => import('../views/alert/alert.vue'),
        meta: { title: '告警统计', permission: PERM.MENU_ALERT }
      },
      {
        path: 'faultcenter',
        name: 'FaultCenter',
        component: () => import('../views/faultcenter/FaultCenter.vue'),
        meta: { title: '故障中心', permission: PERM.MENU_FAULT_CENTER }
      },
      {
        path: 'aiops-rca',
        name: 'AiopsCenter',
        component: () => import('../views/aiops/AiopsCenter.vue'),
        meta: { title: '智能诊断', permission: PERM.MENU_AIOPS_RCA }
      },
      {
        path: 'alertconfig',
        name: 'AlertConfig',
        component: () => import('../views/alertconfig/alertconfig.vue'),
        meta: { title: '告警配置', permission: PERM.MENU_ALERT_CONFIG }
      },
      {
        path: 'alertsilence',
        name: 'AlertSilence',
        component: () => import('../views/alertsilence/AlertSilence.vue'),
        meta: { title: '告警静默', permission: PERM.MENU_ALERT_SILENCE }
      },
      {
        path: 'logquery',
        name: 'LogQuery',
        component: () => import('../views/logquery/LogQuery.vue'),
        meta: { title: '日志查询', permission: PERM.MENU_LOG_QUERY }
      },
      {
        path: 'roleadmin',
        name: 'RoleAdmin',
        component: () => import('../views/admin/RoleAdmin.vue'),
        meta: { title: '角色权限', permission: PERM.ADMIN_ROLE_MANAGE }
      },
      {
        path: 'forbidden',
        name: 'Forbidden',
        component: () => import('../views/Forbidden.vue'),
        meta: { title: '无权限' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

/**
 * 路由守卫 —— 处理身份验证和权限控制
 */
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')

  if (to.meta.requiresAuth !== false && !token) {
    next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
    return
  }

  if (to.path === '/login' && token) {
    const userStore = useUserStore()
    next(defaultHomePath(userStore.hasPermission))
    return
  }

  const perm = to.matched.find((r) => r.meta.permission)?.meta.permission
  if (token && perm) {
    const userStore = useUserStore()
    if (!userStore.hasPermission(perm)) {
      next({ name: 'Forbidden', replace: true })
      return
    }
  }

  next()
})

/**
 * 路由完成后 —— 更新页面标题
 */
router.afterEach((to) => {
  const title = to.meta.title || '系统'
  document.title = `${title} · SysWatch`
})

/**
 * 错误处理
 */
router.onError((error) => {
  console.error('路由错误:', error)
})

export default router