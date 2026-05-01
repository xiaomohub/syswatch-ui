<template>
  <div class="fault-page">
    <!-- Overview -->
    <div class="fault-overview">
      <div
        class="fault-stat-card"
        v-for="stat in statCards"
        :key="stat.key"
        :class="[stat.key, { active: statusFilter === stat.key }]"
        @click="toggleStatus(stat.key)"
      >
        <div class="fault-stat-icon" v-html="stat.icon"></div>
        <div class="fault-stat-value">{{ stat.value }}</div>
        <div class="fault-stat-label">{{ stat.label }}</div>
      </div>
    </div>

    <!-- Filters & Actions -->
    <div class="fault-toolbar">
      <div class="filter-group">
        <div class="search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            class="search-input"
            placeholder="搜索故障标题 / 服务 / 主机..."
            v-model="searchQuery"
            @keyup.enter="loadIncidents"
          >
        </div>

        <select class="filter-select" v-model="severityFilter">
          <option value="">全部级别</option>
          <option value="P0">P0</option>
          <option value="P1">P1</option>
          <option value="P2">P2</option>
          <option value="P3">P3</option>
        </select>

        <select class="filter-select" v-model="statusFilter">
          <option value="">全部状态</option>
          <option value="open">未处理</option>
          <option value="ack">已确认</option>
          <option value="in_progress">处理中</option>
          <option value="resolved">已恢复</option>
        </select>

        <input type="datetime-local" class="filter-select" v-model="startTimeFilter">
        <input type="datetime-local" class="filter-select" v-model="endTimeFilter">

        <button class="btn btn-text" v-if="hasActiveFilters" @click="resetFilters">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          清除筛选
        </button>
      </div>

      <div class="action-group">
        <button class="btn btn-secondary" @click="loadIncidents" :disabled="loading">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ spinning: loading }">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          {{ loading ? '加载中...' : '刷新' }}
        </button>
      </div>
    </div>

    <!-- List -->
    <div class="fault-list-section">
      <div class="fault-list-header">
        <span class="header-cell sev">级别</span>
        <span class="header-cell title">故障</span>
        <span class="header-cell svc">服务</span>
        <span class="header-cell time">发生时间</span>
        <span class="header-cell status">状态</span>
        <span class="header-cell actions">操作</span>
      </div>

      <div class="fault-list">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>

        <div v-else-if="incidents.records.length === 0" class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <path d="M12 2a10 10 0 1 0 10 10"/>
            <path d="M12 8v5"/>
            <path d="M12 16h.01"/>
          </svg>
          <p>暂无故障数据</p>
          <p class="muted">后端实现接口后即可显示（见 <code>docs/faultcenter-api.md</code>）。</p>
        </div>

        <div
          v-else
          class="fault-item"
          v-for="row in incidents.records"
          :key="row.id"
        >
          <div class="sev-cell">
            <span class="sev-badge" :class="row.severity">{{ row.severity || '-' }}</span>
          </div>
          <div class="title-cell">
            <div class="fault-title">{{ row.title || '-' }}</div>
            <div class="fault-desc">{{ row.summary || row.description || '-' }}</div>
          </div>
          <div class="svc-cell">
            <span class="tag-mono">{{ row.service || '-' }}</span>
          </div>
          <div class="time-cell">
            <span class="mono">{{ formatTime(row.startedAt) }}</span>
          </div>
          <div class="status-cell">
            <span class="status-badge" :class="row.status">{{ statusLabel(row.status) }}</span>
          </div>
          <div class="actions-cell">
            <button class="icon-btn" @click="openDetail(row)" title="查看详情">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div class="pagination" v-if="!loading && incidents.total > 0">
        <span class="pagination-info">
          共 {{ incidents.total }} 条，当前第 {{ currentPage }} / {{ totalPages }} 页
        </span>
        <div class="pagination-controls">
          <select class="page-size-select" v-model.number="pageSize">
            <option :value="10">10条/页</option>
            <option :value="20">20条/页</option>
            <option :value="50">50条/页</option>
          </select>
          <button class="page-btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">上一页</button>
          <button class="page-btn" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">下一页</button>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="detailVisible" @click.self="detailVisible = false">
        <div class="modal detail-modal">
          <div class="modal-header">
            <div class="modal-title">
              <span>故障详情</span>
              <code class="modal-sub" v-if="detail">{{ detail.id }}</code>
            </div>
            <button class="close-btn" @click="detailVisible = false">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="modal-body" v-if="detail">
            <div class="detail-grid">
              <div class="detail-row">
                <div class="k">标题</div>
                <div class="v">{{ detail.title || '-' }}</div>
              </div>
              <div class="detail-row">
                <div class="k">级别</div>
                <div class="v"><span class="sev-badge" :class="detail.severity">{{ detail.severity || '-' }}</span></div>
              </div>
              <div class="detail-row">
                <div class="k">状态</div>
                <div class="v"><span class="status-badge" :class="detail.status">{{ statusLabel(detail.status) }}</span></div>
              </div>
              <div class="detail-row">
                <div class="k">服务</div>
                <div class="v"><span class="tag-mono">{{ detail.service || '-' }}</span></div>
              </div>
              <div class="detail-row">
                <div class="k">发生时间</div>
                <div class="v mono">{{ formatTime(detail.startedAt) }}</div>
              </div>
              <div class="detail-row" v-if="detail.resolvedAt">
                <div class="k">恢复时间</div>
                <div class="v mono">{{ formatTime(detail.resolvedAt) }}</div>
              </div>
            </div>

            <div class="detail-section">
              <div class="k">描述</div>
              <p class="detail-text">{{ detail.description || detail.summary || '暂无描述' }}</p>
            </div>

            <div class="detail-section" v-if="detail.labels && Object.keys(detail.labels).length">
              <div class="k">标签</div>
              <div class="tags">
                <span class="label-tag" v-for="(v, k) in detail.labels" :key="k">
                  <span class="tag-key">{{ k }}</span>
                  <span class="tag-value">{{ v }}</span>
                </span>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" @click="detailVisible = false">关闭</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  fetchIncidents,
  fetchIncidentStats,
  fetchIncidentDetail,
  unwrapBody
} from '@/api/faultcenter'

const loading = ref(false)

const searchQuery = ref('')
const severityFilter = ref('')
const statusFilter = ref('')
const startTimeFilter = ref('')
const endTimeFilter = ref('')

const currentPage = ref(1)
const pageSize = ref(10)

const incidents = ref({ records: [], total: 0 })

const stats = ref({
  open: 0,
  ack: 0,
  in_progress: 0,
  resolved: 0
})

const statCards = computed(() => {
  return [
    {
      key: 'open',
      label: '未处理',
      value: stats.value.open,
      icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg>'
    },
    {
      key: 'ack',
      label: '已确认',
      value: stats.value.ack,
      icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>'
    },
    {
      key: 'in_progress',
      label: '处理中',
      value: stats.value.in_progress,
      icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 8 16 8"/></svg>'
    },
    {
      key: 'resolved',
      label: '已恢复',
      value: stats.value.resolved,
      icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
    }
  ]
})

const totalPages = computed(() => Math.max(1, Math.ceil((incidents.value.total || 0) / pageSize.value)))

const hasActiveFilters = computed(() => {
  return (
    searchQuery.value ||
    severityFilter.value ||
    statusFilter.value ||
    startTimeFilter.value ||
    endTimeFilter.value
  )
})

function statusLabel(s) {
  return (
    {
      open: '未处理',
      ack: '已确认',
      in_progress: '处理中',
      resolved: '已恢复'
    }[s] || (s || '-')
  )
}

function formatTime(dateString) {
  if (!dateString) return '-'
  try {
    const d = new Date(dateString)
    if (Number.isNaN(d.getTime())) return dateString
    return d.toLocaleString('zh-CN', {
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

function formatTimeForAPI(dateString) {
  if (!dateString) return null
  try {
    const d = new Date(dateString)
    if (Number.isNaN(d.getTime())) return null
    return d.toISOString()
  } catch {
    return null
  }
}

function goToPage(p) {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
}

function resetFilters() {
  searchQuery.value = ''
  severityFilter.value = ''
  statusFilter.value = ''
  startTimeFilter.value = ''
  endTimeFilter.value = ''
  currentPage.value = 1
  loadIncidents()
}

function toggleStatus(key) {
  statusFilter.value = statusFilter.value === key ? '' : key
}

const detailVisible = ref(false)
const detail = ref(null)

async function openDetail(row) {
  detailVisible.value = true
  detail.value = row
  if (!row?.id) return
  try {
    const res = await fetchIncidentDetail(row.id)
    const body = unwrapBody(res)
    if (body && typeof body === 'object') {
      detail.value = body
    }
  } catch {
    // keep lightweight: fallback to row
  }
}

async function loadStats() {
  try {
    const res = await fetchIncidentStats({})
    const body = unwrapBody(res)
    if (body && typeof body === 'object') {
      stats.value = {
        open: Number(body.open || 0),
        ack: Number(body.ack || 0),
        in_progress: Number(body.in_progress || 0),
        resolved: Number(body.resolved || 0)
      }
    }
  } catch {
    // keep defaults
  }
}

async function loadIncidents() {
  loading.value = true
  try {
    const params = {
      pageNum: currentPage.value,
      pageSize: pageSize.value
    }
    if (searchQuery.value?.trim()) params.q = searchQuery.value.trim()
    if (severityFilter.value) params.severity = severityFilter.value
    if (statusFilter.value) params.status = statusFilter.value
    const st = formatTimeForAPI(startTimeFilter.value)
    const et = formatTimeForAPI(endTimeFilter.value)
    if (st) params.startTime = st
    if (et) params.endTime = et

    const res = await fetchIncidents(params)
    const body = unwrapBody(res)

    // 兼容 { records, total } / { list, total } / 直接数组
    const records = Array.isArray(body)
      ? body
      : Array.isArray(body?.records)
        ? body.records
        : Array.isArray(body?.list)
          ? body.list
          : []
    const total = Number(body?.total || records.length || 0)
    incidents.value = { records, total }

    if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
    await loadStats()
  } catch (e) {
    incidents.value = { records: [], total: 0 }
  } finally {
    loading.value = false
  }
}

let searchTimer = null
watch(searchQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    loadIncidents()
  }, 250)
})

watch([severityFilter, statusFilter, startTimeFilter, endTimeFilter], () => {
  currentPage.value = 1
  loadIncidents()
})

watch([currentPage, pageSize], () => {
  loadIncidents()
})

onMounted(() => {
  loadIncidents()
})
</script>

<style scoped>
.fault-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  --p0: #7a3c43;
  --p1: #735c2e;
  --p2: #4a5f73;
  --p3: #3f5a50;
  --focus: #4a5f78;
}

.fault-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.fault-stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}

.fault-stat-card::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--card-color);
}

.fault-stat-card:hover {
  transform: translateY(-1px);
  border-color: var(--border-strong);
  box-shadow: var(--shadow-sm);
}

.fault-stat-card.active {
  border-color: var(--card-color);
  box-shadow: 0 0 0 1px var(--card-color);
}

.fault-stat-card.open { --card-color: var(--p1); }
.fault-stat-card.ack { --card-color: var(--p2); }
.fault-stat-card.in_progress { --card-color: var(--p0); }
.fault-stat-card.resolved { --card-color: var(--p3); }

.fault-stat-icon {
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

.fault-stat-value {
  font-size: 30px;
  font-weight: 600;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.fault-stat-label {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 6px;
  font-weight: 500;
}

.fault-toolbar {
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
  width: 300px;
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
  border-color: var(--focus);
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

.action-group {
  display: flex;
  gap: 12px;
}

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

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.fault-list-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  overflow: hidden;
}

.fault-list-header {
  display: grid;
  grid-template-columns: 80px 1fr 160px 170px 110px 80px;
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

.fault-list {
  max-height: 600px;
  overflow-y: auto;
}

.fault-item {
  display: grid;
  grid-template-columns: 80px 1fr 160px 170px 110px 80px;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
  align-items: center;
  transition: background 0.2s ease;
}

.fault-item:hover {
  background: var(--bg-subtle);
}

.fault-item:last-child {
  border-bottom: none;
}

.sev-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  border: 1px solid var(--border-default);
  background: var(--bg-subtle);
  color: var(--text-secondary);
}

.sev-badge.P0 { background: #ead6d8; border-color: #d6bcc0; color: #5c2a30; }
.sev-badge.P1 { background: #e8e2d4; border-color: #d4cdb8; color: #5c4a26; }
.sev-badge.P2 { background: #dbe3e8; border-color: #c5d0d8; color: #3d4f5f; }
.sev-badge.P3 { background: #dde5e1; border-color: #c5d1cc; color: #3d5248; }

.fault-title {
  font-weight: 600;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary);
}

.fault-desc {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tag-mono {
  display: inline-block;
  padding: 4px 10px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  font-size: 11px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  color: var(--text-secondary);
  border: 1px solid var(--border-default);
}

.mono {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  color: var(--text-muted);
}

.status-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid var(--border-default);
  background: var(--bg-subtle);
  color: var(--text-secondary);
}

.status-badge.open { background: #f3e8ff; border-color: #e9d5ff; color: #5b21b6; }
.status-badge.ack { background: #dbeafe; border-color: #bfdbfe; color: #1e40af; }
.status-badge.in_progress { background: #fee2e2; border-color: #fecaca; color: #7f1d1d; }
.status-badge.resolved { background: #dcfce7; border-color: #bbf7d0; color: #14532d; }

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

.empty-state,
.loading-state {
  padding: 60px 20px;
  text-align: center;
  color: var(--text-muted);
}

.empty-state svg {
  margin-bottom: 14px;
  opacity: 0.45;
}

.empty-state .muted {
  margin-top: 6px;
  font-size: 12px;
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
  gap: 10px;
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
  padding: 8px 12px;
  border: 1px solid var(--border-default);
  background: transparent;
  color: var(--text-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
}

.page-btn:hover:not(:disabled) {
  background: var(--bg-subtle);
  border-color: var(--border-strong);
  color: var(--text-primary);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.detail-modal {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: 20px;
  width: 720px;
  max-height: 82vh;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 22px;
  border-bottom: 1px solid var(--border-default);
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.modal-sub {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  padding: 2px 8px;
  background: var(--bg-subtle);
  border-radius: 6px;
  border: 1px solid var(--border-default);
  color: var(--text-secondary);
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
  padding: 20px 22px;
  overflow: auto;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--border-default);
  border-radius: 12px;
  background: var(--bg-surface);
}

.detail-section {
  margin-top: 16px;
}

.k {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 600;
  flex-shrink: 0;
}

.v {
  font-size: 13px;
  color: var(--text-primary);
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-text {
  margin: 10px 0 0;
  padding: 14px 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  font-size: 13px;
}

.tags {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.label-tag {
  display: flex;
  align-items: flex-start;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-radius: 10px;
  font-size: 12px;
  gap: 8px;
  border: 1px solid var(--border-default);
}

.tag-key {
  color: var(--text-muted);
  font-weight: 700;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  flex-shrink: 0;
}

.tag-value {
  color: var(--text-secondary);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  word-break: break-all;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 22px;
  border-top: 1px solid var(--border-default);
}

@media (max-width: 1400px) {
  .fault-overview {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 900px) {
  .fault-list-header,
  .fault-item {
    grid-template-columns: 70px 1fr 140px 110px 80px;
  }
  .header-cell.actions,
  .actions-cell {
    display: none;
  }
  .detail-grid {
    grid-template-columns: 1fr;
  }
  .search-input {
    width: 100%;
  }
}
</style>

