<template>
  <div class="logs-page">

    <!-- ===== Tab 切换 ===== -->
    <div class="tab-bar">
      <button class="tab-btn" :class="{ active: activeTab === 'ops' }" @click="switchTab('ops')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        系统操作日志
        <span class="tab-count" v-if="opsTotalLogs > 0">{{ opsTotalLogs }}</span>
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'docker' }" @click="switchTab('docker')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="7" width="20" height="14" rx="2"/>
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
          <line x1="12" y1="12" x2="12" y2="16"/>
          <line x1="10" y1="14" x2="14" y2="14"/>
        </svg>
        容器日志
        <span class="tab-count error" v-if="dockerErrorTotal > 0">{{ dockerErrorTotal }} ERR</span>
      </button>
    </div>

    <!-- ======================== 系统操作日志 Tab ======================== -->
    <div v-show="activeTab === 'ops'">

      <!-- Stats -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon total">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div class="stat-info"><div class="stat-value">{{ opsTotalLogs }}</div><div class="stat-label">日志总数</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon success">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="stat-info"><div class="stat-value">{{ opsSuccessCount }}</div><div class="stat-label">成功操作</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon fail">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div class="stat-info"><div class="stat-value">{{ opsFailCount }}</div><div class="stat-label">失败操作</div></div>
        </div>
      </div>

      <!-- Table -->
      <div class="table-card">
        <div class="table-header">
          <div class="table-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            告警发布日志
          </div>
          <div class="table-actions">
            <div class="page-size-select">
              <label>每页</label>
              <select v-model.number="opsPageSize" @change="opsPageSizeChange">
                <option :value="10">10</option><option :value="20">20</option>
                <option :value="50">50</option><option :value="100">100</option>
              </select>
              <label>条</label>
            </div>
            <button class="btn-refresh" @click="fetchOpsLogs" :class="{ spinning: opsLoading }">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              刷新
            </button>
          </div>
        </div>

        <div class="loading-bar" v-if="opsLoading"><div class="loading-progress"></div></div>

        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th class="col-id">ID</th>
                <th>资源类型</th>
                <th>规则文件</th>
                <th>动作</th>
                <th class="tc">规则数</th>
                <th class="tc">变更</th>
                <th>状态</th>
                <th>消息</th>
                <th>时间</th>
                <th class="tc">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="opsLogs.length === 0 && !opsLoading">
                <td colspan="10" class="empty-row">
                  <div class="empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg><span>暂无日志数据</span></div>
                </td>
              </tr>
              <tr v-for="log in opsLogs" :key="log.id" class="data-row" :class="{ 'new-row': log._isNew }">
                <td><span class="id-text">#{{ log.id }}</span></td>
                <td><span class="tag-mono">{{ log.resourceType || '-' }}</span></td>
                <td><span class="tag-mono file">{{ log.fileName || '-' }}</span></td>
                <td><span class="action-badge" :class="getActionClass(log.action)">{{ getActionText(log.action) }}</span></td>
                <td class="tc"><span class="num-text">{{ log.rulesCount ?? '-' }}</span></td>
                <td class="tc">
                  <span class="changed-badge" :class="log.contentChanged ? 'changed-yes' : 'changed-no'">
                    {{ log.contentChanged ? '有变更' : '无变更' }}
                  </span>
                </td>
                <td>
                  <span class="status-badge" :class="getStatusClass(log.status)">
                    <span class="status-dot"></span>{{ getStatusText(log.status) }}
                  </span>
                </td>
                <td><span class="msg-text" :title="log.message || ''">{{ log.message || '-' }}</span></td>
                <td><span class="time-text">{{ formatTime(log.timestamp) }}</span></td>
                <td class="tc">
                  <div class="ops-btns">
                    <button class="btn-sm btn-chain" @click="openChain(log)" title="查看操作链条">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                      链条
                    </button>
                    <button v-if="log.action !== 'reload'" class="btn-sm btn-diff" @click="openDiff(log.id)" title="查看规则变更">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M3 12h18"/></svg>
                      对比
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination" v-if="opsTotalLogs > 0">
          <div class="pagination-info">共 <strong>{{ opsTotalLogs }}</strong> 条，第 <strong>{{ opsCurrentPage }}</strong> / <strong>{{ opsTotalPages }}</strong> 页</div>
          <div class="pagination-controls">
            <button class="page-btn" :disabled="opsCurrentPage <= 1" @click="opsGoToPage(1)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
            </button>
            <button class="page-btn" :disabled="opsCurrentPage <= 1" @click="opsGoToPage(opsCurrentPage - 1)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <template v-for="p in opsVisiblePages" :key="p">
              <span v-if="p === '...'" class="page-ellipsis">…</span>
              <button v-else class="page-btn page-num" :class="{ active: p === opsCurrentPage }" @click="opsGoToPage(p)">{{ p }}</button>
            </template>
            <button class="page-btn" :disabled="opsCurrentPage >= opsTotalPages" @click="opsGoToPage(opsCurrentPage + 1)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <button class="page-btn" :disabled="opsCurrentPage >= opsTotalPages" @click="opsGoToPage(opsTotalPages)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================== 容器日志 Tab ======================== -->
    <div v-show="activeTab === 'docker'">
      <div class="docker-header">
        <div class="docker-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="7" width="20" height="14" rx="2"/>
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
          </svg>
          容器日志总览
        </div>
        <div class="docker-actions">
          <div class="page-size-select">
            <label>每页</label>
            <select v-model.number="dockerPageSize" @change="dockerPageSizeChange">
              <option :value="10">10</option><option :value="20">20</option><option :value="50">50</option>
            </select>
            <label>条</label>
          </div>
          <button class="btn-refresh" @click="fetchDockerLogs" :class="{ spinning: dockerLoading }">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            刷新
          </button>
        </div>
      </div>

      <div class="loading-bar standalone" v-if="dockerLoading"><div class="loading-progress"></div></div>

      <!-- 容器分组卡片 -->
      <div class="container-grid" v-if="!dockerLoading && dockerGroups.length > 0">
        <div
          class="container-card"
          v-for="group in dockerGroups"
          :key="group.containerName"
          :class="{ 'has-error': group.errorCount > 0 }"
          @click="openDockerDetail(group)"
        >
          <div class="cc-header">
            <div class="cc-name">
              <span class="cc-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
              </span>
              {{ group.containerName }}
            </div>
            <span class="error-pill" v-if="group.errorCount > 0">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {{ group.errorCount }} ERROR
            </span>
            <span class="ok-pill" v-else>正常</span>
          </div>
          <div class="cc-meta">
            <span>采集次数 <strong>{{ group.collectCount }}</strong></span>
            <span>最近采集 <strong>{{ formatTime(group.lastTime) }}</strong></span>
          </div>
          <div class="cc-preview" v-if="group.lastMessage">
            {{ group.lastMessage }}
          </div>
          <div class="cc-footer">
            <button class="btn-view-error" v-if="group.errorCount > 0" @click.stop="openDockerDetail(group, true)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
              仅看 ERROR
            </button>
            <button class="btn-view-all" @click.stop="openDockerDetail(group, false)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              查看全部
            </button>
          </div>
        </div>
      </div>

      <div class="empty-state padded" v-if="!dockerLoading && dockerGroups.length === 0">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
        <span>暂无容器日志</span>
      </div>

      <!-- Docker Pagination -->
      <div class="pagination" v-if="dockerTotalLogs > 0 && !dockerLoading">
        <div class="pagination-info">共 <strong>{{ dockerTotalLogs }}</strong> 条，第 <strong>{{ dockerCurrentPage }}</strong> / <strong>{{ dockerTotalPages }}</strong> 页</div>
        <div class="pagination-controls">
          <button class="page-btn" :disabled="dockerCurrentPage <= 1" @click="dockerGoToPage(1)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
          </button>
          <button class="page-btn" :disabled="dockerCurrentPage <= 1" @click="dockerGoToPage(dockerCurrentPage - 1)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <template v-for="p in dockerVisiblePages" :key="p">
            <span v-if="p === '...'" class="page-ellipsis">…</span>
            <button v-else class="page-btn page-num" :class="{ active: p === dockerCurrentPage }" @click="dockerGoToPage(p)">{{ p }}</button>
          </template>
          <button class="page-btn" :disabled="dockerCurrentPage >= dockerTotalPages" @click="dockerGoToPage(dockerCurrentPage + 1)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button class="page-btn" :disabled="dockerCurrentPage >= dockerTotalPages" @click="dockerGoToPage(dockerTotalPages)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- ===================== 操作链条弹窗 ===================== -->
    <div class="modal-overlay" v-if="chainVisible" @click.self="chainVisible = false">
      <div class="modal chain-modal">
        <div class="modal-header">
          <div class="modal-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            操作历史链条
            <code class="modal-sub">{{ chainResourceKey }}</code>
          </div>
          <button class="modal-close" @click="chainVisible = false">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="chainLoading" class="modal-loading">加载中...</div>
          <div v-else-if="chainLogs.length === 0" class="modal-empty">无历史记录</div>
          <div v-else class="timeline">
            <div
              class="timeline-item"
              v-for="(item, idx) in chainLogs"
              :key="item.id"
              :class="{ current: item.id === chainCurrentId }"
            >
              <div class="tl-connector" v-if="idx < chainLogs.length - 1"></div>
              <div class="tl-dot" :class="getStatusClass(item.status)"></div>
              <div class="tl-content">
                <div class="tl-head">
                  <span class="action-badge sm" :class="getActionClass(item.action)">{{ getActionText(item.action) }}</span>
                  <span class="status-badge sm" :class="getStatusClass(item.status)">
                    <span class="status-dot"></span>{{ getStatusText(item.status) }}
                  </span>
                  <span class="tl-time">{{ formatTime(item.timestamp) }}</span>
                  <span class="current-tag" v-if="item.id === chainCurrentId">当前</span>
                </div>
                <div class="tl-meta">
                  <span v-if="item.rulesCount != null">规则数: <strong>{{ item.rulesCount }}</strong></span>
                  <span>
                    变更:
                    <span :class="item.contentChanged ? 'tag-yes' : 'tag-no'">{{ item.contentChanged ? '有变更' : '无变更' }}</span>
                  </span>
                </div>
                <div class="tl-msg" v-if="item.message">{{ item.message }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===================== Diff 弹窗 ===================== -->
    <div class="modal-overlay" v-if="diffVisible" @click.self="closeDiff">
      <div class="modal diff-modal">
        <div class="modal-header">
          <div class="modal-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M3 12h18"/></svg>
            规则变更对比
            <code class="modal-sub" v-if="diffDetail">{{ diffDetail.fileName }}</code>
          </div>
          <button class="modal-close" @click="closeDiff">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="diffLoading" class="modal-loading">加载中...</div>
          <div v-else-if="diffBlocks && diffBlocks.length > 0">
            <DiffViewer :blocks="diffBlocks"/>
            <div class="diff-meta" v-if="diffDetail">
              <span>发布标识: <code>{{ diffDetail.publishId || '-' }}</code></span>
              <span>规则数: <strong>{{ diffDetail.rulesCount }}</strong></span>
              <span>状态: <strong :class="diffDetail.status ? 'meta-success' : 'meta-fail'">{{ diffDetail.status ? '成功' : '失败' }}</strong></span>
              <span>时间: {{ formatTime(diffDetail.timestamp) }}</span>
            </div>
          </div>
          <div v-else class="modal-empty">此日志无规则内容记录</div>
        </div>
      </div>
    </div>

    <!-- ===================== 容器日志详情弹窗 ===================== -->
    <div class="modal-overlay" v-if="dockerDetailVisible" @click.self="dockerDetailVisible = false">
      <div class="modal docker-detail-modal">
        <div class="modal-header">
          <div class="modal-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
            容器日志
            <code class="modal-sub">{{ dockerDetailGroup?.containerName }}</code>
          </div>
          <div class="modal-header-actions">
            <button class="toggle-btn" :class="{ active: showOnlyError }" @click="showOnlyError = !showOnlyError">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
              {{ showOnlyError ? '显示全部' : '仅看 ERROR' }}
            </button>
            <button class="modal-close" @click="dockerDetailVisible = false">✕</button>
          </div>
        </div>
        <div class="modal-body docker-log-body">
          <div class="log-terminal" ref="logTerminal">
            <div
              v-for="(entry, idx) in dockerDetailEntries"
              :key="idx"
              class="log-entry"
              :class="getLogLevelClass(entry)"
            >
              <span class="log-ts">{{ entry.ts }}</span>
              <span class="log-level" v-if="entry.level">{{ entry.level }}</span>
              <span class="log-text">{{ entry.text }}</span>
            </div>
            <div v-if="dockerDetailEntries.length === 0" class="modal-empty">
              {{ showOnlyError ? '无 ERROR 日志' : '无日志内容' }}
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import http from '@/utils/http'
import DiffViewer from '@/views/components/DiffViewer.vue'

// ===== 全局 =====
const activeTab = ref('ops')
const wsConnected = ref(false)
let ws = null

const switchTab = (tab) => {
  activeTab.value = tab
  if (tab === 'ops' && opsLogs.value.length === 0) fetchOpsLogs()
  if (tab === 'docker' && dockerRawLogs.value.length === 0) fetchDockerLogs()
}

// ===== 系统操作日志 =====
const opsLogs = ref([])
const opsLoading = ref(false)
const opsCurrentPage = ref(1)
const opsPageSize = ref(20)
const opsTotalLogs = ref(0)
const opsTotalPages = ref(0)

const opsSuccessCount = computed(() => opsLogs.value.filter(l => l.status === "SUCCESS").length)
const opsFailCount = computed(() => opsLogs.value.filter(l => l.status === "FAIL").length)
const opsPublishCount = computed(() => opsLogs.value.filter(l => l.action === 'publish').length)

const fetchOpsLogs = async () => {
  opsLoading.value = true
  try {
    const res = await http.get('/api/logs', {
      params: { pageNum: opsCurrentPage.value, pageSize: opsPageSize.value }
    })
    const data = res.data?.data || res.data
    // 只保留 resourceType 为 SYSTEM 的日志
    const allLogs = data.records || data.list || []
    opsLogs.value = allLogs.filter(log => log.resourceType === 'SYSTEM')
    opsTotalLogs.value = opsLogs.value.length
    opsTotalPages.value = Math.ceil(opsTotalLogs.value / opsPageSize.value)
    opsCurrentPage.value = data.current || opsCurrentPage.value
  } catch (err) {
    console.error('获取操作日志失败:', err)
    opsLogs.value = []
    opsTotalLogs.value = 0
    opsTotalPages.value = 0
  } finally {
    opsLoading.value = false
  }
}

const opsGoToPage = (page) => {
  if (page < 1 || page > opsTotalPages.value) return
  opsCurrentPage.value = page
  fetchOpsLogs()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const opsPageSizeChange = () => { opsCurrentPage.value = 1; fetchOpsLogs() }

const opsVisiblePages = computed(() => buildPageList(opsCurrentPage.value, opsTotalPages.value))

// ===== Docker 日志 =====
const dockerRawLogs = ref([])
const dockerLoading = ref(false)
const dockerCurrentPage = ref(1)
const dockerPageSize = ref(20)
const dockerTotalLogs = ref(0)
const dockerTotalPages = ref(0)

const fetchDockerLogs = async () => {
  dockerLoading.value = true
  try {
    const res = await http.get('/api/logs', {
      params: {
        pageNum: dockerCurrentPage.value,
        pageSize: dockerPageSize.value,
        resourceType: 'DOCKER_CONTAINER'
      }
    })
    const data = res.data?.data || res.data
    dockerRawLogs.value = data.records || data.list || []
    dockerTotalLogs.value = data.total || 0
    dockerTotalPages.value = Math.ceil(dockerTotalLogs.value / dockerPageSize.value)
    dockerCurrentPage.value = data.current || dockerCurrentPage.value
  } catch (err) {
    console.error('获取容器日志失败:', err)
    dockerRawLogs.value = []
  } finally {
    dockerLoading.value = false
  }
}

const dockerGoToPage = (page) => {
  if (page < 1 || page > dockerTotalPages.value) return
  dockerCurrentPage.value = page
  fetchDockerLogs()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const dockerPageSizeChange = () => { dockerCurrentPage.value = 1; fetchDockerLogs() }

const dockerVisiblePages = computed(() => buildPageList(dockerCurrentPage.value, dockerTotalPages.value))

// 按容器名分组
const dockerGroups = computed(() => {
  const map = new Map()
  for (const log of dockerRawLogs.value) {
    const name = log.fileName || log.resourceKey || 'unknown'
    if (!map.has(name)) {
      map.set(name, { containerName: name, collectCount: 0, errorCount: 0, lastTime: null, lastMessage: '', logs: [] })
    }
    const g = map.get(name)
    g.collectCount++
    g.logs.push(log)
    if (!g.lastTime || new Date(log.timestamp) > new Date(g.lastTime)) {
      g.lastTime = log.timestamp
      g.lastMessage = log.message || ''
    }
    // 统计 ERROR 行数
    if (log.contentAfter) {
      g.errorCount += (log.contentAfter.match(/\bERROR\b/gi) || []).length
    }
  }
  return Array.from(map.values())
})

const dockerErrorTotal = computed(() => dockerGroups.value.reduce((acc, g) => acc + g.errorCount, 0))

// ===== 容器日志详情弹窗 =====
const dockerDetailVisible = ref(false)
const dockerDetailGroup = ref(null)
const showOnlyError = ref(false)
const logTerminal = ref(null)

const openDockerDetail = (group, errorOnly = false) => {
  dockerDetailGroup.value = group
  showOnlyError.value = errorOnly
  dockerDetailVisible.value = true
  nextTick(() => {
    if (logTerminal.value) logTerminal.value.scrollTop = 0
  })
}

// 解析所有日志行
const dockerDetailEntries = computed(() => {
  if (!dockerDetailGroup.value) return []
  const entries = []
  for (const log of dockerDetailGroup.value.logs) {
    if (!log.contentAfter) continue
    const lines = log.contentAfter.split('\n').filter(Boolean)
    for (const line of lines) {
      const parsed = parseLogLine(line)
      if (showOnlyError.value && parsed.level !== 'ERROR') continue
      entries.push(parsed)
    }
  }
  return entries
})

// 解析单行日志 → { ts, level, text }
const parseLogLine = (line) => {
  // 尝试匹配 ISO 时间前缀: 2024-01-01T12:00:00.000Z ERROR some message
  const m = line.match(/^(\d{4}-\d{2}-\d{2}T[\d:.Z+\-]+)\s+(ERROR|WARN|INFO|DEBUG|TRACE)?\s*(.*)$/i)
  if (m) return { ts: formatTs(m[1]), level: (m[2] || '').toUpperCase() || null, text: m[3] || line }
  // 无法解析时间
  const lvl = line.match(/\b(ERROR|WARN|INFO|DEBUG|TRACE)\b/i)
  return { ts: '', level: lvl ? lvl[1].toUpperCase() : null, text: line }
}

const formatTs = (ts) => {
  try { return new Date(ts).toLocaleString('zh-CN') } catch { return ts }
}

const getLogLevelClass = (entry) => {
  if (!entry.level) return ''
  return { ERROR: 'log-error', WARN: 'log-warn', INFO: 'log-info', DEBUG: 'log-debug' }[entry.level] || ''
}

// ===== 操作链条弹窗 =====
const chainVisible = ref(false)
const chainLoading = ref(false)
const chainLogs = ref([])
const chainResourceKey = ref('')
const chainCurrentId = ref(null)

const openChain = async (log) => {
  chainVisible.value = true
  chainLoading.value = true
  chainResourceKey.value = log.resourceKey || log.fileName || ''
  chainCurrentId.value = log.id
  chainLogs.value = []
  try {
    const res = await http.get('/api/logs/chain', {
      params: { resourceKey: chainResourceKey.value, pageSize: 50 }
    })
    const data = res.data?.data || res.data
    chainLogs.value = data.records || data.list || data || []
  } catch (err) {
    console.error('获取操作链条失败:', err)
    // fallback: 用当前已加载的日志中同 resourceKey 的数据
    chainLogs.value = opsLogs.value.filter(l =>
      (l.resourceKey || l.fileName) === chainResourceKey.value
    ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  } finally {
    chainLoading.value = false
  }
}

// ===== Diff 弹窗 =====
const diffVisible = ref(false)
const diffLoading = ref(false)
const diffBlocks = ref([])
const diffDetail = ref(null)

const openDiff = async (id) => {
  diffVisible.value = true
  diffLoading.value = true
  diffBlocks.value = []
  diffDetail.value = null
  try {
    const [diffRes, detailRes] = await Promise.all([
      http.get(`/api/logs/${id}/diff`),
      http.get(`/api/logs/${id}`)
    ])
    diffBlocks.value = diffRes.data?.data || diffRes.data || []
    diffDetail.value = detailRes.data?.data || detailRes.data || {}
  } catch (err) {
    console.error('获取 diff 失败:', err)
    diffBlocks.value = []
  } finally {
    diffLoading.value = false
  }
}

const closeDiff = () => {
  diffVisible.value = false
  diffLoading.value = false
  diffBlocks.value = []
  diffDetail.value = null
}

// ===== WebSocket =====
const addLogToTable = (log) => {
  log._isNew = true
  const isDocker = log.resourceType === 'DOCKER_CONTAINER'
  if (isDocker) {
    dockerRawLogs.value.unshift(log)
    dockerTotalLogs.value += 1
    if (dockerRawLogs.value.length > dockerPageSize.value) dockerRawLogs.value.pop()
  } else {
    opsLogs.value.unshift(log)
    opsTotalLogs.value += 1
    if (opsLogs.value.length > opsPageSize.value) opsLogs.value.pop()
  }
  setTimeout(() => { log._isNew = false }, 1500)
}

const initWebSocket = () => {
  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    ws = new WebSocket(`${protocol}//${window.location.host}/ws/logs`)
    ws.onopen = () => { wsConnected.value = true }
    ws.onmessage = (e) => { try { addLogToTable(JSON.parse(e.data)) } catch {} }
    ws.onclose = () => {
      wsConnected.value = false
      setTimeout(() => { if (!ws || ws.readyState === WebSocket.CLOSED) initWebSocket() }, 5000)
    }
    ws.onerror = () => { wsConnected.value = false }
  } catch { wsConnected.value = false }
}

// ===== 公共工具 =====
const buildPageList = (current, total) => {
  const pages = []
  if (total <= 7) { for (let i = 1; i <= total; i++) pages.push(i); return pages }
  pages.push(1)
  if (current > 3) pages.push('...')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

const getActionClass = (a) => ({ publish: 'action-publish', reload: 'action-reload', skip: 'action-skip', LOG_COLLECT: 'action-collect' }[a] || 'action-default')
const getActionText = (a) => ({ publish: '发布', reload: '重载', skip: '跳过', LOG_COLLECT: '采集' }[a] || a || '未知')
const getStatusClass = (s) => (s === 1 || s === true || s === 'SUCCESS') ? 'status-success' : 'status-fail'
const getStatusText = (s) => (s === 1 || s === true || s === 'SUCCESS') ? '成功' : (s === 0 || s === false) ? '失败' : '未知'
const formatTime = (time) => {
  if (!time) return '-'
  const d = new Date(time)
  if (isNaN(d.getTime())) return time
  return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

onMounted(() => { fetchOpsLogs(); initWebSocket() })
onUnmounted(() => { if (ws) { ws.onclose = null; ws.close(); ws = null } })
</script>

<style scoped>
/* ===== Tab Bar ===== */
.tab-bar {
  display: flex; align-items: center; gap: 4px;
  margin-bottom: 24px; padding: 4px;
  background: var(--bg-tertiary, #0f172a);
  border: 1px solid var(--border-color, #334155);
  border-radius: 12px; width: fit-content;
}
.tab-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 20px; border-radius: 9px; font-size: 14px; font-weight: 500;
  border: none; background: transparent; color: var(--text-secondary, #94a3b8);
  cursor: pointer; transition: all 0.2s;
}
.tab-btn:hover { color: var(--text-primary, #f1f5f9); background: rgba(255,255,255,0.05); }
.tab-btn.active { background: var(--bg-card, #1e293b); color: var(--text-primary, #f1f5f9); box-shadow: 0 1px 4px rgba(0,0,0,0.3); }
.tab-count { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 700; background: rgba(6,182,212,0.15); color: #22d3ee; }
.tab-count.error { background: rgba(239,68,68,0.15); color: #f87171; }
.ws-indicator { display: flex; align-items: center; gap: 5px; font-size: 11px; padding: 4px 12px; border-radius: 8px; margin-left: 8px; }
.ws-on { background: rgba(16,185,129,0.1); color: #10b981; }
.ws-off { background: rgba(148,163,184,0.1); color: #94a3b8; }
.ws-dot { width: 6px; height: 6px; border-radius: 50%; }
.ws-on .ws-dot { background: #10b981; animation: pulse-ws 2s infinite; }
.ws-off .ws-dot { background: #94a3b8; }
@keyframes pulse-ws { 0%,100%{opacity:1}50%{opacity:.4} }

/* ===== Stats ===== */
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.stat-card {
  background: var(--bg-card, #1e293b); border: 1px solid var(--border-color, #334155);
  border-radius: 14px; padding: 18px 20px; display: flex; align-items: center; gap: 14px;
  transition: all 0.25s;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.2); }
.stat-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.stat-icon.total { background: rgba(6,182,212,.15); color: #22d3ee; }
.stat-icon.success { background: rgba(16,185,129,.15); color: #10b981; }
.stat-icon.fail { background: rgba(239,68,68,.15); color: #f87171; }
.stat-icon.publish { background: rgba(245,158,11,.15); color: #f59e0b; }
.stat-value { font-size: 22px; font-weight: 700; font-family: 'JetBrains Mono', monospace; color: var(--text-primary, #f1f5f9); }
.stat-label { font-size: 12px; color: var(--text-muted, #64748b); margin-top: 2px; }

/* ===== Table Card ===== */
.table-card { background: var(--bg-card, #1e293b); border: 1px solid var(--border-color, #334155); border-radius: 14px; overflow: hidden; }
.table-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid var(--border-color, #334155); }
.table-title { display: flex; align-items: center; gap: 9px; font-size: 15px; font-weight: 600; color: var(--text-primary, #f1f5f9); }
.table-title svg { color: var(--accent-cyan, #06b6d4); }
.table-actions { display: flex; align-items: center; gap: 10px; }
.page-size-select { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--text-secondary, #94a3b8); }
.page-size-select select { background: var(--bg-tertiary, #0f172a); border: 1px solid var(--border-color, #334155); color: var(--text-primary, #f1f5f9); padding: 5px 9px; border-radius: 7px; font-size: 12px; cursor: pointer; }
.btn-refresh { display: flex; align-items: center; gap: 6px; padding: 7px 14px; background: rgba(6,182,212,.1); border: 1px solid rgba(6,182,212,.3); color: #22d3ee; border-radius: 7px; font-size: 12px; cursor: pointer; transition: all .2s; }
.btn-refresh:hover { background: rgba(6,182,212,.2); }
.btn-refresh.spinning svg { animation: spin .8s linear infinite; }
@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
.loading-bar { height: 2px; background: var(--bg-tertiary, #0f172a); overflow: hidden; }
.loading-bar.standalone { border-radius: 2px; margin-bottom: 16px; }
.loading-progress { height: 100%; width: 40%; background: linear-gradient(90deg, #06b6d4, #818cf8); animation: loadSlide 1.2s ease infinite; }
@keyframes loadSlide { 0%{transform:translateX(-100%)} 100%{transform:translateX(350%)} }

/* ===== Table ===== */
.table-wrapper { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table thead { background: var(--bg-tertiary, #0f172a); }
.data-table th { padding: 12px 14px; text-align: left; font-size: 11px; font-weight: 600; color: var(--text-muted, #64748b); text-transform: uppercase; letter-spacing: .5px; white-space: nowrap; border-bottom: 1px solid var(--border-color, #334155); }
.data-table td { padding: 12px 14px; font-size: 13px; color: var(--text-secondary, #94a3b8); border-bottom: 1px solid rgba(255,255,255,.04); }
.tc { text-align: center; }
.data-row { transition: background .15s; }
.data-row:hover { background: rgba(6,182,212,.04); }
.new-row { animation: hlNew 1.5s ease; }
@keyframes hlNew { 0%{background:rgba(6,182,212,.18)} 100%{background:transparent} }
.col-id { width: 70px; }
.id-text { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text-muted, #64748b); }
.tag-mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; padding: 3px 7px; background: var(--bg-tertiary, #0f172a); border-radius: 4px; color: var(--text-secondary, #94a3b8); }
.tag-mono.file { color: #22d3ee; }
.num-text { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; color: var(--text-primary, #f1f5f9); }
.action-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; }
.action-badge.sm { padding: 2px 8px; font-size: 11px; }
.action-publish { background: rgba(6,182,212,.15); color: #22d3ee; border: 1px solid rgba(6,182,212,.3); }
.action-reload { background: rgba(139,92,246,.15); color: #a78bfa; border: 1px solid rgba(139,92,246,.3); }
.action-skip { background: rgba(148,163,184,.15); color: #94a3b8; border: 1px solid rgba(148,163,184,.3); }
.action-collect { background: rgba(245,158,11,.15); color: #fbbf24; border: 1px solid rgba(245,158,11,.3); }
.action-default { background: rgba(148,163,184,.15); color: #94a3b8; border: 1px solid rgba(148,163,184,.3); }
.changed-badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
.changed-yes { background: rgba(245,158,11,.15); color: #fbbf24; }
.changed-no { background: rgba(148,163,184,.1); color: #64748b; }
.status-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
.status-badge.sm { padding: 2px 8px; font-size: 11px; }
.status-dot { width: 5px; height: 5px; border-radius: 50%; }
.status-success { background: rgba(16,185,129,.1); color: #10b981; }
.status-success .status-dot { background: #10b981; }
.status-fail { background: rgba(239,68,68,.1); color: #f87171; }
.status-fail .status-dot { background: #f87171; animation: pulse-sm 2s infinite; }
@keyframes pulse-sm { 0%,100%{opacity:1}50%{opacity:.4} }
.msg-text { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; max-width: 240px; line-height: 1.4; }
.time-text { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-muted, #64748b); white-space: nowrap; }
.ops-btns { display: flex; gap: 4px; justify-content: center; }
.btn-sm { display: inline-flex; align-items: center; gap: 4px; padding: 4px 9px; font-size: 11px; font-weight: 500; border-radius: 5px; cursor: pointer; transition: all .2s; border: 1px solid; }
.btn-chain { background: rgba(6,182,212,.1); border-color: rgba(6,182,212,.3); color: #22d3ee; }
.btn-chain:hover { background: rgba(6,182,212,.2); }
.btn-diff { background: rgba(139,92,246,.1); border-color: rgba(139,92,246,.3); color: #a78bfa; }
.btn-diff:hover { background: rgba(139,92,246,.2); }

/* ===== Pagination ===== */
.pagination { display: flex; align-items: center; justify-content: space-between; padding: 14px 22px; border-top: 1px solid var(--border-color, #334155); }
.pagination-info { font-size: 13px; color: var(--text-muted, #64748b); }
.pagination-info strong { color: var(--text-primary, #f1f5f9); }
.pagination-controls { display: flex; align-items: center; gap: 3px; }
.page-btn { min-width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; background: transparent; border: 1px solid var(--border-color, #334155); color: var(--text-secondary, #94a3b8); border-radius: 7px; cursor: pointer; font-size: 12px; transition: all .2s; }
.page-btn:hover:not(:disabled) { background: rgba(6,182,212,.1); border-color: rgba(6,182,212,.3); color: #22d3ee; }
.page-btn:disabled { opacity: .3; cursor: not-allowed; }
.page-btn.active { background: #06b6d4; border-color: #06b6d4; color: #fff; font-weight: 600; }
.page-ellipsis { padding: 0 5px; color: var(--text-muted, #64748b); font-size: 12px; }

/* ===== Docker 容器卡片 ===== */
.docker-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.docker-title { display: flex; align-items: center; gap: 9px; font-size: 15px; font-weight: 600; color: var(--text-primary, #f1f5f9); }
.docker-title svg { color: #22d3ee; }
.docker-actions { display: flex; align-items: center; gap: 10px; }
.container-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
.container-card {
  background: var(--bg-card, #1e293b); border: 1px solid var(--border-color, #334155);
  border-radius: 14px; padding: 18px; cursor: pointer; transition: all .25s;
}
.container-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.2); border-color: rgba(6,182,212,.3); }
.container-card.has-error { border-color: rgba(239,68,68,.25); }
.container-card.has-error:hover { border-color: rgba(239,68,68,.5); }
.cc-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.cc-icon { width: 26px; height: 26px; border-radius: 6px; background: rgba(6,182,212,.1); color: #22d3ee; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cc-name { font-size: 14px; font-weight: 600; color: var(--text-primary, #f1f5f9); font-family: 'JetBrains Mono', monospace; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.error-pill { display: flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 20px; font-size: 11px; font-weight: 700; background: rgba(239,68,68,.15); color: #f87171; border: 1px solid rgba(239,68,68,.3); white-space: nowrap; }
.ok-pill { padding: 3px 8px; border-radius: 20px; font-size: 11px; font-weight: 500; background: rgba(16,185,129,.1); color: #10b981; border: 1px solid rgba(16,185,129,.3); }
.cc-meta { display: flex; gap: 16px; font-size: 12px; color: var(--text-muted, #64748b); margin-bottom: 10px; }
.cc-meta strong { color: var(--text-secondary, #94a3b8); }
.cc-preview { font-size: 12px; color: var(--text-muted, #64748b); line-height: 1.5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 14px; padding: 8px 10px; background: var(--bg-tertiary, #0f172a); border-radius: 6px; }
.cc-footer { display: flex; gap: 8px; justify-content: flex-end; }
.btn-view-error { display: flex; align-items: center; gap: 5px; padding: 6px 12px; font-size: 12px; font-weight: 500; border: 1px solid rgba(239,68,68,.35); background: rgba(239,68,68,.1); color: #f87171; border-radius: 7px; cursor: pointer; transition: all .2s; }
.btn-view-error:hover { background: rgba(239,68,68,.2); }
.btn-view-all { display: flex; align-items: center; gap: 5px; padding: 6px 12px; font-size: 12px; font-weight: 500; border: 1px solid var(--border-color, #334155); background: transparent; color: var(--text-secondary, #94a3b8); border-radius: 7px; cursor: pointer; transition: all .2s; }
.btn-view-all:hover { border-color: rgba(6,182,212,.3); color: #22d3ee; }

/* ===== Modals ===== */
.modal-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,.65); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal { background: var(--bg-card, #1e293b); border: 1px solid var(--border-color, #334155); border-radius: 16px; display: flex; flex-direction: column; overflow: hidden; }
.chain-modal { width: 680px; max-height: 80vh; }
.diff-modal { width: 90vw; max-width: 1200px; max-height: 85vh; }
.docker-detail-modal { width: 900px; max-height: 82vh; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 15px 22px; border-bottom: 1px solid var(--border-color, #334155); flex-shrink: 0; }
.modal-title { display: flex; align-items: center; gap: 9px; font-size: 14px; font-weight: 600; color: var(--text-primary, #f1f5f9); }
.modal-title svg { color: #22d3ee; }
.modal-sub { font-family: 'JetBrains Mono', monospace; font-size: 12px; padding: 2px 8px; background: var(--bg-tertiary, #0f172a); border-radius: 4px; color: #22d3ee; }
.modal-header-actions { display: flex; align-items: center; gap: 8px; }
.modal-close { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; background: transparent; border: 1px solid var(--border-color, #334155); color: var(--text-muted, #64748b); border-radius: 7px; cursor: pointer; font-size: 14px; transition: all .2s; }
.modal-close:hover { background: rgba(239,68,68,.1); color: #f87171; border-color: rgba(239,68,68,.3); }
.toggle-btn { display: flex; align-items: center; gap: 5px; padding: 5px 12px; font-size: 12px; font-weight: 500; border-radius: 7px; cursor: pointer; transition: all .2s; border: 1px solid var(--border-color, #334155); background: transparent; color: var(--text-secondary, #94a3b8); }
.toggle-btn:hover, .toggle-btn.active { background: rgba(239,68,68,.1); border-color: rgba(239,68,68,.35); color: #f87171; }
.modal-body { flex: 1; overflow: auto; padding: 20px 22px; }
.modal-loading { padding: 48px; text-align: center; color: var(--text-muted, #64748b); font-size: 14px; }
.modal-empty { padding: 48px; text-align: center; color: var(--text-muted, #64748b); font-size: 14px; }

/* ===== 时间线 ===== */
.timeline { display: flex; flex-direction: column; gap: 0; }
.timeline-item { display: flex; gap: 14px; position: relative; padding-bottom: 20px; }
.timeline-item:last-child { padding-bottom: 0; }
.tl-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; margin-top: 6px; position: relative; z-index: 1; }
.tl-dot.status-success { background: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,.2); }
.tl-dot.status-fail { background: #f87171; box-shadow: 0 0 0 3px rgba(239,68,68,.2); }
.tl-connector { position: absolute; left: 5.5px; top: 18px; bottom: 0; width: 1px; background: var(--border-color, #334155); }
.tl-content { flex: 1; background: var(--bg-tertiary, #0f172a); border: 1px solid var(--border-color, #334155); border-radius: 10px; padding: 12px 14px; }
.timeline-item.current .tl-content { border-color: rgba(6,182,212,.4); background: rgba(6,182,212,.04); }
.tl-head { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.tl-time { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-muted, #64748b); margin-left: auto; }
.current-tag { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; background: rgba(6,182,212,.15); color: #22d3ee; }
.tl-meta { display: flex; gap: 14px; font-size: 12px; color: var(--text-muted, #64748b); margin-bottom: 6px; }
.tl-meta strong { color: var(--text-primary, #f1f5f9); }
.tag-yes { color: #fbbf24; }
.tag-no { color: #64748b; }
.tl-msg { font-size: 12px; color: var(--text-secondary, #94a3b8); line-height: 1.5; }

/* ===== 容器日志终端 ===== */
.docker-log-body { padding: 0 !important; }
.log-terminal { background: #0a0f1a; height: 100%; padding: 16px; font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.7; overflow: auto; min-height: 400px; }
.log-entry { display: flex; gap: 12px; padding: 2px 0; border-radius: 3px; }
.log-entry:hover { background: rgba(255,255,255,.03); }
.log-ts { color: #4a5568; white-space: nowrap; flex-shrink: 0; }
.log-level { font-weight: 700; flex-shrink: 0; min-width: 48px; }
.log-text { color: #94a3b8; word-break: break-all; }
.log-error .log-level { color: #f87171; }
.log-error .log-text { color: #fca5a5; }
.log-error { background: rgba(239,68,68,.04); }
.log-warn .log-level { color: #fbbf24; }
.log-warn .log-text { color: #fde68a; }
.log-info .log-level { color: #34d399; }
.log-debug .log-level { color: #818cf8; }

/* ===== Diff Meta ===== */
.diff-meta { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border-color, #334155); font-size: 13px; color: var(--text-muted, #64748b); }
.diff-meta code { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #22d3ee; }
.diff-meta strong { color: var(--text-primary, #f1f5f9); }
.meta-success { color: #10b981 !important; }
.meta-fail { color: #f87171 !important; }

/* ===== Empty ===== */
.empty-row { text-align: center; padding: 52px 20px !important; }
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--text-muted, #64748b); }
.empty-state.padded { padding: 60px 20px; }
.empty-state svg { opacity: .3; }

/* ===== Responsive ===== */
@media (max-width: 1200px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) {
  .stats-row { grid-template-columns: 1fr 1fr; }
  .table-header { flex-direction: column; gap: 10px; align-items: flex-start; }
  .pagination { flex-direction: column; gap: 10px; }
  .container-grid { grid-template-columns: 1fr; }
  .chain-modal, .docker-detail-modal { width: 95vw; }
}
</style>