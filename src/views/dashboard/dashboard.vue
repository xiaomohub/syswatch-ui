<template>
  <div class="dashboard">
    <div class="dashboard-toolbar">
      <div v-if="upstreamError" class="dashboard-hint error">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <span>{{ upstreamError }}</span>
      </div>
      <div class="toolbar-actions">
        <template v-if="grafanaHome">
          <a :href="grafanaHome" class="btn-link" target="_blank" rel="noopener noreferrer">打开 Grafana</a>
          <a
            v-if="grafanaExplore"
            :href="grafanaExplore"
            class="btn-link secondary"
            target="_blank"
            rel="noopener noreferrer"
          >Explore</a>
        </template>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card" v-for="stat in stats" :key="stat.label" :class="stat.color">
        <div class="stat-header">
          <div class="stat-icon" v-html="stat.icon"></div>
        </div>
        <div class="stat-value" :class="{ dim: stat.raw == null }">{{ stat.value }}</div>
        <div class="stat-label">{{ stat.label }}</div>
        <div class="stat-progress">
          <div class="stat-progress-bar" :style="{ width: stat.progress + '%' }"></div>
        </div>
      </div>
    </div>

    <p v-if="overviewMessage" class="overview-message">{{ overviewMessage }}</p>

    <section class="monitors-section" v-if="monitorEntries.length > 0">
      <h2 class="section-title">监控入口</h2>
      <p class="section-desc">新标签页打开。</p>
      <ul class="monitor-list">
        <li v-for="m in monitorEntries" :key="m.id || m.url">
          <button type="button" class="monitor-row" @click="openExternal(m.url)">
            <div class="monitor-main">
              <span class="monitor-title">{{ m.title || '未命名' }}</span>
              <span v-if="m.description" class="monitor-sub">{{ m.description }}</span>
            </div>
            <span v-if="m.badge" class="monitor-badge">{{ m.badge }}</span>
            <svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </li>
      </ul>
    </section>

    <p v-if="asOfText" class="as-of">数据时间：{{ asOfText }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { fetchDashboardOverview, unwrapOverviewPayload } from '@/api/dashboard'

const AUTOREFRESH_MS = 10_000

const loading = ref(false)
const upstreamError = ref('')
const overviewMessage = ref('')
const grafanaHome = ref('')
const grafanaExplore = ref('')
const asOfText = ref('')

/** 监控入口：前端维护，不读接口 `monitors`（与大盘指标请求无关）。 */
const DEFAULT_MONITOR_ENTRIES = [
  {
    id: 'mysql-monitor-cn-v1',
    title: 'MySQL 监控',
    description: 'Grafana 大盘',
    url: 'http://10.0.0.1:3000/d/mysql-monitor-cn-v1',
    badge: 'MySQL'
  },
  {
    id: 'pgsql-monitor-cn-v1',
    title: 'PostgreSQL 监控',
    description: 'Grafana 大盘',
    url: 'http://10.0.0.1:3000/d/pgsql-monitor-cn-v1/',
    badge: 'PG'
  },
  {
    id: 'kafka-monitor-cn-v1',
    title: 'Kafka 监控',
    description: 'Grafana 大盘',
    url: 'http://10.0.0.1:3000/d/kafka-monitor-cn-v1/',
    badge: 'Kafka'
  },
  {
    id: 'cvm-monitor-cn-v1',
    title: 'CVM 监控',
    description: 'Grafana 大盘',
    url: 'http://10.0.0.1:3000/d/cvm-monitor-cn-v1/',
    badge: 'CVM'
  }
]

const monitorEntries = ref(DEFAULT_MONITOR_ENTRIES.map((x) => ({ ...x })))

const statIcons = {
  cpu: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>',
  mem: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 19v-3m4 3v-6m4 6V9m4 10V5"/></svg>',
  disk: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
  net: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>'
}

function buildStatRows() {
  return [
    { key: 'cpu', label: 'CPU 使用率', value: '—', progress: 0, raw: null, color: 'cyan', icon: statIcons.cpu },
    { key: 'mem', label: '内存使用率', value: '—', progress: 0, raw: null, color: 'green', icon: statIcons.mem },
    { key: 'disk', label: '磁盘使用率', value: '—', progress: 0, raw: null, color: 'yellow', icon: statIcons.disk },
    { key: 'net', label: '网络接收速率', value: '—', progress: 0, raw: null, color: 'purple', icon: statIcons.net }
  ]
}

const stats = ref(buildStatRows())

function formatBytes(bytes, decimals = 2) {
  if (bytes == null || Number.isNaN(bytes)) return '—'
  const n = Number(bytes)
  if (n === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(n) / Math.log(k)), sizes.length - 1)
  return `${parseFloat((n / k ** i).toFixed(decimals))} ${sizes[i]}`
}

function clampPct(x) {
  if (x == null || Number.isNaN(Number(x))) return null
  return Math.max(0, Math.min(100, Number(x)))
}

function applyMetrics(m) {
  overviewMessage.value = ''
  if (!m || typeof m !== 'object') return

  const cpu = clampPct(m.cpuPercent ?? m.cpu)
  const mem = clampPct(m.memoryPercent ?? m.memory)
  const disk = clampPct(m.diskPercent ?? m.disk)
  const netBps = m.networkBps ?? m.networkBytesPerSec ?? m.network
  const netNum = netBps != null && !Number.isNaN(Number(netBps)) ? Number(netBps) : null

  if (cpu == null && mem == null && disk == null && netNum == null && m.message != null && String(m.message).trim()) {
    overviewMessage.value = String(m.message).trim()
  }

  const rows = stats.value
  rows[0].raw = cpu
  rows[0].value = cpu != null ? `${cpu.toFixed(1)}%` : '—'
  rows[0].progress = cpu ?? 0

  rows[1].raw = mem
  rows[1].value = mem != null ? `${mem.toFixed(1)}%` : '—'
  rows[1].progress = mem ?? 0

  rows[2].raw = disk
  rows[2].value = disk != null ? `${disk.toFixed(1)}%` : '—'
  rows[2].progress = disk ?? 0

  rows[3].raw = netNum
  rows[3].value = netNum != null ? `${formatBytes(netNum)}/s` : '—'
  rows[3].progress = netNum != null ? Math.min(100, (netNum / (100 * 1024 * 1024)) * 100) : 0

  if (m.asOf) {
    try {
      asOfText.value = new Date(m.asOf).toLocaleString('zh-CN')
    } catch {
      asOfText.value = String(m.asOf)
    }
  } else {
    asOfText.value = ''
  }
}

function openExternal(url) {
  if (!url || typeof url !== 'string') return
  const trimmed = url.trim()
  if (!trimmed) return
  try {
    const u = new URL(trimmed, window.location.origin)
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      window.open(u.href, '_blank', 'noopener,noreferrer')
      return
    }
  } catch {
    /* fall through */
  }
  if (trimmed.startsWith('/')) {
    window.open(`${window.location.origin}${trimmed}`, '_blank', 'noopener,noreferrer')
  }
}

function applyGrafanaFromOverview(data) {
  grafanaHome.value = ''
  grafanaExplore.value = ''
  if (!data || typeof data !== 'object') return
  const g = data.grafana
  if (g && typeof g === 'object' && typeof g.homeUrl === 'string' && g.homeUrl.trim()) {
    grafanaHome.value = g.homeUrl.trim()
    grafanaExplore.value = typeof g.exploreUrl === 'string' && g.exploreUrl.trim() ? g.exploreUrl.trim() : ''
  }
}

function overviewErrorMessage(err, status) {
  const body = err?.response?.data
  if (body && typeof body === 'object') {
    if (typeof body.error === 'string' && body.error.trim()) return body.error.trim()
    if (typeof body.message === 'string' && body.message.trim()) return body.message.trim()
  }
  if (status === 502) return '指标上游不可用（HTTP 502），请检查后端到 Prometheus / VM 的网络与配置。'
  if (typeof err?.message === 'string' && err.message) return err.message
  return '加载大盘数据失败，请稍后重试。'
}

async function loadOverview() {
  if (loading.value) return
  loading.value = true
  upstreamError.value = ''
  overviewMessage.value = ''
  try {
    const res = await fetchDashboardOverview()
    const data = unwrapOverviewPayload(res)
    stats.value = buildStatRows()
    applyMetrics(data || {})
    applyGrafanaFromOverview(data || {})
  } catch (e) {
    const status = e?.response?.status
    upstreamError.value = overviewErrorMessage(e, status)
    stats.value = buildStatRows()
    grafanaHome.value = ''
    grafanaExplore.value = ''
    asOfText.value = ''
    overviewMessage.value = ''
  } finally {
    loading.value = false
  }
}

let refreshTimer = null

onMounted(() => {
  loadOverview()
  refreshTimer = window.setInterval(() => {
    loadOverview()
  }, AUTOREFRESH_MS)
})

onUnmounted(() => {
  if (refreshTimer != null) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.dashboard-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.dashboard-hint {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
  min-width: 220px;
  padding: 14px 18px;
  background: var(--brand-50);
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border-default));
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.55;
}

.dashboard-hint.error {
  background: var(--danger-50);
  border-color: color-mix(in srgb, var(--danger-600) 22%, var(--border-default));
  color: var(--danger-700);
}

.dashboard-hint.error svg {
  color: var(--danger-700);
}

.overview-message {
  margin: 0;
  padding: 12px 16px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
  background: var(--bg-subtle);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
}

.dashboard-hint svg {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--brand-700);
}

.dashboard-hint code {
  font-size: 12px;
  color: var(--text-muted);
}

.toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.btn-link {
  display: inline-flex;
  align-items: center;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  background: var(--brand-600);
  color: #fff;
  border: none;
  transition: background 0.15s ease;
}

.btn-link:hover {
  background: var(--brand-700);
  color: #fff;
}

.btn-link.secondary {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}

.btn-link.secondary:hover {
  border-color: var(--border-strong);
  background: var(--bg-subtle);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 22px;
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
  box-shadow: var(--shadow-sm);
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--card-accent);
  opacity: 0.85;
}

.stat-card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-md);
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
  width: 44px;
  height: 44px;
  background: var(--bg-subtle);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--card-accent);
}

.stat-icon :deep(svg) {
  width: 24px;
  height: 24px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.stat-value.dim {
  color: var(--text-muted);
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
  opacity: 0.55;
  transition: width 0.5s ease;
}

.monitors-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px 22px 12px;
  box-shadow: var(--shadow-sm);
}

.section-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.section-desc {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.monitor-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.monitor-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 12px;
  margin-bottom: 4px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.monitor-row:hover {
  border-color: var(--border-strong);
  background: var(--bg-subtle);
}

.monitor-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.monitor-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.monitor-sub {
  font-size: 12px;
  color: var(--text-muted);
}

.monitor-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--brand-600) 12%, var(--bg-card));
  color: var(--brand-800);
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border-default));
}

.chev {
  flex-shrink: 0;
  color: var(--text-muted);
}

.as-of {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
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
}
</style>
