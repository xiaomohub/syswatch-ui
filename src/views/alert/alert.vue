<template>
  <div class="alert-page">
    <!-- Alert Overview -->
    <div class="alert-overview">
      <div 
        class="alert-stat-card" 
        v-for="stat in alertStats" 
        :key="stat.type"
        :class="stat.type"
        @click="filterBySeverity(stat.type)"
      >
        <div class="alert-stat-icon" v-html="stat.icon"></div>
        <div class="alert-stat-value">{{ stat.count }}</div>
        <div class="alert-stat-label">{{ stat.label }}</div>
        <div class="alert-stat-change" :class="stat.trend > 0 ? 'up' : 'down'">
          {{ stat.trend > 0 ? '+' : '' }}{{ stat.trend }} 较昨日
        </div>
      </div>
    </div>

    <!-- Filters & Actions -->
    <div class="alert-toolbar">
      <div class="filter-group">
        <div class="search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input 
            type="text" 
            placeholder="搜索告警..." 
            v-model="searchQuery"
            class="search-input"
          >
        </div>
        <select class="filter-select" v-model="severityFilter">
          <option value="all">全部级别</option>
          <option value="critical">严重</option>
          <option value="warning">警告</option>
          <option value="info">提示</option>
        </select>
        <select class="filter-select" v-model="statusFilter">
          <option value="all">全部状态</option>
          <option value="active">活动中</option>
          <option value="resolved">已解决</option>
          <option value="acknowledged">已确认</option>
        </select>
        <select class="filter-select" v-model="timeFilter">
          <option value="1h">最近 1 小时</option>
          <option value="6h">最近 6 小时</option>
          <option value="24h">最近 24 小时</option>
          <option value="7d">最近 7 天</option>
        </select>
      </div>
      <div class="action-group">
        <button class="btn btn-secondary" @click="refreshAlerts">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          刷新
        </button>
        <button class="btn btn-secondary" @click="acknowledgeSelected" :disabled="selectedAlerts.length === 0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          批量确认 ({{ selectedAlerts.length }})
        </button>
        <button class="btn btn-primary" @click="exportAlerts">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          导出报告
        </button>
      </div>
    </div>

    <!-- Alert List -->
    <div class="alert-list-section">
      <div class="alert-list-header">
        <label class="checkbox-cell">
          <input type="checkbox" @change="toggleSelectAll" :checked="isAllSelected">
          <span class="checkmark"></span>
        </label>
        <span class="header-cell severity">级别</span>
        <span class="header-cell title">告警内容</span>
        <span class="header-cell source">来源</span>
        <span class="header-cell time">时间</span>
        <span class="header-cell status">状态</span>
        <span class="header-cell actions">操作</span>
      </div>
      
      <div class="alert-list">
        <div 
          class="alert-item" 
          v-for="alert in filteredAlerts" 
          :key="alert.id"
          :class="{ 'selected': selectedAlerts.includes(alert.id) }"
        >
          <label class="checkbox-cell">
            <input type="checkbox" :value="alert.id" v-model="selectedAlerts">
            <span class="checkmark"></span>
          </label>
          <div class="severity-cell">
            <span class="severity-badge" :class="alert.severity">
              {{ getSeverityLabel(alert.severity) }}
            </span>
          </div>
          <div class="title-cell">
            <div class="alert-title">{{ alert.title }}</div>
            <div class="alert-host">{{ alert.host }}</div>
          </div>
          <div class="source-cell">
            <span class="source-tag">{{ alert.source }}</span>
          </div>
          <div class="time-cell">
            <div class="alert-time">{{ alert.time }}</div>
            <div class="alert-duration">持续 {{ alert.duration }}</div>
          </div>
          <div class="status-cell">
            <span class="status-badge" :class="alert.status">
              {{ getStatusLabel(alert.status) }}
            </span>
          </div>
          <div class="actions-cell">
            <button class="icon-btn" @click="viewDetail(alert)" title="查看详情">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
            <button class="icon-btn" @click="acknowledgeAlert(alert.id)" title="确认告警" v-if="alert.status === 'active'">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>
            <button class="icon-btn" @click="resolveAlert(alert.id)" title="解决告警" v-if="alert.status !== 'resolved'">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="16 12 12 8 8 12"/>
                <line x1="12" y1="16" x2="12" y2="8"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="empty-state" v-if="filteredAlerts.length === 0">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <p>暂无告警记录</p>
        </div>
      </div>

      <!-- Pagination -->
      <div class="pagination" v-if="filteredAlerts.length > 0">
        <span class="pagination-info">
          共 {{ totalAlerts }} 条告警，当前显示 {{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, totalAlerts) }} 条
        </span>
        <div class="pagination-controls">
          <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span class="page-numbers">
            <button 
              v-for="page in displayPages" 
              :key="page"
              class="page-num"
              :class="{ active: page === currentPage }"
              @click="currentPage = page"
            >
              {{ page }}
            </button>
          </span>
          <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Alert Detail Modal -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="showDetailModal" @click.self="showDetailModal = false">
        <div class="modal detail-modal">
          <div class="modal-header">
            <h3>告警详情</h3>
            <button class="close-btn" @click="showDetailModal = false">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="modal-body" v-if="selectedAlert">
            <div class="detail-row">
              <span class="detail-label">告警级别</span>
              <span class="severity-badge" :class="selectedAlert.severity">
                {{ getSeverityLabel(selectedAlert.severity) }}
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">告警内容</span>
              <span class="detail-value">{{ selectedAlert.title }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">主机</span>
              <span class="detail-value mono">{{ selectedAlert.host }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">来源</span>
              <span class="source-tag">{{ selectedAlert.source }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">触发时间</span>
              <span class="detail-value mono">{{ selectedAlert.time }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">持续时间</span>
              <span class="detail-value">{{ selectedAlert.duration }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">状态</span>
              <span class="status-badge" :class="selectedAlert.status">
                {{ getStatusLabel(selectedAlert.status) }}
              </span>
            </div>
            <div class="detail-section">
              <span class="detail-label">详细描述</span>
              <p class="detail-description">{{ selectedAlert.description || '暂无详细描述' }}</p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showDetailModal = false">关闭</button>
            <button class="btn btn-primary" @click="acknowledgeAlert(selectedAlert?.id); showDetailModal = false">
              确认告警
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Alert stats
const alertStats = ref([
  {
    type: 'critical',
    label: '严重告警',
    count: 3,
    trend: 1,
    icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
  },
  {
    type: 'warning',
    label: '警告告警',
    count: 8,
    trend: -2,
    icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  },
  {
    type: 'info',
    label: '提示告警',
    count: 15,
    trend: 3,
    icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  },
  {
    type: 'resolved',
    label: '已解决',
    count: 42,
    trend: 5,
    icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
  }
])

// Filters
const searchQuery = ref('')
const severityFilter = ref('all')
const statusFilter = ref('all')
const timeFilter = ref('24h')

// Selection
const selectedAlerts = ref([])
const showDetailModal = ref(false)
const selectedAlert = ref(null)

// Pagination
const currentPage = ref(1)
const pageSize = 10

// Alerts data
const alerts = ref([
  { id: 1, title: 'CPU 使用率超过阈值 (95%)', host: 'node-01.example.com', source: 'prometheus', time: '2024-01-15 14:32:18', duration: '15分钟', severity: 'critical', status: 'active', description: 'CPU使用率持续超过95%，可能导致系统响应缓慢。建议检查是否有异常进程占用大量CPU资源。' },
  { id: 2, title: '内存使用率告警 (88%)', host: 'node-03.example.com', source: 'prometheus', time: '2024-01-15 14:28:45', duration: '23分钟', severity: 'critical', status: 'active', description: '内存使用率达到88%，接近告警阈值。' },
  { id: 3, title: 'Database 连接池即将耗尽', host: 'db-master.example.com', source: 'mysql-exporter', time: '2024-01-15 14:25:12', duration: '28分钟', severity: 'critical', status: 'acknowledged', description: '数据库连接池使用率超过90%。' },
  { id: 4, title: '磁盘空间不足 (82%)', host: 'node-02.example.com', source: 'node-exporter', time: '2024-01-15 14:20:33', duration: '35分钟', severity: 'warning', status: 'active', description: '磁盘使用率达到82%，建议清理无用文件。' },
  { id: 5, title: 'API 响应时间增加', host: 'api-gateway.example.com', source: 'blackbox-exporter', time: '2024-01-15 14:15:22', duration: '40分钟', severity: 'warning', status: 'active', description: 'API平均响应时间从200ms增加到800ms。' },
  { id: 6, title: '网络延迟升高', host: 'edge-router.example.com', source: 'prometheus', time: '2024-01-15 14:10:08', duration: '45分钟', severity: 'warning', status: 'acknowledged', description: '网络延迟从5ms增加到50ms。' },
  { id: 7, title: 'SSL证书即将过期', host: 'web-server.example.com', source: 'blackbox-exporter', time: '2024-01-15 14:05:00', duration: '50分钟', severity: 'warning', status: 'active', description: 'SSL证书将在7天后过期。' },
  { id: 8, title: '容器重启次数增加', host: 'k8s-worker-01', source: 'cadvisor', time: '2024-01-15 14:00:55', duration: '55分钟', severity: 'info', status: 'active', description: '容器在过去1小时内重启了3次。' },
  { id: 9, title: '定时任务执行完成', host: 'scheduler.example.com', source: 'cron-exporter', time: '2024-01-15 13:55:00', duration: '1小时', severity: 'info', status: 'resolved', description: '每日备份任务已完成。' },
  { id: 10, title: '新节点加入集群', host: 'node-05.example.com', source: 'kubernetes', time: '2024-01-15 13:50:00', duration: '1小时5分', severity: 'info', status: 'resolved', description: '新节点已成功加入Kubernetes集群。' },
])

// Computed
const filteredAlerts = computed(() => {
  return alerts.value.filter(alert => {
    const matchSearch = !searchQuery.value || 
      alert.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      alert.host.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchSeverity = severityFilter.value === 'all' || alert.severity === severityFilter.value
    const matchStatus = statusFilter.value === 'all' || alert.status === statusFilter.value
    return matchSearch && matchSeverity && matchStatus
  })
})

const totalAlerts = computed(() => filteredAlerts.value.length)
const totalPages = computed(() => Math.ceil(totalAlerts.value / pageSize))

const displayPages = computed(() => {
  const pages = []
  for (let i = 1; i <= totalPages.value; i++) {
    pages.push(i)
  }
  return pages
})

const isAllSelected = computed(() => {
  return filteredAlerts.value.length > 0 && 
    filteredAlerts.value.every(a => selectedAlerts.value.includes(a.id))
})

// Methods
const getSeverityLabel = (severity) => {
  const labels = { critical: '严重', warning: '警告', info: '提示' }
  return labels[severity] || severity
}

const getStatusLabel = (status) => {
  const labels = { active: '活动中', resolved: '已解决', acknowledged: '已确认' }
  return labels[status] || status
}

const filterBySeverity = (type) => {
  if (type === 'resolved') {
    statusFilter.value = 'resolved'
    severityFilter.value = 'all'
  } else {
    severityFilter.value = type
    statusFilter.value = 'all'
  }
}

const toggleSelectAll = (e) => {
  if (e.target.checked) {
    selectedAlerts.value = filteredAlerts.value.map(a => a.id)
  } else {
    selectedAlerts.value = []
  }
}

const viewDetail = (alert) => {
  selectedAlert.value = alert
  showDetailModal.value = true
}

const acknowledgeAlert = (id) => {
  const alert = alerts.value.find(a => a.id === id)
  if (alert) {
    alert.status = 'acknowledged'
  }
}

const resolveAlert = (id) => {
  const alert = alerts.value.find(a => a.id === id)
  if (alert) {
    alert.status = 'resolved'
  }
}

const acknowledgeSelected = () => {
  selectedAlerts.value.forEach(id => acknowledgeAlert(id))
  selectedAlerts.value = []
}

const refreshAlerts = () => {
  // 模拟刷新
  console.log('Refreshing alerts...')
}

const exportAlerts = () => {
  // 模拟导出
  alert('告警报告导出成功！')
}
</script>

<style scoped>
.alert-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Alert Overview */
.alert-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.alert-stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.alert-stat-card::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--card-color);
}

.alert-stat-card:hover {
  transform: translateY(-4px);
  border-color: var(--card-color);
}

.alert-stat-card.critical { --card-color: var(--accent-red); }
.alert-stat-card.warning { --card-color: var(--accent-yellow); }
.alert-stat-card.info { --card-color: var(--accent-cyan); }
.alert-stat-card.resolved { --card-color: var(--accent-green); }

.alert-stat-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  background: linear-gradient(135deg, var(--card-color), transparent);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--card-color);
}

.alert-stat-value {
  font-size: 36px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  color: var(--card-color);
}

.alert-stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.alert-stat-change {
  font-size: 12px;
  margin-top: 12px;
  padding: 4px 12px;
  border-radius: 12px;
  display: inline-block;
}

.alert-stat-change.up {
  background: rgba(239, 68, 68, 0.1);
  color: var(--accent-red);
}

.alert-stat-change.down {
  background: rgba(16, 185, 129, 0.1);
  color: var(--accent-green);
}

/* Toolbar */
.alert-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-box svg {
  position: absolute;
  left: 14px;
  color: var(--text-muted);
}

.search-input {
  padding: 10px 14px 10px 42px;
  width: 280px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-cyan);
}

.filter-select {
  padding: 10px 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
}

.filter-select option {
  background: var(--bg-secondary);
}

.action-group {
  display: flex;
  gap: 12px;
}

/* Alert List */
.alert-list-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  overflow: hidden;
}

.alert-list-header {
  display: grid;
  grid-template-columns: 40px 80px 1fr 120px 140px 100px 100px;
  gap: 16px;
  padding: 16px 24px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.alert-list {
  max-height: 600px;
  overflow-y: auto;
}

.alert-item {
  display: grid;
  grid-template-columns: 40px 80px 1fr 120px 140px 100px 100px;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
  align-items: center;
  transition: background 0.2s ease;
}

.alert-item:last-child {
  border-bottom: none;
}

.alert-item:hover {
  background: rgba(6, 182, 212, 0.04);
}

.alert-item.selected {
  background: rgba(6, 182, 212, 0.08);
}

/* Checkbox */
.checkbox-cell {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.checkbox-cell input {
  display: none;
}

.checkmark {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border-color);
  border-radius: 4px;
  position: relative;
  transition: all 0.2s ease;
}

.checkbox-cell input:checked + .checkmark {
  background: var(--accent-cyan);
  border-color: var(--accent-cyan);
}

.checkbox-cell input:checked + .checkmark::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

/* Badges */
.severity-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.severity-badge.critical {
  background: rgba(239, 68, 68, 0.15);
  color: var(--accent-red);
}

.severity-badge.warning {
  background: rgba(245, 158, 11, 0.15);
  color: var(--accent-yellow);
}

.severity-badge.info {
  background: rgba(6, 182, 212, 0.15);
  color: var(--accent-cyan);
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
}

.status-badge.active {
  background: rgba(239, 68, 68, 0.15);
  color: var(--accent-red);
}

.status-badge.resolved {
  background: rgba(16, 185, 129, 0.15);
  color: var(--accent-green);
}

.status-badge.acknowledged {
  background: rgba(139, 92, 246, 0.15);
  color: var(--accent-purple);
}

.source-tag {
  display: inline-block;
  padding: 4px 10px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-secondary);
}

/* Cell Styles */
.title-cell {
  min-width: 0;
}

.alert-title {
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.alert-host {
  font-size: 12px;
  color: var(--text-muted);
  font-family: 'JetBrains Mono', monospace;
}

.time-cell {
  font-size: 12px;
}

.alert-time {
  font-family: 'JetBrains Mono', monospace;
  margin-bottom: 2px;
}

.alert-duration {
  color: var(--text-muted);
}

.actions-cell {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.icon-btn:hover {
  background: var(--accent-cyan);
  color: white;
}

/* Empty State */
.empty-state {
  padding: 60px 20px;
  text-align: center;
  color: var(--text-muted);
}

.empty-state svg {
  margin-bottom: 16px;
  opacity: 0.5;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
}

.pagination-info {
  font-size: 13px;
  color: var(--text-muted);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: 4px;
}

.page-num {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;
}

.page-num:hover {
  background: var(--bg-tertiary);
}

.page-num.active {
  background: var(--accent-cyan);
  color: white;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.detail-modal {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  width: 520px;
  max-height: 80vh;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.modal-body {
  padding: 24px;
  max-height: 400px;
  overflow-y: auto;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 13px;
  color: var(--text-muted);
}

.detail-value {
  font-size: 14px;
}

.detail-value.mono {
  font-family: 'JetBrains Mono', monospace;
}

.detail-section {
  margin-top: 20px;
}

.detail-section .detail-label {
  display: block;
  margin-bottom: 12px;
}

.detail-description {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary);
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: 10px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
}

/* Responsive */
@media (max-width: 1400px) {
  .alert-overview {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 1200px) {
  .alert-list-header,
  .alert-item {
    grid-template-columns: 40px 70px 1fr 100px 80px;
  }
  .source-cell,
  .actions-cell {
    display: none;
  }
}
</style>