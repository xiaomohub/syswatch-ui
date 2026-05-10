<template>
  <div class="alert-page">
    <div class="fc-page-head fc-head-unified">
      <div class="fc-head-start">
        <button
          type="button"
          class="fc-back-dashboard"
          aria-label="返回监控面板"
          title="返回监控面板"
          @click="goDashboard"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2>告警统计</h2>
      </div>
    </div>

    <!-- Alert Overview -->
    <div class="alert-overview">
      <div 
        class="alert-stat-card" 
        v-for="stat in alertStats" 
        :key="stat.type"
        :class="[stat.type, { active: severityFilter === stat.type || (stat.type === 'resolved' && statusFilter === 'resolved') }]"
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
            @keyup.enter="handleSearch"
          >
        </div>
        <select class="filter-select" v-model="severityFilter">
          <option value="">全部级别</option>
          <option value="critical">严重</option>
          <option value="warning">警告</option>
          <option value="info">提示</option>
        </select>
        <select class="filter-select" v-model="statusFilter">
          <option value="">全部状态</option>
          <option value="firing">活动中</option>
          <option value="resolved">已解决</option>
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
        <button class="btn btn-text" @click="resetFilters" v-if="hasActiveFilters">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          清除筛选
        </button>
      </div>
      <div class="action-group">
        <button class="btn btn-secondary" @click="loadAlerts" :disabled="loading">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ spinning: loading }">
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
            <button
              v-if="canAiopsRca"
              class="icon-btn aiops-btn"
              type="button"
              title="智能诊断 · 根因分析"
              @click="goAiopsRca(alert)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a4 4 0 0 1 4 4c0 2.5-1.5 4.5-3 6l-1 1-1-1c-1.5-1.5-3-3.5-3-6a4 4 0 0 1 4-4z"/>
                <path d="M9 18h6M10 22h4M8 14h8"/>
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
          共 {{ alertData.total }} 条告警，当前显示第 {{ currentPage }} / {{ totalPages }} 页
        </span>
        <div class="pagination-controls">
          <select class="page-size-select" v-model="pageSize">
            <option :value="10">10条/页</option>
            <option :value="20">20条/页</option>
            <option :value="50">50条/页</option>
            <option :value="100">100条/页</option>
          </select>
          <button class="page-btn" :disabled="currentPage <= 1" @click="goToPage(1)" title="首页">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="11 17 6 12 11 7"/>
              <polyline points="18 17 13 12 18 7"/>
            </svg>
          </button>
          <button class="page-btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)" title="上一页">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span class="page-numbers">
            <button 
              v-for="page in displayPages" 
              :key="page"
              class="page-num"
              :class="{ active: page === currentPage, ellipsis: page === '...' }"
              @click="page !== '...' && goToPage(page)"
              :disabled="page === '...'"
            >
              {{ page }}
            </button>
          </span>
          <button class="page-btn" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)" title="下一页">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          <button class="page-btn" :disabled="currentPage >= totalPages" @click="goToPage(totalPages)" title="末页">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="13 17 18 12 13 7"/>
              <polyline points="6 17 11 12 6 7"/>
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
            <div class="detail-row" v-if="selectedAlert.endsAt && selectedAlert.startsAt">
              <span class="detail-label">持续时间</span>
              <span class="detail-value mono">{{ calculateDuration(selectedAlert.startsAt, selectedAlert.endsAt) }}</span>
            </div>
            <div class="detail-section" v-if="parsedLabels && Object.keys(parsedLabels).length > 0">
              <span class="detail-label">标签 (Labels)</span>
              <div class="tags-container">
                <span class="label-tag" v-for="(value, key) in parsedLabels" :key="key">
                  <span class="tag-key">{{ key }}</span>
                  <span class="tag-value">{{ value }}</span>
                </span>
              </div>
            </div>
            <div class="detail-section" v-if="parsedAnnotations && Object.keys(parsedAnnotations).length > 0">
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
            <button
              v-if="canAiopsRca && selectedAlert"
              type="button"
              class="btn btn-primary"
              @click="goAiopsRcaFromDetail"
            >
              智能诊断
            </button>
            <button class="btn btn-secondary" @click="showDetailModal = false">关闭</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import '../faultcenter/faultCenterCommon.css'
import http from '@/utils/http'
import { useUserStore } from '@/store/user'
import { ACCESS_LEVEL } from '@/constants/rbac'

const router = useRouter()
const userStore = useUserStore()
const canAiopsRca = computed(() => userStore.accessLevel >= ACCESS_LEVEL.ADMIN)

function goDashboard() {
  router.push({ name: 'Dashboard' })
}

const AIOPS_PREFILL_KEY = 'aiops_rca_prefill'

function goAiopsRca(alert) {
  sessionStorage.setItem(
    AIOPS_PREFILL_KEY,
    JSON.stringify({
      alertId: alert.id,
      alertName: alert.alertName,
      summary: alert.summary,
      description: alert.description,
      startsAt: alert.startsAt
    })
  )
  router.push('/aiops-rca')
}

function goAiopsRcaFromDetail() {
  if (!selectedAlert.value) return
  goAiopsRca(selectedAlert.value)
  showDetailModal.value = false
}

// API base URL
const API_BASE_URL = '/api/alerts'

// Alert stats - 从后端获取全局统计
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
const statusFilter = ref('')
const startTimeFilter = ref('')
const endTimeFilter = ref('')

// Pagination - 统一使用这些状态
const currentPage = ref(1)
const pageSize = ref(10)
const totalPages = computed(() => Math.ceil(alertData.value.total / pageSize.value) || 1)

// Modal
const showDetailModal = ref(false)
const selectedAlert = ref(null)

// Data
const alertData = ref({
  records: [],
  total: 0
})

const loading = ref(false)

// 搜索防抖定时器
let searchTimer = null

// 判断是否有激活的筛选条件
const hasActiveFilters = computed(() => {
  return searchQuery.value || severityFilter.value || statusFilter.value || startTimeFilter.value || endTimeFilter.value
})

// Computed - 优化的分页显示逻辑
const displayPages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value
  
  if (total <= 7) {
    // 总页数小于等于7，显示所有页码
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // 总页数大于7，使用省略号
    if (current <= 4) {
      // 当前页靠近开头
      for (let i = 1; i <= 5; i++) pages.push(i)
      pages.push('...')
      pages.push(total)
    } else if (current >= total - 3) {
      // 当前页靠近结尾
      pages.push(1)
      pages.push('...')
      for (let i = total - 4; i <= total; i++) pages.push(i)
    } else {
      // 当前页在中间
      pages.push(1)
      pages.push('...')
      for (let i = current - 1; i <= current + 1; i++) pages.push(i)
      pages.push('...')
      pages.push(total)
    }
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
  if (status === 'resolved' || endsAt) {
    return '已解决'
  }
  return '活动中'
}

const getStatusClass = (alert) => {
  if (alert.status === 'resolved' || alert.endsAt) {
    return 'resolved'
  }
  return 'active'
}

const formatTime = (dateString) => {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
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

// 计算持续时间
const calculateDuration = (startTime, endTime) => {
  try {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const diff = end - start
    
    if (diff < 0) return '-'
    
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) {
      return `${days}天 ${hours % 24}小时 ${minutes % 60}分钟`
    } else if (hours > 0) {
      return `${hours}小时 ${minutes % 60}分钟`
    } else if (minutes > 0) {
      return `${minutes}分钟 ${seconds % 60}秒`
    } else {
      return `${seconds}秒`
    }
  } catch {
    return '-'
  }
}

// 格式化时间参数用于API请求
const formatTimeForAPI = (dateString) => {
  if (!dateString) return null
  try {
    // datetime-local 格式: "2024-01-01T10:00"
    // 转换为 ISO 格式或后端需要的格式
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return null
    return date.toISOString()
  } catch {
    return null
  }
}

// 加载告警数据
const loadAlerts = async () => {
  loading.value = true
  try {
    const params = {
      pageNum: currentPage.value,
      pageSize: pageSize.value
    }

    // 添加搜索条件
    if (searchQuery.value?.trim()) {
      params.alertName = searchQuery.value.trim()
    }
    if (severityFilter.value) {
      params.severity = severityFilter.value
    }
    if (statusFilter.value) {
      params.status = statusFilter.value
    }
    
    // 格式化时间参数
    const formattedStartTime = formatTimeForAPI(startTimeFilter.value)
    const formattedEndTime = formatTimeForAPI(endTimeFilter.value)
    
    if (formattedStartTime) {
      params.startTime = formattedStartTime
    }
    if (formattedEndTime) {
      params.endTime = formattedEndTime
    }

    const response = await http.get(`${API_BASE_URL}/history`, { params })
    
    // 处理分页数据结构
    alertData.value = {
      records: response.data.records || [],
      total: response.data.total || 0
    }

    // 如果当前页超过总页数，重置到最后一页
    if (currentPage.value > totalPages.value && totalPages.value > 0) {
      currentPage.value = totalPages.value
    }

    // 加载统计数据（单独接口或从响应中获取）
    await loadStats()
    
  } catch (error) {
    console.error('加载告警失败:', error)
    alertData.value = {
      records: [],
      total: 0
    }
  } finally {
    loading.value = false
  }
}

// 单独加载统计数据 - 全局统计，不受当前页影响
const loadStats = async () => {
  try {
    // 方案1: 如果后端有单独的统计接口
    // const response = await http.get(`${API_BASE_URL}/stats`)
    // updateStatsFromServer(response.data)
    
    // 方案2: 如果后端在分页接口中返回统计数据
    // 假设后端返回 { records, total, stats: { critical, warning, info, resolved } }
    
    // 方案3: 临时方案 - 请求全部数据的统计（仅用于演示，生产环境应使用后端统计）
    const response = await http.get(`${API_BASE_URL}/stats`)
    if (response.data) {
      updateStatsFromServer(response.data)
    }
  } catch (error) {
    // 如果统计接口不存在，使用当前页数据（不推荐）
    console.warn('统计接口调用失败，使用当前页数据统计:', error)
    updateStatsFromCurrentPage()
  }
}

// 从服务器统计数据更新
const updateStatsFromServer = (stats) => {
  alertStats.value.forEach(stat => {
    if (stats[stat.type] !== undefined) {
      stat.count = stats[stat.type]
    }
  })
}

// 从当前页数据更新统计（备用方案）
const updateStatsFromCurrentPage = () => {
  const stats = {
    critical: 0,
    warning: 0,
    info: 0,
    resolved: 0
  }

  alertData.value.records.forEach(alert => {
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
    stat.count = stats[stat.type] || 0
  })
}

// 通过点击统计卡片筛选
const filterBySeverity = (type) => {
  if (type === 'resolved') {
    severityFilter.value = ''
    statusFilter.value = statusFilter.value === 'resolved' ? '' : 'resolved'
  } else {
    statusFilter.value = ''
    severityFilter.value = severityFilter.value === type ? '' : type
  }
  // 重置页码并加载 - watch 会自动触发
}

// 重置所有筛选条件
const resetFilters = () => {
  searchQuery.value = ''
  severityFilter.value = ''
  statusFilter.value = ''
  startTimeFilter.value = ''
  endTimeFilter.value = ''
  currentPage.value = 1
  loadAlerts()
}

// 搜索处理（回车触发）
const handleSearch = () => {
  currentPage.value = 1
  loadAlerts()
}

// 跳转到指定页
const goToPage = (page) => {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return
  currentPage.value = page
}

// 查看详情
const viewDetail = (alert) => {
  selectedAlert.value = alert
  showDetailModal.value = true
}

// 导出告警
const exportAlerts = async () => {
  if (!alertData.value.records || alertData.value.records.length === 0) {
    alert('暂无数据可导出')
    return
  }

  try {
    // 获取所有符合当前筛选条件的数据用于导出
    const params = {
      pageNum: 1,
      pageSize: alertData.value.total || 1000 // 导出全部
    }
    
    if (searchQuery.value?.trim()) {
      params.alertName = searchQuery.value.trim()
    }
    if (severityFilter.value) {
      params.severity = severityFilter.value
    }
    if (statusFilter.value) {
      params.status = statusFilter.value
    }
    if (startTimeFilter.value) {
      params.startTime = formatTimeForAPI(startTimeFilter.value)
    }
    if (endTimeFilter.value) {
      params.endTime = formatTimeForAPI(endTimeFilter.value)
    }

    const response = await http.get(`${API_BASE_URL}/history`, { params })
    const exportData = response.data.records || alertData.value.records

    // 构建CSV数据（添加BOM以支持中文）
    const BOM = '\uFEFF'
    const headers = ['告警ID', '告警名称', '级别', '摘要', '描述', '触发时间', '恢复时间', '状态', '持续时间']
    const rows = exportData.map(alert => [
      alert.id,
      alert.alertName,
      getSeverityLabel(alert.severity),
      (alert.summary || '').replace(/"/g, '""'), // 处理CSV特殊字符
      (alert.description || '').replace(/"/g, '""'),
      formatTime(alert.startsAt),
      alert.endsAt ? formatTime(alert.endsAt) : '-',
      getStatusLabel(alert.status, alert.endsAt),
      alert.endsAt ? calculateDuration(alert.startsAt, alert.endsAt) : '-'
    ])

    const csv = BOM + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // 下载CSV文件
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
    link.setAttribute('href', url)
    link.setAttribute('download', `alerts_export_${timestamp}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url) // 释放内存
  } catch (error) {
    console.error('导出失败:', error)
    alert('导出失败，请稍后重试')
  }
}

// Watch - 监听筛选条件变化
// 搜索框防抖处理
watch(searchQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    loadAlerts()
  }, 300)
})

// 下拉筛选立即触发
watch([severityFilter, statusFilter, startTimeFilter, endTimeFilter], () => {
  currentPage.value = 1
  loadAlerts()
})

// 分页变化
watch(currentPage, () => {
  loadAlerts()
})

// 每页条数变化
watch(pageSize, () => {
  currentPage.value = 1
  loadAlerts()
})

// Lifecycle
onMounted(() => {
  loadAlerts()
})

// 清理定时器
onUnmounted(() => {
  clearTimeout(searchTimer)
})
</script>

<style scoped>
.alert-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  /* 低饱和告警语义色，避免花绿/亮青 */
  --sev-critical: #8b3f48;
  --sev-warning: #735c2e;
  --sev-info: #4a5f73;
  --sev-resolved: #3f5a50;
  --alert-focus: #4a5f78;
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
  transform: translateY(-1px);
  border-color: var(--border-strong);
  box-shadow: var(--shadow-sm);
}

.alert-stat-card.active {
  border-color: var(--card-color);
  box-shadow: 0 0 0 1px var(--card-color);
}

.alert-stat-card.critical { --card-color: var(--sev-critical); }
.alert-stat-card.warning { --card-color: var(--sev-warning); }
.alert-stat-card.info { --card-color: var(--sev-info); }
.alert-stat-card.resolved { --card-color: var(--sev-resolved); }

.alert-stat-icon {
  width: 52px;
  height: 52px;
  margin: 0 auto 14px;
  background: var(--bg-subtle);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--card-color);
}

.alert-stat-value {
  font-size: 30px;
  font-weight: 600;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.alert-stat-label {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 6px;
  font-weight: 500;
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
  align-items: center;
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
  border-color: var(--alert-focus);
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
  min-width: 120px;
}

.filter-select:focus {
  outline: none;
  border-color: var(--alert-focus);
}

.filter-select option {
  background: var(--bg-secondary);
}

.action-group {
  display: flex;
  gap: 12px;
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
  background: var(--brand-600);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: var(--brand-700);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover:not(:disabled) {
  border-color: var(--border-strong);
  color: var(--text-secondary);
  background: var(--bg-subtle);
}

.btn-text {
  background: transparent;
  color: var(--text-muted);
  padding: 8px 12px;
}

.btn-text:hover {
  color: var(--text-primary);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Spinning animation for refresh button */
.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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
  grid-template-columns: 80px 1fr 150px 150px 150px 100px 80px;
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
  grid-template-columns: 80px 1fr 150px 150px 150px 100px 80px;
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
  background: var(--bg-subtle);
}

/* Badges */
.severity-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.severity-badge.critical {
  background: #e8d4d6;
  color: #5c2a30;
  border: 1px solid #d4bcbf;
}

.severity-badge.warning {
  background: #e8e2d4;
  color: #5c4a26;
  border: 1px solid #d4cdb8;
}

.severity-badge.info {
  background: #dbe3e8;
  color: #3d4f5f;
  border: 1px solid #c5d0d8;
}

.status-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.status-badge.active {
  background: #e5dcd8;
  color: #5c3d38;
  border: 1px solid #d0c4bf;
}

.status-badge.resolved {
  background: #dde5e1;
  color: #3d5248;
  border: 1px solid #c5d1cc;
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
  background: var(--border-strong);
  color: var(--text-primary);
}

.icon-btn.aiops-btn:hover {
  background: #d8e0eb;
  color: var(--brand-800);
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
  border-top-color: var(--brand-600);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  flex-wrap: wrap;
  gap: 12px;
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

.page-size-select {
  padding: 6px 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
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
  border-color: var(--border-strong);
  color: var(--text-primary);
  background: var(--bg-subtle);
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
  min-width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;
  padding: 0 8px;
}

.page-num:hover:not(.ellipsis) {
  background: var(--bg-tertiary);
}

.page-num.active {
  background: var(--brand-700);
  color: #fff;
}

.page-num.ellipsis {
  cursor: default;
  color: var(--text-muted);
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
  max-width: 400px;
  word-break: break-word;
}

.detail-value.mono {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  color: var(--text-secondary);
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
  white-space: pre-wrap;
  word-break: break-word;
}

.tags-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label-tag {
  display: flex;
  align-items: flex-start;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  font-size: 12px;
  gap: 8px;
}

.tag-key {
  color: var(--text-muted);
  font-weight: 600;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  flex-shrink: 0;
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

/* Responsive */
@media (max-width: 1400px) {
  .alert-overview {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 1200px) {
  .alert-list-header,
  .alert-item {
    grid-template-columns: 70px 1fr 120px 100px 80px;
  }
  .header-cell.time:nth-of-type(5),
  .time-cell:nth-of-type(5) {
    display: none;
  }
  .name-cell {
    display: none;
  }
}

@media (max-width: 900px) {
  .alert-list-header,
  .alert-item {
    grid-template-columns: 70px 1fr 100px 80px;
  }
  .header-cell.time:nth-of-type(4),
  .time-cell:nth-of-type(4) {
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

  .filter-select {
    width: 100%;
  }

  .action-group {
    flex-direction: column;
  }

  .alert-overview {
    grid-template-columns: repeat(2, 1fr);
  }

  .detail-modal {
    width: 95%;
    max-width: 600px;
  }

  .pagination {
    flex-direction: column;
    gap: 16px;
  }

  .pagination-controls {
    flex-wrap: wrap;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .alert-overview {
    grid-template-columns: 1fr;
  }

  .alert-list-header,
  .alert-item {
    grid-template-columns: 60px 1fr 80px;
  }

  .header-cell.status,
  .status-cell,
  .actions-cell {
    display: none;
  }
}
</style>