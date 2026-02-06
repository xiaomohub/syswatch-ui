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
            <div class="stat-value">{{ criticalCount }}</div>
            <div class="stat-label">严重告警</div>
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
            <div class="stat-value">{{ warningCount }}</div>
            <div class="stat-label">警告日志</div>
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
            <div class="stat-value">{{ infoCount }}</div>
            <div class="stat-label">信息日志</div>
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
            <span>告警日志列表</span>
            <span class="ws-status" :class="wsConnected ? 'ws-online' : 'ws-offline'" :title="wsConnected ? 'WebSocket 已连接' : 'WebSocket 未连接'">
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
  
        <!-- Loading -->
        <div class="loading-bar" v-if="loading">
          <div class="loading-progress"></div>
        </div>
  
        <!-- Table -->
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th class="col-id">ID</th>
                <th class="col-level">级别</th>
                <th class="col-name">告警名称</th>
                <th class="col-source">来源</th>
                <th class="col-message">告警内容</th>
                <th class="col-status">状态</th>
                <th class="col-time">时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="logs.length === 0 && !loading">
                <td colspan="7" class="empty-row">
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
                <td class="col-id">
                  <span class="id-text">#{{ log.id }}</span>
                </td>
                <td class="col-level">
                  <span class="level-badge" :class="getLevelClass(log.level)">
                    {{ getLevelText(log.level) }}
                  </span>
                </td>
                <td class="col-name">{{ log.alertName || log.name || '-' }}</td>
                <td class="col-source">
                  <span class="source-tag">{{ log.source || '-' }}</span>
                </td>
                <td class="col-message">
                  <span class="message-text" :title="log.message || log.content || ''">
                    {{ log.message || log.content || '-' }}
                  </span>
                </td>
                <td class="col-status">
                  <span class="status-badge" :class="getStatusClass(log.status)">
                    <span class="status-dot-sm"></span>
                    {{ getStatusText(log.status) }}
                  </span>
                </td>
                <td class="col-time">
                  <span class="time-text">{{ formatTime(log.createTime || log.createdAt || log.time) }}</span>
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
            <button class="page-btn" :disabled="currentPage <= 1" @click="goToPage(1)" title="首页">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="11 17 6 12 11 7"/>
                <polyline points="18 17 13 12 18 7"/>
              </svg>
            </button>
            <button class="page-btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)" title="上一页">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
  
            <template v-for="p in visiblePages" :key="p">
              <span v-if="p === '...'" class="page-ellipsis">...</span>
              <button v-else class="page-btn page-num" :class="{ active: p === currentPage }" @click="goToPage(p)">
                {{ p }}
              </button>
            </template>
  
            <button class="page-btn" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)" title="下一页">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
            <button class="page-btn" :disabled="currentPage >= totalPages" @click="goToPage(totalPages)" title="末页">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="13 17 18 12 13 7"/>
                <polyline points="6 17 11 12 6 7"/>
              </svg>
            </button>
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
  
  // WebSocket 状态
  const wsConnected = ref(false)
  let ws = null
  
  // 统计数量
  const criticalCount = computed(() => logs.value.filter(l => l.level === 'CRITICAL' || l.level === 'critical' || l.level === 1).length)
  const warningCount = computed(() => logs.value.filter(l => l.level === 'WARNING' || l.level === 'warning' || l.level === 2).length)
  const infoCount = computed(() => logs.value.filter(l => l.level === 'INFO' || l.level === 'info' || l.level === 3).length)
  
  // 获取日志列表
  const fetchLogs = async () => {
    loading.value = true
    try {
      const res = await axios.get('/api/logs', {
        params: {
          page: currentPage.value,
          size: pageSize.value
        }
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
  
  // ★ WebSocket 推送新日志时，插入到表格顶部
  const addLogToTable = (log) => {
    log._isNew = true
    logs.value.unshift(log)
    totalLogs.value += 1
  
    // 当前页数据超过 pageSize，移除末尾
    if (logs.value.length > pageSize.value) {
      logs.value.pop()
    }
  
    // 1.5秒后移除高亮
    setTimeout(() => {
      log._isNew = false
    }, 1500)
  }
  
  // ★ WebSocket 必须放在 onMounted 里，并加 try-catch
  const initWebSocket = () => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.host
      ws = new WebSocket(`${protocol}//${host}/ws/logs`)
  
      ws.onopen = () => {
        console.log('WebSocket 已连接')
        wsConnected.value = true
      }
  
      ws.onmessage = (event) => {
        try {
          const log = JSON.parse(event.data)
          console.log('收到新日志', log)
          addLogToTable(log)
        } catch (e) {
          console.error('解析日志消息失败:', e)
        }
      }
  
      ws.onclose = () => {
        console.log('WebSocket 已断开')
        wsConnected.value = false
        // 5秒后自动重连
        setTimeout(() => {
          if (!ws || ws.readyState === WebSocket.CLOSED) {
            initWebSocket()
          }
        }, 5000)
      }
  
      ws.onerror = (err) => {
        console.error('WebSocket 错误:', err)
        wsConnected.value = false
      }
    } catch (err) {
      console.error('WebSocket 初始化失败:', err)
      wsConnected.value = false
    }
  }
  
  // 分页
  const goToPage = (page) => {
    if (page < 1 || page > totalPages.value) return
    currentPage.value = page
    fetchLogs()
  }
  
  const handlePageSizeChange = () => {
    currentPage.value = 1
    fetchLogs()
  }
  
  // 计算可见页码
  const visiblePages = computed(() => {
    const pages = []
    const total = totalPages.value
    const current = currentPage.value
  
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i)
      return pages
    }
  
    pages.push(1)
    if (current > 3) pages.push('...')
  
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    for (let i = start; i <= end; i++) pages.push(i)
  
    if (current < total - 2) pages.push('...')
    pages.push(total)
  
    return pages
  })
  
  // 级别
  const getLevelClass = (level) => {
    const map = {
      'CRITICAL': 'level-critical', 'critical': 'level-critical', 1: 'level-critical',
      'WARNING': 'level-warning', 'warning': 'level-warning', 2: 'level-warning',
      'INFO': 'level-info', 'info': 'level-info', 3: 'level-info',
      'DEBUG': 'level-debug', 'debug': 'level-debug', 4: 'level-debug'
    }
    return map[level] || 'level-info'
  }
  
  const getLevelText = (level) => {
    const map = {
      'CRITICAL': '严重', 'critical': '严重', 1: '严重',
      'WARNING': '警告', 'warning': '警告', 2: '警告',
      'INFO': '信息', 'info': '信息', 3: '信息',
      'DEBUG': '调试', 'debug': '调试', 4: '调试'
    }
    return map[level] || level || '未知'
  }
  
  // 状态
  const getStatusClass = (status) => {
    const map = {
      'RESOLVED': 'status-resolved', 'resolved': 'status-resolved', 1: 'status-resolved',
      'PENDING': 'status-pending', 'pending': 'status-pending', 0: 'status-pending',
      'ACKNOWLEDGED': 'status-ack', 'acknowledged': 'status-ack', 2: 'status-ack'
    }
    return map[status] || 'status-pending'
  }
  
  const getStatusText = (status) => {
    const map = {
      'RESOLVED': '已恢复', 'resolved': '已恢复', 1: '已恢复',
      'PENDING': '未处理', 'pending': '未处理', 0: '未处理',
      'ACKNOWLEDGED': '已确认', 'acknowledged': '已确认', 2: '已确认'
    }
    return map[status] || status || '未处理'
  }
  
  // 时间格式化
  const formatTime = (time) => {
    if (!time) return '-'
    const d = new Date(time)
    if (isNaN(d.getTime())) return time
    return d.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
  }
  
  onMounted(() => {
    fetchLogs()
    initWebSocket()
  })
  
  onUnmounted(() => {
    // 组件销毁时关闭 WebSocket，防止内存泄漏和重连
    if (ws) {
      ws.onclose = null // 先置空，防止触发自动重连
      ws.close()
      ws = null
    }
  })
  </script>
  
  <style scoped>
  /* Stats Row */
  .stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 24px;
  }
  
  .stat-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    transition: all 0.3s ease;
  }
  
  .stat-card:hover {
    border-color: rgba(6, 182, 212, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }
  
  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  .stat-icon.total {
    background: rgba(6, 182, 212, 0.15);
    color: var(--accent-cyan);
  }
  
  .stat-icon.critical {
    background: rgba(239, 68, 68, 0.15);
    color: var(--accent-red);
  }
  
  .stat-icon.warning {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
  }
  
  .stat-icon.info {
    background: rgba(16, 185, 129, 0.15);
    color: var(--accent-green);
  }
  
  .stat-value {
    font-size: 24px;
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
  }
  
  .stat-label {
    font-size: 13px;
    color: var(--text-muted);
    margin-top: 2px;
  }
  
  /* Table Card */
  .table-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    overflow: hidden;
  }
  
  .table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border-color);
  }
  
  .table-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .table-title svg {
    color: var(--accent-cyan);
  }
  
  /* WebSocket 连接状态 */
  .ws-status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 500;
    padding: 3px 10px;
    border-radius: 12px;
    margin-left: 4px;
  }
  
  .ws-online {
    background: rgba(16, 185, 129, 0.1);
    color: var(--accent-green, #10b981);
  }
  
  .ws-offline {
    background: rgba(148, 163, 184, 0.1);
    color: var(--text-muted, #64748b);
  }
  
  .ws-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  
  .ws-online .ws-dot {
    background: var(--accent-green, #10b981);
    animation: pulse-ws 2s infinite;
  }
  
  .ws-offline .ws-dot {
    background: var(--text-muted, #64748b);
  }
  
  @keyframes pulse-ws {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  
  .table-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .page-size-select {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-secondary);
  }
  
  .page-size-select select {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 13px;
    cursor: pointer;
    outline: none;
    transition: border-color 0.2s;
  }
  
  .page-size-select select:focus {
    border-color: var(--accent-cyan);
  }
  
  .btn-refresh {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: rgba(6, 182, 212, 0.1);
    border: 1px solid rgba(6, 182, 212, 0.3);
    color: var(--accent-cyan);
    border-radius: 8px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .btn-refresh:hover {
    background: rgba(6, 182, 212, 0.2);
  }
  
  .btn-refresh.spinning svg {
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  /* Loading Bar */
  .loading-bar {
    height: 2px;
    background: var(--bg-tertiary);
    overflow: hidden;
  }
  
  .loading-progress {
    height: 100%;
    width: 40%;
    background: linear-gradient(90deg, var(--accent-cyan), var(--accent-purple));
    border-radius: 2px;
    animation: loadingSlide 1.2s ease infinite;
  }
  
  @keyframes loadingSlide {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(350%); }
  }
  
  /* Table */
  .table-wrapper {
    overflow-x: auto;
  }
  
  .data-table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .data-table thead {
    background: var(--bg-tertiary);
  }
  
  .data-table th {
    padding: 14px 20px;
    text-align: left;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
    border-bottom: 1px solid var(--border-color);
  }
  
  .data-table td {
    padding: 16px 20px;
    font-size: 14px;
    color: var(--text-secondary);
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }
  
  .data-row {
    transition: background 0.15s ease;
  }
  
  .data-row:hover {
    background: rgba(6, 182, 212, 0.04);
  }
  
  /* 新日志高亮动画 */
  .new-row {
    animation: highlightNew 1.5s ease;
  }
  
  @keyframes highlightNew {
    0% { background: rgba(6, 182, 212, 0.15); }
    100% { background: transparent; }
  }
  
  .col-id { width: 80px; }
  .col-level { width: 90px; }
  .col-name { width: 160px; }
  .col-source { width: 120px; }
  .col-message { min-width: 200px; }
  .col-status { width: 110px; }
  .col-time { width: 180px; }
  
  .id-text {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    color: var(--text-muted);
  }
  
  /* Level Badges */
  .level-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.3px;
  }
  
  .level-critical {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
  
  .level-warning {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }
  
  .level-info {
    background: rgba(6, 182, 212, 0.15);
    color: #22d3ee;
    border: 1px solid rgba(6, 182, 212, 0.3);
  }
  
  .level-debug {
    background: rgba(148, 163, 184, 0.15);
    color: #94a3b8;
    border: 1px solid rgba(148, 163, 184, 0.3);
  }
  
  /* Source Tag */
  .source-tag {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    padding: 3px 8px;
    background: var(--bg-tertiary);
    border-radius: 4px;
    color: var(--text-secondary);
  }
  
  /* Message */
  .message-text {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 360px;
    line-height: 1.5;
  }
  
  /* Status Badge */
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
  }
  
  .status-dot-sm {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  
  .status-pending {
    background: rgba(245, 158, 11, 0.1);
    color: #fbbf24;
  }
  
  .status-pending .status-dot-sm {
    background: #fbbf24;
    animation: pulse-sm 2s infinite;
  }
  
  .status-resolved {
    background: rgba(16, 185, 129, 0.1);
    color: var(--accent-green);
  }
  
  .status-resolved .status-dot-sm {
    background: var(--accent-green);
  }
  
  .status-ack {
    background: rgba(6, 182, 212, 0.1);
    color: var(--accent-cyan);
  }
  
  .status-ack .status-dot-sm {
    background: var(--accent-cyan);
  }
  
  @keyframes pulse-sm {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  
  /* Time */
  .time-text {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    color: var(--text-muted);
    white-space: nowrap;
  }
  
  /* Empty State */
  .empty-row {
    text-align: center;
    padding: 60px 20px !important;
  }
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: var(--text-muted);
  }
  
  .empty-state svg {
    opacity: 0.3;
  }
  
  /* Pagination */
  .pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    border-top: 1px solid var(--border-color);
  }
  
  .pagination-info {
    font-size: 13px;
    color: var(--text-muted);
  }
  
  .pagination-info strong {
    color: var(--text-primary);
  }
  
  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .page-btn {
    min-width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s ease;
  }
  
  .page-btn:hover:not(:disabled) {
    background: rgba(6, 182, 212, 0.1);
    border-color: rgba(6, 182, 212, 0.3);
    color: var(--accent-cyan);
  }
  
  .page-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  
  .page-btn.active {
    background: var(--accent-cyan);
    border-color: var(--accent-cyan);
    color: white;
    font-weight: 600;
  }
  
  .page-ellipsis {
    padding: 0 6px;
    color: var(--text-muted);
    font-size: 13px;
  }
  
  /* Responsive */
  @media (max-width: 1200px) {
    .stats-row {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  
  @media (max-width: 768px) {
    .stats-row {
      grid-template-columns: 1fr;
    }
  
    .table-header {
      flex-direction: column;
      gap: 12px;
      align-items: flex-start;
    }
  
    .pagination {
      flex-direction: column;
      gap: 12px;
    }
  }
  </style>