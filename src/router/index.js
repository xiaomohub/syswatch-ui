import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/store/user'
import { PERM, defaultHomePath } from '@/constants/rbac'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/Login.vue'),
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
        path: 'alert-mgmt',
        component: () => import('../views/alert-mgmt/AlertMgmtLayout.vue'),
        meta: { title: '告警管理' },
        redirect: { name: 'AlertMgmtRules' },
        children: [
          {
            path: 'rule-groups',
            name: 'AlertMgmtRuleGroups',
            component: () => import('../views/alert-mgmt/RuleGroupList.vue'),
            meta: { title: '规则组' }
          },
          {
            path: 'rules',
            name: 'AlertMgmtRules',
            component: () => import('../views/alert-mgmt/RuleList.vue'),
            meta: { title: '告警规则' }
          },
          {
            path: 'rules/create',
            name: 'AlertMgmtRuleCreate',
            component: () => import('../views/alert-mgmt/RuleForm.vue'),
            meta: { title: '新建规则' }
          },
          {
            path: 'rules/import',
            name: 'AlertMgmtRuleImport',
            component: () => import('../views/alert-mgmt/RuleImport.vue'),
            meta: { title: '导入规则' }
          },
          {
            path: 'rules/:ruleGroupId/:ruleId/edit',
            name: 'AlertMgmtRuleEdit',
            component: () => import('../views/alert-mgmt/RuleForm.vue'),
            meta: { title: '编辑规则' }
          },
          {
            path: 'events/current',
            name: 'AlertMgmtEventsCurrent',
            component: () => import('../views/alert-mgmt/EventCurrent.vue'),
            meta: { title: '活跃告警' }
          },
          {
            path: 'events/history',
            name: 'AlertMgmtEventsHistory',
            component: () => import('../views/alert-mgmt/EventHistory.vue'),
            meta: { title: '历史告警' }
          },
          {
            path: 'silences',
            name: 'AlertMgmtSilences',
            component: () => import('../views/alert-mgmt/SilenceList.vue'),
            meta: { title: '静默' }
          },
          {
            path: 'notice',
            name: 'NoticeList',
            component: () => import('../views/notice/NoticeList.vue'),
            meta: { title: '通知对象' }
          },
          {
            path: 'notice/create',
            name: 'NoticeCreate',
            component: () => import('../views/notice/NoticeFormPage.vue'),
            meta: { title: '新建通知对象' }
          },
          {
            path: 'notice/records',
            name: 'NoticeRecords',
            component: () => import('../views/notice/NoticeRecords.vue'),
            meta: { title: '通知记录' }
          },
          {
            path: 'notice/metrics',
            name: 'NoticeMetrics',
            component: () => import('../views/notice/NoticeMetrics.vue'),
            meta: { title: '通知统计' }
          },
          {
            path: 'notice/:uuid/edit',
            name: 'NoticeEdit',
            component: () => import('../views/notice/NoticeFormPage.vue'),
            meta: { title: '编辑通知对象' }
          }
        ]
      },
      {
        path: 'fault-center',
        component: () => import('../views/faultcenter/FaultCenterLayout.vue'),
        redirect: { name: 'FaultCenterList' },
        meta: { title: '故障中心' },
        children: [
          {
            path: '',
            name: 'FaultCenterList',
            component: () => import('../views/faultcenter/FaultCenterList.vue'),
            meta: { title: '故障中心' }
          },
          {
            path: 'create',
            name: 'FaultCenterCreate',
            component: () => import('../views/faultcenter/FaultCenterFormPage.vue'),
            meta: { title: '新建故障中心' }
          },
          {
            path: ':id/edit',
            name: 'FaultCenterEdit',
            component: () => import('../views/faultcenter/FaultCenterFormPage.vue'),
            meta: { title: '编辑故障中心' }
          },
          {
            path: ':id/slo',
            name: 'FaultCenterSlo',
            component: () => import('../views/faultcenter/FaultCenterSloPage.vue'),
            meta: { title: 'SLO 看板' }
          },
          {
            path: 'workbench',
            name: 'FaultCenterWorkbench',
            component: () => import('../views/faultcenter/FaultCenterWorkbenchPage.vue'),
            meta: { title: '工作台' }
          }
        ]
      },
      { path: 'faultcenter', redirect: '/fault-center' },
      { path: 'workbench', redirect: { name: 'FaultCenterWorkbench' } },
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
 * 异步路由 chunk 加载失败（发版、CDN、网络）时给出恢复手段，避免白屏无提示
 */
router.onError((error) => {
  console.error('路由错误:', error)
  const msg = String(error?.message || error || '')
  if (
    /Loading chunk \d+ failed|Failed to fetch dynamically imported module|ChunkLoadError|Importing a module script failed/i.test(
      msg
    )
  ) {
    if (typeof window !== 'undefined' && window.confirm('页面脚本加载失败（可能已发布新版本），是否刷新？')) {
      window.location.reload()
    }
  }
})

export default router