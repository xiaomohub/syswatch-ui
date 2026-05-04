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
        <router-link v-if="can(PERM.MENU_DASHBOARD)" to="/dashboard" class="nav-item" active-class="active">
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

        <router-link v-if="can(PERM.MENU_ALERT)" to="/alert" class="nav-item" active-class="active">
          <span class="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </span>
          <span class="nav-text">告警统计</span>
        </router-link>

        <router-link
          to="/alert-mgmt/rules"
          class="nav-item"
          :class="{ active: route.path.startsWith('/alert-mgmt') }"
        >
          <span class="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
          </span>
          <span class="nav-text">告警管理</span>
        </router-link>

        <router-link to="/faultcenter" class="nav-item" active-class="active">
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

        <router-link v-if="can(PERM.MENU_ALERT_SILENCE)" to="/alertsilence" class="nav-item" active-class="active">
          <span class="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          </span>
          <span class="nav-text">告警静默</span>
        </router-link>

        <router-link v-if="can(PERM.MENU_ALERT_CONFIG)" to="/alertconfig" class="nav-item" active-class="active">
          <span class="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v10"/>
              <path d="M21 12h-6m-6 0H1"/>
            </svg>
          </span>
          <span class="nav-text">告警配置</span>
        </router-link>

        <router-link v-if="can(PERM.MENU_AIOPS_RCA)" to="/aiops-rca" class="nav-item" active-class="active">
          <span class="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2a4 4 0 0 1 4 4c0 2.5-1.5 4.5-3 6l-1 1-1-1c-1.5-1.5-3-3.5-3-6a4 4 0 0 1 4-4z"/>
              <path d="M9 18h6M10 22h4"/>
              <path d="M8 14h8"/>
            </svg>
          </span>
          <span class="nav-text">智能诊断</span>
        </router-link>

        <router-link v-if="can(PERM.MENU_LOG_QUERY)" to="/logquery" class="nav-item" active-class="active">
          <span class="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </span>
          <span class="nav-text">日志查询</span>
        </router-link>

        <router-link v-if="can(PERM.ADMIN_ROLE_MANAGE)" to="/roleadmin" class="nav-item" active-class="active">
          <span class="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </span>
          <span class="nav-text">角色权限</span>
        </router-link>
      </nav>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <header class="header">
        <h1 class="page-title">{{ pageTitle }}</h1>
        <div class="header-actions">
          <div class="status-indicator">
            <span class="status-dot"></span>
            <span>系统运行正常</span>
          </div>
          <div class="time-display">{{ currentTime }}</div>
          <div class="header-user" role="group" aria-label="当前用户">
            <router-link
              v-if="can(PERM.ADMIN_ROLE_MANAGE)"
              to="/roleadmin"
              class="user-avatar user-avatar-link"
              active-class="user-avatar-active"
              title="角色权限"
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
      </header>

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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { PERM } from '@/constants/rbac'
import ViewErrorBoundary from '@/components/ViewErrorBoundary.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const showLogoutModal = ref(false)
const currentTime = ref('')

const userName = computed(
  () => userStore.profile.displayName || userStore.profile.username || '用户'
)
const userRole = computed(() => userStore.roleLabel)
const userInitials = computed(() => userName.value.slice(0, 2).toUpperCase())
const can = (code) => userStore.hasPermission(code)

// Page title
const pageTitle = computed(() => {
  const fromRouteMeta = [...route.matched].reverse().find((r) => r.meta?.title)?.meta?.title
  if (fromRouteMeta) return fromRouteMeta
  const titles = {
    '/dashboard': '监控面板',
    '/alert': '告警统计',
    '/faultcenter': '故障中心',
    '/aiops-rca': '智能诊断',
    '/alertsilence': '告警静默',
    '/alertinhibit': '告警抑制',
    '/alertconfig': '告警配置',
    '/logquery': '日志查询',
    '/roleadmin': '角色权限',
    '/forbidden': '无权限'
  }
  return titles[route.path] || '监控面板'
})

// Time update
const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// Logout
const handleLogout = () => {
  showLogoutModal.value = false
  userStore.logout()
  router.push('/login')
}

let timeInterval
onMounted(() => {
  updateTime()
  timeInterval = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  clearInterval(timeInterval)
})
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
  padding: 16px 12px;
  overflow-y: auto;
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

.header {
  height: var(--header-height);
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-default);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  position: sticky;
  top: 0;
  z-index: 50;
  box-shadow: var(--shadow-sm);
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.header-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 14px;
  margin-left: 2px;
  border-left: 1px solid var(--border-default);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--success-50);
  border: 1px solid #a7f3d0;
  border-radius: 999px;
  font-size: 13px;
  color: var(--success-700);
  font-weight: 500;
}

.status-dot {
  width: 6px;
  height: 6px;
  background: var(--success-600);
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

.time-display {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
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