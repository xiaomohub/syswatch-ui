<template>
  <div class="dashboard">
    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card" v-for="stat in stats" :key="stat.label" :class="stat.color">
        <div class="stat-header">
          <div class="stat-icon" v-html="stat.icon"></div>
          <span class="stat-trend" :class="stat.trend.type" v-if="stat.trend.value !== '0%'">
            <svg v-if="stat.trend.type === 'up'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
            <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
            {{ stat.trend.value }}
          </span>
        </div>
        <div class="stat-value">{{ stat.value }}</div>
        <div class="stat-label">{{ stat.label }}</div>
        <div class="stat-progress">
          <div 
            class="stat-progress-bar" 
            :style="{ width: stat.progress + '%' }"
            :class="getProgressClass(stat.progress, stat.label)"
          ></div>
        </div>
        <div class="stat-threshold" v-if="stat.progress > 0">
          <span :class="getThresholdClass(stat.progress)">
            {{ getThresholdText(stat.progress) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <button class="action-btn" @click="refreshData" :disabled="refreshing">
        <svg 
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          :class="{ spinning: refreshing }"
        >
          <polyline points="23 4 23 10 17 10"/>
          <polyline points="1 20 1 14 7 14"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        {{ refreshing ? '刷新中...' : '刷新数据' }}
      </button>
      <button class="action-btn" :class="{ active: autoRefresh }" @click="toggleAutoRefresh">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        {{ autoRefresh ? '关闭自动刷新' : '开启自动刷新' }}
        <span class="refresh-indicator" v-if="autoRefresh">
          {{ refreshCountdown }}s
        </span>
      </button>
      <div class="last-update" v-if="lastUpdateTime">
        最后更新: {{ formatLastUpdate(lastUpdateTime) }}
      </div>
    </div>

    <!-- Error Alert -->
    <div class="error-alert" v-if="errorMessage">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>{{ errorMessage }}</span>
      <button class="error-close" @click="errorMessage = ''">×</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'

const PROMETHEUS_API = 'http://localhost:9099/api/v1/query'
const REFRESH_INTERVAL = 30000

const stats = ref([
  { 
    label: 'CPU 使用率', 
    value: '--', 
    progress: 0, 
    trend: { type: 'up', value: '0%' }, 
    color: 'cyan', 
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>',
    prevValue: 0
  },
  { 
    label: '内存使用率', 
    value: '--', 
    progress: 0, 
    trend: { type: 'down', value: '0%' }, 
    color: 'green', 
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 19v-3m4 3v-6m4 6V9m4 10V5"/></svg>',
    prevValue: 0
  },
  { 
    label: '磁盘使用率', 
    value: '--', 
    progress: 0, 
    trend: { type: 'up', value: '0%' }, 
    color: 'yellow', 
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
    prevValue: 0
  },
  { 
    label: '网络流量', 
    value: '--', 
    progress: 0, 
    trend: { type: 'up', value: '0%' }, 
    color: 'purple', 
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>',
    prevValue: 0
  }
])

const refreshing = ref(false)
const autoRefresh = ref(true)
const refreshCountdown = ref(30)
const lastUpdateTime = ref(null)
const errorMessage = ref('')

let refreshInterval = null
let countdownInterval = null

const getProgressClass = (progress, label) => {
  if (progress > 90) return 'danger'
  if (progress > 80) return 'warning'
  return ''
}

const getThresholdText = (progress) => {
  if (progress > 90) return '危险'
  if (progress > 80) return '警告'
  if (progress > 60) return '正常'
  return '良好'
}

const getThresholdClass = (progress) => {
  if (progress > 90) return 'danger'
  if (progress > 80) return 'warning'
  if (progress > 60) return 'normal'
  return 'good'
}

const formatLastUpdate = (date) => {
  if (!date) return ''
  const now = new Date()
  const diff = Math.floor((now - date) / 1000)
  
  if (diff < 10) return '刚刚'
  if (diff < 60) return `${diff}秒前`
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i]
}

const fetchStats = async () => {
  refreshing.value = true
  errorMessage.value = ''
  
  try {
    const queries = [
      '100 * (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[30s])))',
      '1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)',
      'avg((node_filesystem_size_bytes{fstype!="tmpfs"} - node_filesystem_free_bytes{fstype!="tmpfs"}) / node_filesystem_size_bytes{fstype!="tmpfs"}) * 100',
      'sum(rate(node_network_receive_bytes_total{device!~"lo|veth.*|docker.*|br-.*"}[1m]))'
    ]

    const results = await Promise.all(
      queries.map(query =>
        axios.get(PROMETHEUS_API, { 
          params: { query },
          timeout: 10000 
        })
      )
    )

    if (results[0].data?.data?.result?.length) {
      const newValue = Math.max(0, Math.min(100, parseFloat(results[0].data.data.result[0].value[1])))
      const prevValue = stats.value[0].prevValue
      const diff = newValue - prevValue
      
      stats.value[0].progress = newValue
      stats.value[0].value = newValue.toFixed(1) + '%'
      stats.value[0].trend = {
        type: diff >= 0 ? 'up' : 'down',
        value: Math.abs(diff).toFixed(1) + '%'
      }
      stats.value[0].prevValue = newValue
    }

    if (results[1].data?.data?.result?.length) {
      const rawValue = parseFloat(results[1].data.data.result[0].value[1])
      const newValue = Math.max(0, Math.min(100, rawValue * 100))
      const prevValue = stats.value[1].prevValue
      const diff = newValue - prevValue
      
      stats.value[1].progress = newValue
      stats.value[1].value = newValue.toFixed(1) + '%'
      stats.value[1].trend = {
        type: diff >= 0 ? 'up' : 'down',
        value: Math.abs(diff).toFixed(1) + '%'
      }
      stats.value[1].prevValue = newValue
    }

    if (results[2].data?.data?.result?.length) {
      const newValue = Math.max(0, Math.min(100, parseFloat(results[2].data.data.result[0].value[1])))
      const prevValue = stats.value[2].prevValue
      const diff = newValue - prevValue
      
      stats.value[2].progress = newValue
      stats.value[2].value = newValue.toFixed(1) + '%'
      stats.value[2].trend = {
        type: diff >= 0 ? 'up' : 'down',
        value: Math.abs(diff).toFixed(1) + '%'
      }
      stats.value[2].prevValue = newValue
    }

    if (results[3].data?.data?.result?.length) {
      const bytesPerSec = parseFloat(results[3].data.data.result[0].value[1])
      const prevValue = stats.value[3].prevValue
      const diff = bytesPerSec - prevValue
      
      stats.value[3].value = formatBytes(bytesPerSec) + '/s'
      stats.value[3].progress = Math.min(100, (bytesPerSec / (100 * 1024 * 1024)) * 100)
      stats.value[3].trend = {
        type: diff >= 0 ? 'up' : 'down',
        value: formatBytes(Math.abs(diff)) + '/s'
      }
      stats.value[3].prevValue = bytesPerSec
    }

    lastUpdateTime.value = new Date()

  } catch (err) {
    console.error('获取 Prometheus 数据失败:', err)
    errorMessage.value = '获取监控数据失败，请检查 Prometheus 连接'
  } finally {
    refreshing.value = false
  }
}

const refreshData = async () => {
  await fetchStats()
  resetCountdown()
}

const resetCountdown = () => {
  refreshCountdown.value = REFRESH_INTERVAL / 1000
}

const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value
  
  if (autoRefresh.value) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
}

const startAutoRefresh = () => {
  stopAutoRefresh()
  resetCountdown()
  
  countdownInterval = setInterval(() => {
    refreshCountdown.value--
    if (refreshCountdown.value <= 0) {
      resetCountdown()
    }
  }, 1000)
  
  refreshInterval = setInterval(() => {
    refreshData()
  }, REFRESH_INTERVAL)
}

const stopAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
}

onMounted(async () => {
  await refreshData()

  if (autoRefresh.value) {
    startAutoRefresh()
  }
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--card-accent), transparent);
}

.stat-card:hover {
  transform: translateY(-4px);
  border-color: var(--card-accent);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.stat-card.cyan { --card-accent: var(--accent-cyan); }
.stat-card.green { --card-accent: var(--accent-green); }
.stat-card.yellow { --card-accent: var(--accent-yellow); }
.stat-card.purple { --card-accent: var(--accent-purple); }

.stat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, var(--card-accent), transparent);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--card-accent);
}

.stat-icon :deep(svg) {
  width: 24px;
  height: 24px;
}

.stat-trend {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 500;
}

.stat-trend.up {
  background: rgba(16, 185, 129, 0.15);
  color: var(--accent-green);
}

.stat-trend.down {
  background: rgba(239, 68, 68, 0.15);
  color: var(--accent-red);
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.stat-progress {
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
}

.stat-progress-bar {
  height: 100%;
  background: var(--card-accent);
  border-radius: 2px;
  transition: width 0.5s ease;
}

.stat-progress-bar.warning {
  background: var(--accent-yellow);
}

.stat-progress-bar.danger {
  background: var(--accent-red);
}

.stat-threshold {
  margin-top: 8px;
  font-size: 11px;
  text-align: right;
}

.stat-threshold .good { color: var(--accent-green); }
.stat-threshold .normal { color: var(--accent-cyan); }
.stat-threshold .warning { color: var(--accent-yellow); }
.stat-threshold .danger { color: var(--accent-red); }

.quick-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover:not(:disabled) {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-color: var(--accent-cyan);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-btn.active {
  border-color: var(--accent-green);
  color: var(--accent-green);
}

.refresh-indicator {
  background: var(--accent-green);
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  margin-left: 4px;
}

.last-update {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-muted);
}

.error-alert {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 10px;
  color: var(--accent-red);
}

.error-alert svg {
  flex-shrink: 0;
}

.error-alert span {
  flex: 1;
}

.error-close {
  background: none;
  border: none;
  color: var(--accent-red);
  font-size: 20px;
  cursor: pointer;
  padding: 0 8px;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 1400px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 900px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  .quick-actions {
    flex-direction: column;
    align-items: stretch;
  }
  .last-update {
    margin-left: 0;
    text-align: center;
  }
}
</style>
