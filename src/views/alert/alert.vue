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
            placeholder="搜索告警名称..." 
            v-model="searchQuery"
            class="search-input"
          >
        </div>
        <select class="filter-select" v-model="severityFilter">
          <option value="">全部级别</option>
          <option value="critical">严重</option>
          <option value="warning">警告</option>
          <option value="info">提示</option>
        </select>
        <input 
          type="datetime-local" 
          class="filter-select"
          v-model="startTimeFilter"
          placeholder="开始时间"
        >
        <input 
          type="datetime-local" 
          class="filter-select"
          v-model="endTimeFilter"
          placeholder="结束时间"
        >
      </div>
      <div class="action-group">
        <button class="btn btn-secondary" @click="loadAlerts" :disabled="loading">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          {{ loading ? '加载中...' : '刷新' }}
        </button>
        <button class="btn btn-primary" @click="exportAlerts" :disabled="!alertData.records || alertData.records.length === 0">
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
        <span class="header-cell severity">级别</span>
        <span class="header-cell title">告警内容</span>
        <span class="header-cell name">告警名称</span>
        <span class="header-cell time">触发时间</span>
        <span class="header-cell time">恢复时间</span>
        <span class="header-cell status">状态</span>
        <span class="header-cell actions">操作</span>
      </div>
      
      <div class="alert-list">
        <div 
          class="alert-item" 
          v-for="alert in alertData.records" 
          :key="alert.id"
        >
          <div class="severity-cell">
            <span class="severity-badge" :class="alert.severity">
              {{ getSeverityLabel(alert.severity) }}
            </span>
          </div>
          <div class="title-cell">
            <div class="alert-title">{{ alert.summary }}</div>
            <div class="alert-description">{{ alert.description }}</div>
          </div>
          <div class="name-cell">
            <span class="name-tag">{{ alert.alertName }}</span>
          </div>
          <div class="time-cell">
            <div class="alert-time">{{ formatTime(alert.startsAt) }}</div>
          </div>
          <div class="time-cell">
            <div class="alert-time" v-if="alert.endsAt">{{ formatTime(alert.endsAt) }}</div>
            <div class="alert-time" v-else style="color: var(--text-muted);">-</div>
          </div>
          <div class="status-cell">
            <span class="status-badge" :class="getStatusClass(alert)">
              {{ getStatusLabel(alert.status, alert.endsAt) }}
            </span>
          </div>
          <div class="actions-cell">
            <button class="icon-btn" @click="viewDetail(alert)" title="查看详情">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="empty-state" v-if="!loading && (!alertData.records || alertData.records.length === 0)">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <p>暂无告警记录</p>
        </div>

        <div class="loading-state" v-if="loading">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>
      </div>

      <!-- Pagination -->
      <div class="pagination" v-if="!loading && alertData.records && alertData.records.length > 0">
        <span class="pagination-info">
          共 {{ alertData.total }} 条告警，当前显示第 {{ alertData.current }} 页
        </span>
        <div class="pagination-controls">
          <button class="page-btn" :disabled="alertData.current === 1" @click="currentPage--">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span class="page-numbers">
            <button 
              v-for="page in displayPages" 
              :key="page"
              class="page-num"
              :class="{ active: page === alertData.current }"
              @click="currentPage = page"
            >
              {{ page }}
            </button>
          </span>
          <button class="page-btn" :disabled="alertData.current >= alertData.pages" @click="currentPage++">
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
              <span class="detail-label">告警ID</span>
              <span class="detail-value mono">{{ selectedAlert.id }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">告警名称</span>
              <span class="detail-value">{{ selectedAlert.alertName }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">告警级别</span>
              <span class="severity-badge" :class="selectedAlert.severity">
                {{ getSeverityLabel(selectedAlert.severity) }}
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">状态</span>
              <span class="status-badge" :class="getStatusClass(selectedAlert)">
                {{ getStatusLabel(selectedAlert.status, selectedAlert.endsAt) }}
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">摘要</span>
              <span class="detail-value">{{ selectedAlert.summary }}</span>
            </div>
            <div class="detail-section">
              <span class="detail-label">描述</span>
              <p class="detail-description">{{ selectedAlert.description || '暂无详细描述' }}</p>
            </div>
            <div class="detail-row">
              <span class="detail-label">触发时间</span>
              <span class="detail-value mono">{{ formatTime(selectedAlert.startsAt) }}</span>
            </div>
            <div class="detail-row" v-if="selectedAlert.endsAt">
              <span class="detail-label">恢复时间</span>
              <span class="detail-value mono">{{ formatTime(selectedAlert.endsAt) }}</span>
            </div>
            <div class="detail-section" v-if="parsedLabels">
              <span class="detail-label">标签 (Labels)</span>
              <div class="tags-container">
                <span class="label-tag" v-for="(value, key) in parsedLabels" :key="key">
                  <span class="tag-key">{{ key }}</span>
                  <span class="tag-value">{{ value }}</span>
                </span>
              </div>
            </div>
            <div class="detail-section" v-if="parsedAnnotations">
              <span class="detail-label">注解 (Annotations)</span>
              <div class="tags-container">
                <span class="label-tag" v-for="(value, key) in parsedAnnotations" :key="key">
                  <span class="tag-key">{{ key }}</span>
                  <span class="tag-value">{{ value }}</span>
                </span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showDetailModal = false">关闭</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

// API base URL
const API_BASE_URL = '/api/alerts'

// Alert stats
const alertStats = ref([
  {
    type: 'critical',
    label: '严重告警',
    count: 0,
    icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
  },
  {
    type: 'warning',
    label: '警告告警',
    count: 0,
    icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  },
  {
    type: 'info',
    label: '提示告警',
    count: 0,
    icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  },
  {
    type: 'resolved',
    label: '已解决',
    count: 0,
    icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
  }
])

// Filters
const searchQuery = ref('')
const severityFilter = ref('')
const startTimeFilter = ref('')
const endTimeFilter = ref('')

// Pagination
const currentPage = ref(1)
const pageSize = ref(10)

// Modal
const showDetailModal = ref(false)
const selectedAlert = ref(null)

// Data
const alertData = ref({
  records: [],
  total: 0,
  current: 1,
  pages: 1
})

const loading = ref(false)

// Computed
const displayPages = computed(() => {
  const pages = []
  const totalPages = alertData.value.pages || 1
  const current = alertData.value.current || 1
  
  for (let i = Math.max(1, current - 2); i <= Math.min(totalPages, current + 2); i++) {
    pages.push(i)
  }
  return pages
})

const parsedLabels = computed(() => {
  if (!selectedAlert.value?.labels) return null
  try {
    return typeof selectedAlert.value.labels === 'string' 
      ? JSON.parse(selectedAlert.value.labels) 
      : selectedAlert.value.labels
  } catch {
    return null
  }
})

const parsedAnnotations = computed(() => {
  if (!selectedAlert.value?.annotations) return null
  try {
    return typeof selectedAlert.value.annotations === 'string' 
      ? JSON.parse(selectedAlert.value.annotations) 
      : selectedAlert.value.annotations
  } catch {
    return null
  }
})

// Methods
const getSeverityLabel = (severity) => {
  const labels = { 
    critical: '严重', 
    warning: '警告', 
    info: '提示',
    error: '错误'
  }
  return labels[severity] || severity
}

const getStatusLabel = (status, endsAt) => {
  if (status === 'firing' || !endsAt) {
    return '活动中'
  } else if (status === 'resolved' || endsAt) {
    return '已解决'
  }
  return status
}

const getStatusClass = (alert) => {
  if (alert.status === 'firing' || !alert.endsAt) {
    return 'active'
  } else if (alert.status === 'resolved' || alert.endsAt) {
    return 'resolved'
  }
  return 'active'
}

const formatTime = (dateString) => {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return dateString
  }
}

const loadAlerts = async () => {
  loading.value = true
  try {
    const params = {
      pageNum: currentPage.value,
      pageSize: pageSize.value
    }

    if (searchQuery.value) {
      params.alertName = searchQuery.value
    }
    if (severityFilter.value) {
      params.severity = severityFilter.value
    }
    if (startTimeFilter.value) {
      params.startTime = new Date(startTimeFilter.value).toISOString()
    }
    if (endTimeFilter.value) {
      params.endTime = new Date(endTimeFilter.value).toISOString()
    }

    const response = await axios.get(`${API_BASE_URL}/history`, { params })
    
    // 处理分页数据结构
    alertData.value = {
      records: response.data.records || [],
      total: response.data.total || 0,
      current: response.data.current || currentPage.value,
      pages: response.data.pages || 1
    }

    // 更新统计数据
    updateStats(response.data.records || [])
  } catch (error) {
    console.error('加载告警失败:', error)
    alertData.value = {
      records: [],
      total: 0,
      current: 1,
      pages: 1
    }
  } finally {
    loading.value = false
  }
}

const updateStats = (records) => {
  const stats = {
    critical: 0,
    warning: 0,
    info: 0,
    resolved: 0
  }

  records.forEach(alert => {
    if (alert.status === 'resolved' || alert.endsAt) {
      stats.resolved++
    } else if (alert.severity === 'critical') {
      stats.critical++
    } else if (alert.severity === 'warning') {
      stats.warning++
    } else if (alert.severity === 'info') {
      stats.info++
    }
  })

  alertStats.value.forEach(stat => {
    if (stat.type === 'critical') stat.count = stats.critical
    else if (stat.type === 'warning') stat.count = stats.warning
    else if (stat.type === 'info') stat.count = stats.info
    else if (stat.type === 'resolved') stat.count = stats.resolved
  })
}

const filterBySeverity = (type) => {
  if (type === 'resolved') {
    // 已解决的告警处理逻辑
    severityFilter.value = ''
  } else {
    severityFilter.value = type
  }
  currentPage.value = 1
  loadAlerts()
}

const viewDetail = (alert) => {
  selectedAlert.value = alert
  showDetailModal.value = true
}

const exportAlerts = () => {
  if (!alertData.value.records || alertData.value.records.length === 0) {
    alert('暂无数据可导出')
    return
  }

  // 构建CSV数据
  const headers = ['告警ID', '告警名称', '级别', '摘要', '触发时间', '恢复时间', '状态']
  const rows = alertData.value.records.map(alert => [
    alert.id,
    alert.alertName,
    getSeverityLabel(alert.severity),
    alert.summary,
    formatTime(alert.startsAt),
    alert.endsAt ? formatTime(alert.endsAt) : '-',
    getStatusLabel(alert.status, alert.endsAt)
  ])

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  // 下载CSV文件
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `alerts_${new Date().getTime()}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Lifecycle
onMounted(() => {
  loadAlerts()
})

// Watch for pagination changes
import { watch } from 'vue'
watch(currentPage, () => {
  loadAlerts()
})
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
  min-width: 150px;
}

.filter-select:focus {
  outline: none;
  border-color: var(--accent-cyan);
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
  grid-template-columns: 80px 1fr 150px 150px 150px 100px 100px;
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
  grid-template-columns: 80px 1fr 150px 150px 150px 100px 100px;
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

.name-tag {
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

.alert-description {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.time-cell {
  font-size: 12px;
}

.alert-time {
  font-family: 'JetBrains Mono', monospace;
}

.name-cell {
  font-size: 12px;
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

/* Loading State */
.loading-state {
  padding: 60px 20px;
  text-align: center;
  color: var(--text-muted);
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 16px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent-cyan);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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
  width: 600px;
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
  max-height: 500px;
  overflow-y: auto;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
}

.detail-row:last-of-type:not(.detail-section) {
  border-bottom: none;
}

.detail-label {
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 500;
}

.detail-value {
  font-size: 14px;
  color: var(--text-primary);
}

.detail-value.mono {
  font-family: 'JetBrains Mono', monospace;
  color: var(--accent-cyan);
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
  margin: 0;
}

.tags-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label-tag {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  font-size: 12px;
  gap: 8px;
}

.tag-key {
  color: var(--accent-cyan);
  font-weight: 500;
  font-family: 'JetBrains Mono', monospace;
}

.tag-value {
  color: var(--text-secondary);
  font-family: 'JetBrains Mono', monospace;
  word-break: break-all;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
}

/* Buttons */
.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  font-family: inherit;
}

.btn-primary {
  background: var(--accent-cyan);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #06b6d4;
  transform: translateY(-2px);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover:not(:disabled) {
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
    grid-template-columns: 70px 1fr 120px 80px;
  }
  .name-cell,
  .actions-cell {
    display: none;
  }
}

@media (max-width: 768px) {
  .alert-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-group {
    flex-direction: column;
  }

  .search-input {
    width: 100%;
  }

  .action-group {
    flex-direction: column;
  }

  .alert-overview {
    grid-template-columns: 1fr;
  }

  .detail-modal {
    width: 95%;
    max-width: 600px;
  }
}
</style>