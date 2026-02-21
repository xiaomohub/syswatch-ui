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
            <div class="logo-subtitle">Monitor System</div>
          </div>
        </div>
      </div>

      <nav class="nav-section">
        <div class="nav-label">主要功能</div>
        
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

        <router-link to="/alert" class="nav-item" active-class="active">
          <span class="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </span>
          <span class="nav-text">告警统计</span>
        </router-link>

        <router-link to="/alertconfig" class="nav-item" active-class="active">
          <span class="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v10"/>
              <path d="M21 12h-6m-6 0H1"/>
            </svg>
          </span>
          <span class="nav-text">告警配置</span>
        </router-link>

        <router-link to="/logquery" class="nav-item" active-class="active">
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
      </nav>
        <!-- 添加新的导航分组标签 -->
        <div class="nav-label">告警管理</div>

        <!-- 告警静默 -->
        <router-link to="/alertsilence" class="nav-item" active-class="active">
          <span class="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          </span>
          <span class="nav-text">告警静默</span>
        </router-link>




      <div class="user-section">
        <div class="user-card">
          <div class="user-avatar">{{ userInitials }}</div>
          <div class="user-info">
            <div class="user-name">{{ userName }}</div>
            <div class="user-role">{{ userRole }}</div>
          </div>
          <button class="logout-btn" @click="showLogoutModal = true" title="退出登录">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
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
        </div>
      </header>

      <div class="page-content">
        <router-view />
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

const route = useRoute()
const router = useRouter()

const showLogoutModal = ref(false)
const currentTime = ref('')

// User info
const userName = ref('Admin')
const userRole = ref('系统管理员')
const userInitials = computed(() => userName.value.slice(0, 2).toUpperCase())

// Page title
const pageTitle = computed(() => {
  const titles = {
    '/dashboard': '监控面板',
    '/alert': '告警统计',
    '/alertsilence': '告警静默',
    '/alertinhibit': '告警抑制',
    '/alertconfig': '告警配置',
    '/logquery': '日志查询'
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
  // 清除登录状态
  localStorage.removeItem('token')
  localStorage.removeItem('user')
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
  background: var(--bg-primary);
  background-image: 
    radial-gradient(circle at 20% 80%, rgba(6, 182, 212, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.05) 0%, transparent 50%),
    linear-gradient(rgba(30, 41, 59, 0.3) 1px, transparent 1px),
    linear-gradient(90deg, rgba(30, 41, 59, 0.3) 1px, transparent 1px);
  background-size: 100% 100%, 100% 100%, 40px 40px, 40px 40px;
}

/* Sidebar */
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  width: var(--sidebar-width);
  height: 100vh;
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.logo-section {
  padding: 24px;
  border-bottom: 1px solid var(--border-color);
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 42px;
  height: 42px;
  background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple));
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 20px var(--accent-cyan-glow);
}

.logo-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 20px;
  font-weight: 600;
  background: linear-gradient(90deg, var(--accent-cyan), var(--accent-purple));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-subtitle {
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 2px;
  text-transform: uppercase;
}

.nav-section {
  flex: 1;
  padding: 20px 12px;
  overflow-y: auto;
}

.nav-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  padding: 12px 16px 8px;
  font-weight: 500;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  margin: 4px 0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--text-secondary);
  position: relative;
  overflow: hidden;
  text-decoration: none;
}

.nav-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 3px;
  background: var(--accent-cyan);
  transform: scaleY(0);
  transition: transform 0.25s ease;
}

.nav-item:hover {
  background: rgba(6, 182, 212, 0.08);
  color: var(--text-primary);
}

.nav-item.active {
  background: rgba(6, 182, 212, 0.12);
  color: var(--accent-cyan);
}

.nav-item.active::before {
  transform: scaleY(1);
}

.nav-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-text {
  font-size: 14px;
  font-weight: 500;
}

.nav-badge {
  margin-left: auto;
  background: var(--accent-red);
  color: white;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}

.user-section {
  padding: 16px;
  border-top: 1px solid var(--border-color);
}

.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 12px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--accent-cyan), var(--accent-green));
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  color: white;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
}

.user-role {
  font-size: 12px;
  color: var(--text-muted);
}

.logout-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(239, 68, 68, 0.1);
  color: var(--accent-red);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logout-btn:hover {
  background: var(--accent-red);
  color: white;
}

/* Main Content */
.main-content {
  margin-left: var(--sidebar-width);
  min-height: 100vh;
}

.header {
  height: var(--header-height);
  background: rgba(17, 24, 39, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  position: sticky;
  top: 0;
  z-index: 50;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 20px;
  font-size: 13px;
  color: var(--accent-green);
}

.status-dot {
  width: 8px;
  height: 8px;
  background: var(--accent-green);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.time-display {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--text-secondary);
}

.page-content {
  padding: 32px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 32px;
  width: 400px;
  text-align: center;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.modal-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 20px;
  background: rgba(239, 68, 68, 0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-red);
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 12px;
}

.modal-text {
  color: var(--text-secondary);
  margin-bottom: 28px;
  line-height: 1.6;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.modal-actions .btn {
  flex: 1;
  justify-content: center;
  padding: 12px 20px;
}
</style>