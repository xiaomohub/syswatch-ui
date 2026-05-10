import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/store/user'
import {
  defaultHomePath,
  FEATURE_ALERT_STATISTICS,
  requiredAccessRankFromMatched
} from '@/constants/rbac'

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
    redirect: '/login',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/dashboard/dashboard.vue'),
        meta: { title: '监控面板', access: 'user' }
      },
      {
        path: 'alert',
        name: 'Alert',
        component: () => import('../views/alert/alert.vue'),
        meta: { title: '告警统计', access: 'admin' },
        beforeEnter(to, from, next) {
          if (!FEATURE_ALERT_STATISTICS) {
            next({ path: defaultHomePath(), replace: true })
            return
          }
          next()
        }
      },
      {
        path: 'noticeObjects',
        name: 'NoticeObjects',
        component: () => import('../views/notice-objects/NoticeObjectsPage.vue'),
        meta: { title: '通知对象', access: 'admin' }
      },
      {
        path: 'noticeTemplate',
        name: 'NoticeTemplate',
        component: () => import('../views/notice-template/NoticeTemplateListPage.vue'),
        meta: { title: '通知模版', access: 'admin' }
      },
      {
        path: 'datasource',
        name: 'Datasource',
        component: () => import('../views/datasources/DatasourcesPage.vue'),
        meta: { title: '数据源', access: 'admin' }
      },
      {
        path: 'alert-mgmt',
        component: () => import('../views/alert-mgmt/AlertMgmtLayout.vue'),
        meta: { title: '告警规则', access: 'admin' },
        redirect: { name: 'AlertMgmtRules' },
        children: [
          {
            path: 'rule-groups',
            redirect: { name: 'AlertMgmtRules' }
          },
          {
            path: 'rules',
            name: 'AlertMgmtRules',
            component: () => import('../views/alert-mgmt/RuleList.vue'),
            meta: { title: '告警规则' }
          },
          {
            path: 'alert-templates',
            name: 'AlertMgmtAlertTemplates',
            component: () => import('../views/alert-mgmt/AlertTemplateList.vue'),
            meta: { title: '告警模板' }
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
        meta: { title: '故障中心', access: 'admin' },
        children: [
          {
            path: '',
            name: 'FaultCenterList',
            component: () => import('../views/faultcenter/FaultCenterList.vue'),
            meta: { title: '故障中心' }
          },
          {
            path: 'create',
            redirect: { name: 'FaultCenterList', query: { openCreate: '1' } }
          },
          {
            path: 'detail/:id',
            name: 'FaultCenterDetail',
            component: () => import('../views/faultcenter/FaultCenterDetailPage.vue'),
            meta: { title: '故障中心详情' }
          }
        ]
      },
      {
        path: 'dutyManage',
        component: () => import('../views/duty/DutyCenterLayout.vue'),
        redirect: { name: 'DutyManageList' },
        meta: { title: '值班中心', access: 'admin' },
        children: [
          {
            path: '',
            name: 'DutyManageList',
            component: () => import('../views/duty/DutyManageList.vue'),
            meta: { title: '值班中心' }
          },
          {
            path: ':id/calendar',
            name: 'DutyCalendar',
            component: () => import('../views/duty/DutyCalendarPage.vue'),
            meta: { title: '详情' }
          }
        ]
      },
      { path: 'faultcenter', redirect: '/fault-center', meta: { access: 'admin' } },
      { path: 'faultCenter', redirect: '/fault-center', meta: { access: 'admin' } },
      {
        path: 'faultCenter/detail/:id',
        meta: { access: 'admin' },
        redirect: (to) => ({
          path: `/fault-center/detail/${encodeURIComponent(String(to.params.id))}`,
          query: to.query
        })
      },
      { path: 'workbench', redirect: { name: 'FaultCenterList' }, meta: { access: 'admin' } },
      {
        path: 'aiops-rca',
        name: 'AiopsCenter',
        component: () => import('../views/aiops/AiopsCenter.vue'),
        meta: { title: '智能诊断', access: 'admin' }
      },
      {
        path: 'alertconfig',
        redirect: '/alert-mgmt/rules',
        meta: { access: 'admin' }
      },
      {
        path: 'alertsilence',
        redirect: '/fault-center',
        meta: { access: 'admin' }
      },
      {
        path: 'roleadmin',
        component: () => import('../views/admin/PersonnelLayout.vue'),
        meta: { title: '人员管理', access: 'root' },
        redirect: '/roleadmin/users',
        children: [
          {
            path: 'users',
            name: 'PersonnelUsers',
            component: () => import('../views/admin/UserAdminList.vue'),
            meta: { title: '用户列表' }
          },
          {
            path: 'roles',
            name: 'PersonnelRoles',
            component: () => import('../views/admin/RoleAdmin.vue'),
            meta: { title: '角色与权限' }
          }
        ]
      },
      {
        path: 'forbidden',
        name: 'Forbidden',
        component: () => import('../views/Forbidden.vue'),
        meta: { title: '无权限', access: 'user' }
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
  const raw = localStorage.getItem('token')
  const token = raw != null && String(raw).trim() !== '' ? String(raw).trim() : ''

  if (to.meta.requiresAuth !== false && !token) {
    next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
    return
  }

  if (to.path === '/login' && token) {
    next(defaultHomePath())
    return
  }

  if (token) {
    const userStore = useUserStore()
    const required = requiredAccessRankFromMatched(to.matched)
    if (userStore.accessLevel < required) {
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