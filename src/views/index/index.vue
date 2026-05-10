<template>
  <div class="app-container">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="logo-section">
        <div class="logo">
          <div class="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div class="logo-text">SysWatch</div>
            <div class="logo-subtitle">智能观测平台</div>
          </div>
        </div>
      </div>

      <nav class="nav-section" aria-label="功能导航">
        <router-link to="/dashboard" class="nav-item" active-class="active">
          <span class="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
          </span>
          <span class="nav-text">监控面板</span>
        </router-link>

        <router-link
          v-if="FEATURE_ALERT_STATISTICS && isOps"
          to="/alert"
          class="nav-item"
          active-class="active"
        >
          <span class="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </span>
          <span class="nav-text">告警统计</span>
        </router-link>

        <router-link v-if="isOps" to="/datasource" class="nav-item" active-class="active">
          <span class="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
              <path d="M22 12A10 10 0 0 0 12 2v10z"/>
            </svg>
          </span>
          <span class="nav-text">数据源</span>
        </router-link>

        <div v-if="isOps" class="nav-collapse" aria-label="告警管理">
          <button
            type="button"
            class="nav-collapse-trigger"
            :class="{ 'is-active-parent': isAlertMgmtSection }"
            :aria-expanded="alertNavExpanded"
            @click="alertNavExpanded = !alertNavExpanded"
          >
            <span class="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M12 8v4M12 16h.01"/>
              </svg>
            </span>
            <span class="nav-text">告警管理</span>
            <span class="nav-collapse-chevron" :class="{ expanded: alertNavExpanded }" aria-hidden="true">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            </span>
          </button>
          <Transition name="nav-collapse-h">
            <div v-show="alertNavExpanded" class="nav-collapse-body">
              <router-link
                to="/alert-mgmt/rules"
                class="nav-item nav-item-child"
                :class="{ active: isAlertRulesNavRoute }"
              >
                <span class="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>
                  </svg>
                </span>
                <span class="nav-text">告警规则</span>
              </router-link>
            </div>
          </Transition>
        </div>

        <router-link
          v-if="isOps"
          to="/fault-center"
          class="nav-item"
          :class="{ active: route.path.startsWith('/fault-center') }"
        >
          <span class="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2a10 10 0 1 0 10 10"/>
              <path d="M12 8v5"/>
              <path d="M12 16h.01"/>
              <path d="M22 12a10 10 0 0 0-10-10"/>
            </svg>
          </span>
          <span class="nav-text">故障中心</span>
        </router-link>

        <div v-if="canNoticeObjects" class="nav-collapse" aria-label="通知管理">
          <button
            type="button"
            class="nav-collapse-trigger"
            :class="{ 'is-active-parent': isNoticeMgmtRoute }"
            :aria-expanded="noticeNavExpanded"
            @click="noticeNavExpanded = !noticeNavExpanded"
          >
            <span class="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </span>
            <span class="nav-text">通知管理</span>
            <span class="nav-collapse-chevron" :class="{ expanded: noticeNavExpanded }" aria-hidden="true">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            </span>
          </button>
          <Transition name="nav-collapse-h">
            <div v-show="noticeNavExpanded" class="nav-collapse-body">
              <router-link
                to="/noticeObjects"
                class="nav-item nav-item-child"
                active-class="active"
              >
                <span class="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                </span>
                <span class="nav-text">通知对象</span>
              </router-link>
              <router-link
                to="/noticeTemplate"
                class="nav-item nav-item-child"
                active-class="active"
              >
                <span class="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
                  </svg>
                </span>
                <span class="nav-text">通知模版</span>
              </router-link>
            </div>
          </Transition>
        </div>

        <router-link
          v-if="isOps"
          to="/dutyManage"
          class="nav-item"
          :class="{ active: route.path.startsWith('/dutyManage') }"
        >
          <span class="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </span>
          <span class="nav-text">值班中心</span>
        </router-link>

        <div v-if="isOps" class="nav-collapse" aria-label="分析诊断">
          <button
            type="button"
            class="nav-collapse-trigger"
            :class="{ 'is-active-parent': isAnalysisDiagSection }"
            :aria-expanded="analysisDiagNavExpanded"
            @click="analysisDiagNavExpanded = !analysisDiagNavExpanded"
          >
            <span class="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a4 4 0 0 1 4 4c0 2.5-1.5 4.5-3 6l-1 1-1-1c-1.5-1.5-3-3.5-3-6a4 4 0 0 1 4-4z"/>
                <path d="M9 18h6M10 22h4"/>
                <path d="M8 14h8"/>
              </svg>
            </span>
            <span class="nav-text">分析诊断</span>
            <span class="nav-collapse-chevron" :class="{ expanded: analysisDiagNavExpanded }" aria-hidden="true">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            </span>
          </button>
          <Transition name="nav-collapse-h">
            <div v-show="analysisDiagNavExpanded" class="nav-collapse-body">
              <router-link
                to="/aiops-rca"
                class="nav-item nav-item-child"
                active-class="active"
              >
                <span class="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4M12 8h.01"/>
                  </svg>
                </span>
                <span class="nav-text">智能诊断</span>
              </router-link>
            </div>
          </Transition>
        </div>

        <div v-if="isRoot" class="nav-collapse" aria-label="人员管理">
          <button
            type="button"
            class="nav-collapse-trigger"
            :class="{ 'is-active-parent': isPersonnelMgmtRoute }"
            :aria-expanded="personnelNavExpanded"
            @click="personnelNavExpanded = !personnelNavExpanded"
          >
            <span class="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </span>
            <span class="nav-text">人员管理</span>
            <span class="nav-collapse-chevron" :class="{ expanded: personnelNavExpanded }" aria-hidden="true">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            </span>
          </button>
          <Transition name="nav-collapse-h">
            <div v-show="personnelNavExpanded" class="nav-collapse-body">
              <router-link to="/roleadmin/users" class="nav-item nav-item-child" active-class="active">
                <span class="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
                <span class="nav-text">用户列表</span>
              </router-link>
              <router-link to="/roleadmin/roles" class="nav-item nav-item-child" active-class="active">
                <span class="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <path d="M12 8v4M12 16h.01"/>
                  </svg>
                </span>
                <span class="nav-text">角色与权限</span>
              </router-link>
            </div>
          </Transition>
        </div>
      </nav>

      <footer class="sidebar-footer" aria-label="页面标题与用户">
        <h1 class="page-title sidebar-footer-title">{{ pageTitle }}</h1>
        <div class="sidebar-footer-col">
          <div class="header-user sidebar-footer-user" role="group" aria-label="当前用户">
            <router-link
              v-if="isRoot"
              to="/roleadmin/users"
              class="user-avatar user-avatar-link"
              active-class="user-avatar-active"
              title="用户列表"
            >
              {{ userInitials }}
            </router-link>
            <div v-else class="user-avatar" aria-hidden="true">{{ userInitials }}</div>
            <div class="user-meta">
              <div class="user-name">{{ userName }}</div>
              <div class="user-role">{{ userRole }}</div>
            </div>
            <button type="button" class="logout-btn" @click="showLogoutModal = true" title="退出登录">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </footer>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <div class="page-content">
        <ViewErrorBoundary>
          <router-view />
        </ViewErrorBoundary>
      </div>
    </main>

    <!-- Logout Modal -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="showLogoutModal" @click.self="showLogoutModal = false">
        <div class="modal">
          <div class="modal-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </div>
          <h3 class="modal-title">确认退出</h3>
          <p class="modal-text">您确定要退出登录吗？退出后需要重新输入账号密码才能访问系统。</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showLogoutModal = false">取消</button>
            <button class="btn btn-danger" @click="handleLogout">确认退出</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { FEATURE_ALERT_STATISTICS, ACCESS_LEVEL } from '@/constants/rbac'
import ViewErrorBoundary from '@/components/ViewErrorBoundary.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const showLogoutModal = ref(false)

const userName = computed(
  () => userStore.profile.displayName || userStore.profile.username || '用户'
)
const userRole = computed(() => userStore.roleLabel)
const userInitials = computed(() => userName.value.slice(0, 2).toUpperCase())
/** 运维档：admin + root，可见除人员管理外的功能菜单 */
const isOps = computed(() => userStore.accessLevel >= ACCESS_LEVEL.ADMIN)
/** 平台管理：仅 root，人员与角色 */
const isRoot = computed(() => userStore.accessLevel >= ACCESS_LEVEL.ROOT)

const canNoticeObjects = computed(() => isOps.value)

const isNoticeMgmtRoute = computed(
  () =>
    route.path === '/noticeObjects' ||
    route.path.startsWith('/noticeObjects/') ||
    route.path === '/noticeTemplate' ||
    route.path.startsWith('/noticeTemplate/')
)
const noticeNavExpanded = ref(false)

watch(
  isNoticeMgmtRoute,
  (on) => {
    if (on) noticeNavExpanded.value = true
  },
  { immediate: true }
)

const isAlertMgmtSection = computed(() => route.path.startsWith('/alert-mgmt'))
/** 侧栏「告警规则」：规则组 + 规则（分栏），含新建/导入/编辑子路由 */
const isAlertRulesNavRoute = computed(() => route.path.startsWith('/alert-mgmt/rules'))
const alertNavExpanded = ref(false)

watch(
  isAlertMgmtSection,
  (on) => {
    if (on) alertNavExpanded.value = true
  },
  { immediate: true }
)

const isPersonnelMgmtRoute = computed(() => route.path.startsWith('/roleadmin'))
const personnelNavExpanded = ref(false)

watch(
  isPersonnelMgmtRoute,
  (on) => {
    if (on) personnelNavExpanded.value = true
  },
  { immediate: true }
)

const isAnalysisDiagSection = computed(() => route.path.startsWith('/aiops-rca'))
const analysisDiagNavExpanded = ref(false)

watch(
  isAnalysisDiagSection,
  (on) => {
    if (on) analysisDiagNavExpanded.value = true
  },
  { immediate: true }
)

// Page title
const pageTitle = computed(() => {
  const fromRouteMeta = [...route.matched].reverse().find((r) => r.meta?.title)?.meta?.title
  if (fromRouteMeta) return fromRouteMeta
  const titles = {
    '/dashboard': '监控面板',
    '/alert': '告警统计',
    '/fault-center': '故障中心',
    '/dutyManage': '值班中心',
    '/aiops-rca': '智能诊断',
    '/alertinhibit': '告警抑制',
    '/roleadmin/users': '用户列表',
    '/roleadmin/roles': '角色与权限',
    '/forbidden': '无权限',
    '/noticeTemplate': '通知模版'
  }
  return titles[route.path] || '监控面板'
})

// Logout
const handleLogout = () => {
  showLogoutModal.value = false
  userStore.logout()
  router.push('/login')
}

</script>

<style scoped>
.app-container {
  min-height: 100vh;
  background: var(--bg-page);
}

.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  width: var(--sidebar-width);
  height: 100vh;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-default);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.logo-section {
  padding: 20px 20px 18px;
  border-bottom: 1px solid var(--border-default);
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 40px;
  height: 40px;
  background: var(--brand-600);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.logo-text {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.logo-subtitle {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 400;
  margin-top: 2px;
  letter-spacing: 0;
  text-transform: none;
}

.nav-section {
  flex: 1;
  min-height: 0;
  padding: 16px 12px;
  overflow-y: auto;
}

.sidebar-footer {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 12px 14px;
  border-top: 1px solid var(--border-default);
  background: var(--bg-sidebar);
  box-shadow: 0 -4px 12px rgba(15, 23, 42, 0.04);
}

.sidebar-footer-title {
  margin: 0;
  line-height: 1.35;
  font-size: 14px;
  width: 100%;
  word-break: break-word;
}

.sidebar-footer-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  width: 100%;
}

.sidebar-footer-user {
  padding-top: 6px;
  margin-top: 4px;
  border-top: 1px solid var(--border-default);
  width: 100%;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  margin: 2px 0;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  position: relative;
  text-decoration: none;
  transition: background 0.15s ease, color 0.15s ease;
}

.nav-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%) scaleY(0);
  height: 20px;
  width: 3px;
  background: var(--brand-600);
  border-radius: 0 2px 2px 0;
  transition: transform 0.15s ease;
}

.nav-item:hover {
  background: var(--bg-subtle);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--brand-50);
  color: var(--brand-700);
  font-weight: 500;
}

.nav-item.active::before {
  transform: translateY(-50%) scaleY(1);
}

.nav-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nav-text {
  font-size: 14px;
}

.nav-collapse {
  margin: 2px 0;
}
.nav-collapse-trigger {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 14px;
  margin: 0;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 14px;
  text-align: left;
  font-family: inherit;
  transition: background 0.15s ease, color 0.15s ease;
  position: relative;
}
.nav-collapse-trigger:hover {
  background: var(--bg-subtle);
  color: var(--text-primary);
}
.nav-collapse-trigger:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--bg-surface), 0 0 0 4px var(--brand-600);
}
.nav-collapse-trigger.is-active-parent {
  color: var(--brand-700);
  font-weight: 500;
  background: var(--brand-50);
}
.nav-collapse-chevron {
  width: 20px;
  height: 20px;
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--text-muted);
  transition: transform 0.2s ease;
}
.nav-collapse-chevron.expanded {
  transform: rotate(90deg);
}
.nav-collapse-body {
  overflow: hidden;
}
.nav-item.nav-item-child {
  padding-left: 46px;
}
.nav-collapse-h-enter-active,
.nav-collapse-h-leave-active {
  overflow: hidden;
  transition: max-height 0.22s ease, opacity 0.18s ease;
}
.nav-collapse-h-enter-from,
.nav-collapse-h-leave-to {
  max-height: 0;
  opacity: 0;
}
.nav-collapse-h-enter-to,
.nav-collapse-h-leave-from {
  max-height: 360px;
  opacity: 1;
}

.nav-badge {
  margin-left: auto;
  background: var(--danger-600);
  color: #fff;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 600;
}

.user-avatar {
  width: 36px;
  height: 36px;
  background: var(--brand-600);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 12px;
  color: #fff;
  flex-shrink: 0;
}

a.user-avatar-link {
  text-decoration: none;
  color: #fff;
  border: 2px solid transparent;
  transition: background 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

a.user-avatar-link:hover {
  background: var(--brand-700);
}

a.user-avatar-link:focus-visible {
  outline: none;
  border-color: color-mix(in srgb, #fff 70%, var(--brand-600));
  box-shadow: 0 0 0 2px var(--bg-surface), 0 0 0 4px var(--brand-600);
}

a.user-avatar-link.user-avatar-active {
  background: var(--brand-800);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand-600) 35%, transparent);
}

.user-meta {
  min-width: 0;
  max-width: 140px;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.25;
}

.user-role {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.25;
}

.logout-btn {
  width: 34px;
  height: 34px;
  border: 1px solid var(--border-default);
  background: var(--bg-surface);
  color: var(--text-muted);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logout-btn:hover {
  background: var(--danger-50);
  border-color: #fecaca;
  color: var(--danger-600);
}

.main-content {
  margin-left: var(--sidebar-width);
  min-height: 100vh;
  background: var(--bg-page);
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.header-user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-content {
  padding: 24px 28px 32px;
  max-width: 1600px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.15s ease;
}

.modal {
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: 28px;
  width: 100%;
  max-width: 400px;
  text-align: center;
  box-shadow: var(--shadow-lg);
  animation: slideUp 0.2s ease;
}

.modal-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  background: var(--danger-50);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--danger-600);
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.modal-text {
  color: var(--text-secondary);
  margin-bottom: 24px;
  line-height: 1.6;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  gap: 10px;
}

.modal-actions .btn {
  flex: 1;
  justify-content: center;
  padding: 10px 16px;
}
</style>