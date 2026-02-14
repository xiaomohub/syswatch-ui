<template>
  <div class="logs-page">
    <!-- Stats Cards -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon total">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ totalLogs }}</div>
          <div class="stat-label">日志总数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon critical">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ failCount }}</div>
          <div class="stat-label">失败操作</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon info">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ successCount }}</div>
          <div class="stat-label">成功操作</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon warning">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ publishCount }}</div>
          <div class="stat-label">发布操作</div>
        </div>
      </div>
    </div>

    <!-- Table Section -->
    <div class="table-card">
      <div class="table-header">
        <div class="table-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <span>告警发布日志</span>
          <span class="ws-status" :class="wsConnected ? 'ws-online' : 'ws-offline'">
            <span class="ws-dot"></span>
            {{ wsConnected ? '实时' : '离线' }}
          </span>
        </div>
        <div class="table-actions">
          <div class="page-size-select">
            <label>每页</label>
            <select v-model="pageSize" @change="handlePageSizeChange">
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
            <label>条</label>
          </div>
          <button class="btn-refresh" @click="fetchLogs" :class="{ spinning: loading }">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            刷新
          </button>
        </div>
      </div>

      <div class="loading-bar" v-if="loading">
        <div class="loading-progress"></div>
      </div>

      <!-- Table -->
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th class="col-id">ID</th>
              <th class="col-resource-type">资源类型</th>
              <th class="col-file-name">规则文件</th>
              <th class="col-action">动作</th>
              <th class="col-rules-count">规则数</th>
              <th class="col-changed">变更</th>
              <th class="col-status">状态</th>
              <th class="col-message">消息</th>
              <th class="col-time">时间</th>
              <th class="col-ops">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="logs.length === 0 && !loading">
              <td colspan="10" class="empty-row">
                <div class="empty-state">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span>暂无日志数据</span>
                </div>
              </td>
            </tr>
            <tr v-for="log in logs" :key="log.id" class="data-row" :class="{ 'new-row': log._isNew }">
              <td class="col-id"><span class="id-text">#{{ log.id }}</span></td>
              <td class="col-resource-type"><span class="source-tag">{{ log.resourceType || '-' }}</span></td>
              <td class="col-file-name"><span class="file-tag">{{ log.fileName || '-' }}</span></td>
              <td class="col-action">
                <span class="action-badge" :class="getActionClass(log.action)">{{ getActionText(log.action) }}</span>
              </td>
              <td class="col-rules-count"><span class="rules-count">{{ log.rulesCount ?? '-' }}</span></td>
              <td class="col-changed">
                <span class="changed-badge" :class="log.contentChanged ? 'changed-yes' : 'changed-no'">
                  {{ log.contentChanged ? '有变更' : '无变更' }}
                </span>
              </td>
              <td class="col-status">
                <span class="status-badge" :class="getStatusClass(log.status)">
                  <span class="status-dot-sm"></span>
                  {{ getStatusText(log.status) }}
                </span>
              </td>
              <td class="col-message">
                <span class="message-text" :title="log.message || ''">{{ log.message || '-' }}</span>
              </td>
              <td class="col-time"><span class="time-text">{{ formatTime(log.timestamp) }}</span></td>
              <td class="col-ops">
                <button
                  v-if="log.action !== 'reload'"
                  class="btn-diff"
                  @click="openDiff(log.id)"
                  title="查看规则变更对比"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 3v18M3 12h18"/>
                  </svg>
                  对比
                </button>
                <span v-else class="ops-na">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="pagination" v-if="totalLogs > 0">
        <div class="pagination-info">
          共 <strong>{{ totalLogs }}</strong> 条，第 <strong>{{ currentPage }}</strong> / <strong>{{ totalPages }}</strong> 页
        </div>
        <div class="pagination-controls">
          <button class="page-btn" :disabled="currentPage <= 1" @click="goToPage(1)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
          </button>
          <button class="page-btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <template v-for="p in visiblePages" :key="p">
            <span v-if="p === '...'" class="page-ellipsis">...</span>
            <button v-else class="page-btn page-num" :class="{ active: p === currentPage }" @click="goToPage(p)">{{ p }}</button>
          </template>
          <button class="page-btn" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button class="page-btn" :disabled="currentPage >= totalPages" @click="goToPage(totalPages)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- ★ Diff 弹窗 -->
    <div class="diff-overlay" v-if="diffVisible" @click.self="closeDiff">
      <div class="diff-modal">
        <div class="diff-header">
          <div class="diff-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span>规则变更对比</span>
            <span class="diff-file-name" v-if="diffDetail">{{ diffDetail.fileName }}</span>
          </div>
          <button class="diff-close" @click="closeDiff">✕</button>
        </div>

        <div class="diff-loading" v-if="diffLoading">加载中...</div>

        <div class="diff-body" v-else-if="diffDetail">
          <!-- 无内容 -->
          <div v-if="!diffDetail.contentBefore && !diffDetail.contentAfter" class="diff-empty">
            此日志无规则内容记录（可能是 reload 或无规则跳过）
          </div>

          <!-- 有内容 — 左右对比 -->
          <div v-else class="diff-panels">
            <div class="diff-panel">
              <div class="diff-panel-header before-header">
                <span class="diff-label">变更前（远端旧文件）</span>
              </div>
              <pre class="diff-content"><code>{{ diffDetail.contentBefore || '（空 — 首次发布，远端无旧文件）' }}</code></pre>
            </div>
            <div class="diff-panel">
              <div class="diff-panel-header after-header">
                <span class="diff-label">变更后（本次渲染结果）</span>
              </div>
              <pre class="diff-content"><code>{{ diffDetail.contentAfter || '（空）' }}</code></pre>
            </div>
          </div>

          <!-- 元信息 -->
          <div class="diff-meta">
            <span>发布标识: <code>{{ diffDetail.publishId || '-' }}</code></span>
            <span>规则数: <strong>{{ diffDetail.rulesCount }}</strong></span>
            <span>状态: <strong :class="diffDetail.status ? 'meta-success' : 'meta-fail'">{{ diffDetail.status ? '成功' : '失败' }}</strong></span>
            <span>时间: {{ formatTime(diffDetail.timestamp) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'

const logs = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const totalLogs = ref(0)
const totalPages = ref(0)

const wsConnected = ref(false)
let ws = null

// Diff 弹窗
const diffVisible = ref(false)
const diffLoading = ref(false)
const diffDetail = ref(null)

// 统计
const failCount = computed(() => logs.value.filter(l => l.status === 0 || l.status === false).length)
const successCount = computed(() => logs.value.filter(l => l.status === 1 || l.status === true).length)
const publishCount = computed(() => logs.value.filter(l => l.action === 'publish').length)

// 获取列表
const fetchLogs = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/logs', {
      params: { page: currentPage.value, size: pageSize.value }
    })
    const data = res.data
    logs.value = data.records || []
    totalLogs.value = data.total || 0
    totalPages.value = data.pages || 0
    currentPage.value = data.current || 1
  } catch (err) {
    console.error('获取日志失败:', err)
    logs.value = []
  } finally {
    loading.value = false
  }
}

// ★ 打开 Diff 弹窗 — 调用详情接口拿 content_before / content_after
const openDiff = async (id) => {
  diffVisible.value = true
  diffLoading.value = true
  diffDetail.value = null
  try {
    const res = await axios.get(`/api/logs/${id}`)
    diffDetail.value = res.data
  } catch (err) {
    console.error('获取日志详情失败:', err)
    diffDetail.value = null
  } finally {
    diffLoading.value = false
  }
}

const closeDiff = () => {
  diffVisible.value = false
  diffDetail.value = null
}

// WebSocket
const addLogToTable = (log) => {
  log._isNew = true
  logs.value.unshift(log)
  totalLogs.value += 1
  if (logs.value.length > pageSize.value) logs.value.pop()
  setTimeout(() => { log._isNew = false }, 1500)
}

const initWebSocket = () => {
  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    ws = new WebSocket(`${protocol}//${host}/ws/logs`)
    ws.onopen = () => { wsConnected.value = true }
    ws.onmessage = (event) => {
      try { addLogToTable(JSON.parse(event.data)) } catch (e) { console.error(e) }
    }
    ws.onclose = () => {
      wsConnected.value = false
      setTimeout(() => { if (!ws || ws.readyState === WebSocket.CLOSED) initWebSocket() }, 5000)
    }
    ws.onerror = () => { wsConnected.value = false }
  } catch (err) {
    wsConnected.value = false
  }
}

// 分页
const goToPage = (page) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  fetchLogs()
}
const handlePageSizeChange = () => { currentPage.value = 1; fetchLogs() }

const visiblePages = computed(() => {
  const pages = [], total = totalPages.value, current = currentPage.value
  if (total <= 7) { for (let i = 1; i <= total; i++) pages.push(i); return pages }
  pages.push(1)
  if (current > 3) pages.push('...')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
})

// 映射函数
const getActionClass = (a) => ({ publish: 'action-publish', reload: 'action-reload', skip: 'action-skip' }[a] || 'action-default')
const getActionText = (a) => ({ publish: '发布', reload: '重载', skip: '跳过' }[a] || a || '未知')
const getStatusClass = (s) => (s === 1 || s === true) ? 'status-success' : 'status-fail'
const getStatusText = (s) => (s === 1 || s === true) ? '成功' : (s === 0 || s === false) ? '失败' : '未知'

const formatTime = (time) => {
  if (!time) return '-'
  const d = new Date(time)
  if (isNaN(d.getTime())) return time
  return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

onMounted(() => { fetchLogs(); initWebSocket() })
onUnmounted(() => { if (ws) { ws.onclose = null; ws.close(); ws = null } })
</script>

<style scoped>
/* ==================== Stats ==================== */
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 24px; }
.stat-card {
  background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px;
  padding: 20px; display: flex; align-items: center; gap: 16px; transition: all 0.3s ease;
}
.stat-card:hover { border-color: rgba(6, 182, 212, 0.3); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
.stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.stat-icon.total { background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan); }
.stat-icon.critical { background: rgba(239, 68, 68, 0.15); color: var(--accent-red); }
.stat-icon.info { background: rgba(16, 185, 129, 0.15); color: var(--accent-green); }
.stat-icon.warning { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.stat-value { font-size: 24px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
.stat-label { font-size: 13px; color: var(--text-muted); margin-top: 2px; }

/* ==================== Table Card ==================== */
.table-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; overflow: hidden; }
.table-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--border-color); }
.table-title { display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 600; color: var(--text-primary); }
.table-title svg { color: var(--accent-cyan); }

.ws-status { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 12px; margin-left: 4px; }
.ws-online { background: rgba(16, 185, 129, 0.1); color: var(--accent-green, #10b981); }
.ws-offline { background: rgba(148, 163, 184, 0.1); color: var(--text-muted, #64748b); }
.ws-dot { width: 6px; height: 6px; border-radius: 50%; }
.ws-online .ws-dot { background: var(--accent-green, #10b981); animation: pulse-ws 2s infinite; }
.ws-offline .ws-dot { background: var(--text-muted, #64748b); }
@keyframes pulse-ws { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

.table-actions { display: flex; align-items: center; gap: 12px; }
.page-size-select { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); }
.page-size-select select { background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 6px 10px; border-radius: 8px; font-size: 13px; cursor: pointer; }
.page-size-select select:focus { border-color: var(--accent-cyan); }

.btn-refresh { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.3); color: var(--accent-cyan); border-radius: 8px; font-size: 13px; cursor: pointer; transition: all 0.2s; }
.btn-refresh:hover { background: rgba(6, 182, 212, 0.2); }
.btn-refresh.spinning svg { animation: spin 0.8s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.loading-bar { height: 2px; background: var(--bg-tertiary); overflow: hidden; }
.loading-progress { height: 100%; width: 40%; background: linear-gradient(90deg, var(--accent-cyan), var(--accent-purple)); animation: loadingSlide 1.2s ease infinite; }
@keyframes loadingSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }

/* ==================== Table ==================== */
.table-wrapper { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table thead { background: var(--bg-tertiary); }
.data-table th { padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; border-bottom: 1px solid var(--border-color); }
.data-table td { padding: 14px 16px; font-size: 13px; color: var(--text-secondary); border-bottom: 1px solid rgba(255,255,255,0.04); }
.data-row { transition: background 0.15s ease; }
.data-row:hover { background: rgba(6, 182, 212, 0.04); }
.new-row { animation: highlightNew 1.5s ease; }
@keyframes highlightNew { 0% { background: rgba(6, 182, 212, 0.15); } 100% { background: transparent; } }

.col-id { width: 70px; }
.col-resource-type { width: 90px; }
.col-file-name { width: 160px; }
.col-action { width: 80px; }
.col-rules-count { width: 60px; text-align: center; }
.col-changed { width: 80px; text-align: center; }
.col-status { width: 80px; }
.col-message { min-width: 160px; }
.col-time { width: 170px; }
.col-ops { width: 80px; text-align: center; }

.id-text { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text-muted); }
.source-tag, .file-tag { font-family: 'JetBrains Mono', monospace; font-size: 12px; padding: 3px 8px; background: var(--bg-tertiary); border-radius: 4px; color: var(--text-secondary); }
.rules-count { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; color: var(--text-primary); }

.action-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
.action-publish { background: rgba(6, 182, 212, 0.15); color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.3); }
.action-reload { background: rgba(139, 92, 246, 0.15); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.3); }
.action-skip { background: rgba(148, 163, 184, 0.15); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.3); }
.action-default { background: rgba(148, 163, 184, 0.15); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.3); }

.changed-badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
.changed-yes { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
.changed-no { background: rgba(148, 163, 184, 0.1); color: #94a3b8; }

.status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
.status-dot-sm { width: 6px; height: 6px; border-radius: 50%; }
.status-success { background: rgba(16, 185, 129, 0.1); color: var(--accent-green, #10b981); }
.status-success .status-dot-sm { background: var(--accent-green, #10b981); }
.status-fail { background: rgba(239, 68, 68, 0.1); color: #f87171; }
.status-fail .status-dot-sm { background: #f87171; animation: pulse-sm 2s infinite; }
@keyframes pulse-sm { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

.message-text { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; max-width: 300px; line-height: 1.5; }
.time-text { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text-muted); white-space: nowrap; }

/* ==================== 对比按钮 ==================== */
.btn-diff {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; font-size: 12px; font-weight: 500;
  background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3);
  color: #a78bfa; border-radius: 6px; cursor: pointer; transition: all 0.2s;
}
.btn-diff:hover { background: rgba(139, 92, 246, 0.2); }
.ops-na { color: var(--text-muted); font-size: 12px; }

/* ==================== Diff 弹窗 ==================== */
.diff-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
}
.diff-modal {
  width: 90vw; max-width: 1200px; max-height: 85vh;
  background: var(--bg-card, #1e293b); border: 1px solid var(--border-color, #334155);
  border-radius: 16px; display: flex; flex-direction: column; overflow: hidden;
}
.diff-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 24px; border-bottom: 1px solid var(--border-color, #334155);
}
.diff-title { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 600; color: var(--text-primary, #f1f5f9); }
.diff-title svg { color: var(--accent-cyan, #06b6d4); }
.diff-file-name {
  font-family: 'JetBrains Mono', monospace; font-size: 12px;
  padding: 2px 8px; background: var(--bg-tertiary, #0f172a); border-radius: 4px; color: var(--accent-cyan, #06b6d4);
}
.diff-close {
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  background: transparent; border: 1px solid var(--border-color, #334155);
  color: var(--text-muted, #64748b); border-radius: 8px; cursor: pointer; font-size: 16px; transition: all 0.2s;
}
.diff-close:hover { background: rgba(239, 68, 68, 0.1); color: #f87171; border-color: rgba(239, 68, 68, 0.3); }

.diff-loading { padding: 60px; text-align: center; color: var(--text-muted, #64748b); font-size: 14px; }
.diff-empty { padding: 60px; text-align: center; color: var(--text-muted, #64748b); font-size: 14px; }

.diff-body { flex: 1; overflow: auto; padding: 20px 24px; }

.diff-panels { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.diff-panel { border: 1px solid var(--border-color, #334155); border-radius: 10px; overflow: hidden; }
.diff-panel-header { padding: 10px 16px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.before-header { background: rgba(239, 68, 68, 0.08); color: #f87171; border-bottom: 1px solid rgba(239, 68, 68, 0.2); }
.after-header { background: rgba(16, 185, 129, 0.08); color: #10b981; border-bottom: 1px solid rgba(16, 185, 129, 0.2); }
.diff-label { display: block; }

.diff-content {
  margin: 0; padding: 16px; font-family: 'JetBrains Mono', monospace; font-size: 12px;
  line-height: 1.7; color: var(--text-secondary, #cbd5e1);
  background: var(--bg-tertiary, #0f172a); overflow: auto; max-height: 50vh; white-space: pre-wrap; word-break: break-all;
}
.diff-content code { font-family: inherit; }

.diff-meta {
  display: flex; flex-wrap: wrap; gap: 20px; margin-top: 16px; padding-top: 16px;
  border-top: 1px solid var(--border-color, #334155); font-size: 13px; color: var(--text-muted, #64748b);
}
.diff-meta code { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--accent-cyan, #06b6d4); }
.diff-meta strong { color: var(--text-primary, #f1f5f9); }
.meta-success { color: var(--accent-green, #10b981) !important; }
.meta-fail { color: #f87171 !important; }

/* ==================== Empty / Pagination ==================== */
.empty-row { text-align: center; padding: 60px 20px !important; }
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; color: var(--text-muted); }
.empty-state svg { opacity: 0.3; }

.pagination { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-top: 1px solid var(--border-color); }
.pagination-info { font-size: 13px; color: var(--text-muted); }
.pagination-info strong { color: var(--text-primary); }
.pagination-controls { display: flex; align-items: center; gap: 4px; }
.page-btn { min-width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: transparent; border: 1px solid var(--border-color); color: var(--text-secondary); border-radius: 8px; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.page-btn:hover:not(:disabled) { background: rgba(6, 182, 212, 0.1); border-color: rgba(6, 182, 212, 0.3); color: var(--accent-cyan); }
.page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.page-btn.active { background: var(--accent-cyan); border-color: var(--accent-cyan); color: white; font-weight: 600; }
.page-ellipsis { padding: 0 6px; color: var(--text-muted); font-size: 13px; }

@media (max-width: 1200px) { .stats-row { grid-template-columns: repeat(2, 1fr); } .diff-panels { grid-template-columns: 1fr; } }
@media (max-width: 768px) { .stats-row { grid-template-columns: 1fr; } .table-header { flex-direction: column; gap: 12px; align-items: flex-start; } .pagination { flex-direction: column; gap: 12px; } }
</style>