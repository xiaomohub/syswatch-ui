<template>
  <div class="dashboard">
    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card" v-for="stat in stats" :key="stat.label" :class="stat.color">
        <div class="stat-header">
          <div class="stat-icon" v-html="stat.icon"></div>
          <span class="stat-trend" :class="stat.trend.type">
            {{ stat.trend.type === 'up' ? '↑' : '↓' }} {{ stat.trend.value }}
          </span>
        </div>
        <div class="stat-value">{{ stat.value }}</div>
        <div class="stat-label">{{ stat.label }}</div>
        <div class="stat-progress">
          <div class="stat-progress-bar" :style="{ width: stat.progress + '%' }"></div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <button class="action-btn" @click="refreshData">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"/>
          <polyline points="1 20 1 14 7 14"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        刷新数据
      </button>
      <button class="action-btn" @click="toggleAutoRefresh">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        {{ autoRefresh ? '关闭自动刷新' : '开启自动刷新' }}
      </button>
      <button class="action-btn primary" @click="openGrafana">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
        打开 Grafana
      </button>
    </div>

    <!-- Grafana Section -->
    <div class="grafana-section">
      <div class="section-header">
        <div class="section-title">
          <svg class="section-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          <span>Grafana 全量监控</span>
        </div>
        <div class="section-actions">
          <select class="time-select" v-model="timeRange">
            <option value="now-1h">最近 1 小时</option>
            <option value="now-6h">最近 6 小时</option>
            <option value="now-24h">最近 24 小时</option>
            <option value="now-7d">最近 7 天</option>
            <option value="now-30d">最近 30 天</option>
          </select>
        </div>
      </div>
      <div class="grafana-wrapper">
        <iframe 
          class="grafana-frame"
          :src="grafanaUrl"
          @load="onGrafanaLoad"
        ></iframe>
        <div class="grafana-loading" v-if="grafanaLoading">
          <div class="loading-spinner"></div>
          <span>加载监控面板...</span>
        </div>
      </div>
    </div>

    <!-- Node Status -->
    <div class="nodes-section">
      <div class="section-header">
        <div class="section-title">
          <svg class="section-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
            <line x1="6" y1="6" x2="6.01" y2="6"/>
            <line x1="6" y1="18" x2="6.01" y2="18"/>
          </svg>
          <span>节点状态</span>
        </div>
      </div>
      <div class="nodes-grid">
        <div class="node-card" v-for="node in nodes" :key="node.id" :class="{ 'offline': !node.online }">
          <div class="node-status">
            <span class="status-dot" :class="node.online ? 'online' : 'offline'"></span>
            <span class="status-text">{{ node.online ? '在线' : '离线' }}</span>
          </div>
          <div class="node-name">{{ node.name }}</div>
          <div class="node-ip">{{ node.ip }}</div>
          <div class="node-metrics">
            <div class="metric">
              <span class="metric-label">CPU</span>
              <span class="metric-value">{{ node.cpu }}%</span>
            </div>
            <div class="metric">
              <span class="metric-label">内存</span>
              <span class="metric-value">{{ node.memory }}%</span>
            </div>
            <div class="metric">
              <span class="metric-label">磁盘</span>
              <span class="metric-value">{{ node.disk }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// Stats data
const stats = ref([
  {
    label: 'CPU 使用率',
    value: '45.8%',
    progress: 45.8,
    trend: { type: 'up', value: '2.3%' },
    color: 'cyan',
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>'
  },
  {
    label: '内存使用量',
    value: '12.4 GB',
    progress: 62,
    trend: { type: 'down', value: '1.2%' },
    color: 'green',
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 19v-3c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v3"/><path d="M3 7v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2z"/><path d="M8 5V3"/><path d="M16 5V3"/><path d="M12 5V3"/></svg>'
  },
  {
    label: '磁盘使用率',
    value: '67.2%',
    progress: 67.2,
    trend: { type: 'up', value: '0.5%' },
    color: 'yellow',
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>'
  },
  {
    label: '网络吞吐量',
    value: '1.2 Gbps',
    progress: 48,
    trend: { type: 'up', value: '5.8%' },
    color: 'purple',
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>'
  }
])

// Nodes data
const nodes = ref([
  { id: 1, name: 'Node-01', ip: '172.17.0.1:9100', cpu: 45, memory: 62, disk: 58, online: true },
  { id: 2, name: 'Node-02', ip: '172.17.0.2:9100', cpu: 78, memory: 71, disk: 45, online: true },
  { id: 3, name: 'Node-03', ip: '172.17.0.3:9100', cpu: 23, memory: 45, disk: 82, online: true },
  { id: 4, name: 'Node-04', ip: '172.17.0.4:9100', cpu: 0, memory: 0, disk: 0, online: false },
])

// Grafana config
const timeRange = ref('now-24h')
const grafanaLoading = ref(true)
const autoRefresh = ref(true)

const grafanaUrl = computed(() => {
  return `http://localhost:3000/d/rYdddlPWk/node-exporter-full?orgId=1&from=${timeRange.value}&to=now&timezone=browser&var-ds_prometheus=cfa7q0bpjwmbkb&var-job=node&var-nodename=58cf0d1d79b9&var-node=172.17.0.1:9100&refresh=1m`
})

const onGrafanaLoad = () => {
  grafanaLoading.value = false
}

const refreshData = () => {
  grafanaLoading.value = true
  // 模拟数据刷新
  setTimeout(() => {
    grafanaLoading.value = false
  }, 1000)
}

const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value
}

const openGrafana = () => {
  window.open('http://localhost:3000/?orgId=1&from=now-6h&to=now&timezone=browser', '_blank')
}

// Auto refresh
let refreshInterval
onMounted(() => {
  if (autoRefresh.value) {
    refreshInterval = setInterval(() => {
      // 更新统计数据
      stats.value = stats.value.map(stat => ({
        ...stat,
        progress: Math.min(100, Math.max(0, stat.progress + (Math.random() - 0.5) * 5))
      }))
    }, 5000)
  }
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* Stats Grid */
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

/* Quick Actions */
.quick-actions {
  display: flex;
  gap: 12px;
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

.action-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-color: var(--accent-cyan);
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--accent-cyan), #0891b2);
  border-color: transparent;
  color: white;
  box-shadow: 0 4px 16px var(--accent-cyan-glow);
}

.action-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px var(--accent-cyan-glow);
}

/* Grafana Section */
.grafana-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  font-weight: 600;
}

.section-icon {
  color: var(--accent-cyan);
}

.time-select {
  padding: 10px 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
}

.time-select:focus {
  outline: none;
  border-color: var(--accent-cyan);
}

.time-select option {
  background: var(--bg-secondary);
}

.grafana-wrapper {
  position: relative;
  width: 100%;
  height: 650px;
}

.grafana-frame {
  width: 100%;
  height: 100%;
  border: none;
  background: var(--bg-primary);
}

.grafana-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: var(--bg-card);
  color: var(--text-muted);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent-cyan);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Nodes Section */
.nodes-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  overflow: hidden;
}

.nodes-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 24px;
}

.node-card {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s ease;
}

.node-card:hover {
  border-color: var(--accent-cyan);
}

.node-card.offline {
  opacity: 0.6;
}

.node-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.online {
  background: var(--accent-green);
  box-shadow: 0 0 8px var(--accent-green);
}

.status-dot.offline {
  background: var(--text-muted);
}

.status-text {
  font-size: 12px;
  color: var(--text-muted);
}

.node-name {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 4px;
}

.node-ip {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.node-metrics {
  display: flex;
  gap: 16px;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-label {
  font-size: 11px;
  color: var(--text-muted);
}

.metric-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 500;
  color: var(--accent-cyan);
}

/* Responsive */
@media (max-width: 1400px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .nodes-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 900px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  .nodes-grid {
    grid-template-columns: 1fr;
  }
}
</style>