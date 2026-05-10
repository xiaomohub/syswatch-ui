<template>
  <div class="nop-page">
    <nav class="nop-bc" aria-label="面包屑">
      <span class="nop-bc-current">数据源</span>
    </nav>

    <div class="nop-toolbar">
      <div class="nop-search-wrap">
        <input
          v-model="searchInput"
          class="nop-search"
          style="width: 300px"
          type="search"
          placeholder="输入搜索关键字"
          @keydown.enter.prevent="onSearch"
        >
        <button type="button" class="nop-btn ghost" @click="clearSearch">清空</button>
        <button type="button" class="nop-btn" @click="onSearch">搜索</button>
      </div>
      <button type="button" class="nop-btn primary" @click="openCreate">创建</button>
    </div>

    <p v-if="pageError" class="nop-err">{{ pageError }}</p>

    <div class="nop-table-wrap">
      <div v-if="loading" class="nop-loading"><span class="spinner" />加载中…</div>
      <table v-else class="nop-table">
        <thead>
          <tr>
            <th>名称</th>
            <th>数据源类型</th>
            <th>描述</th>
            <th class="nw">更新时间</th>
            <th>操作人</th>
            <th>状态</th>
            <th v-if="list.length >= 1" class="nop-col-actions nw">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pagedRows.length === 0">
            <td :colspan="list.length >= 1 ? 7 : 6" class="nop-empty">暂无数据</td>
          </tr>
          <tr v-for="record in pagedRows" :key="record.id">
            <td>
              <div class="ds-name">{{ record.name }}</div>
              <div class="nop-sub">
                <span :title="'点击复制 ID'" class="nop-uuid" @click="copyId(record.id)">
                  {{ record.id }}
                </span>
                <button type="button" class="nop-icon-copy" title="复制 ID" @click="copyId(record.id)">⎘</button>
              </div>
            </td>
            <td>
              <div class="ds-type-cell">
                <span class="ds-type-abbr" :title="record.type">{{ typeAbbr(record.type) }}</span>
                <span class="ds-type-text">{{ record.type || '—' }}</span>
              </div>
            </td>
            <td>{{ record.description?.trim() ? record.description : '没有留下任何描述~' }}</td>
            <td class="nw">{{ formatUpdateAt(record.updateAt) }}</td>
            <td>
              <span class="nop-pill">{{ record.updateBy || '未知用户' }}</span>
            </td>
            <td class="nw">
              <div class="ds-enable-cell">
                <button
                  type="button"
                  class="ds-enable-switch"
                  role="switch"
                  :aria-checked="isRecordEnabled(record)"
                  :aria-label="(isRecordEnabled(record) ? '禁用' : '启用') + '数据源 ' + (record.name || '')"
                  :disabled="loading || togglingId === String(record.id)"
                  @click.stop="toggleRecordEnabled(record)"
                >
                  <span class="ds-enable-knob" aria-hidden="true" />
                </button>
                <span
                  class="ds-status-label"
                  :class="isRecordEnabled(record) ? 'ds-status-label-on' : 'ds-status-label-off'"
                >
                  {{ isRecordEnabled(record) ? '启用' : '禁用' }}
                </span>
              </div>
            </td>
            <td v-if="list.length >= 1" class="nw">
              <details class="nop-more" @toggle="onNopMoreToggle">
                <summary class="nop-more-btn">⋯</summary>
                <div class="nop-more-menu">
                  <button type="button" class="nop-menu-item" @click="openUpdate(record)">更新</button>
                  <button type="button" class="nop-menu-item danger" @click="confirmDelete(record)">删除</button>
                </div>
              </details>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!loading && total > pageSize" class="nop-pager">
      <span class="muted">{{ showTotalText }}</span>
      <button type="button" class="nop-btn sm" :disabled="pageIndex <= 1" @click="goPage(pageIndex - 1)">上一页</button>
      <button type="button" class="nop-btn sm" :disabled="pageIndex >= totalPages" @click="goPage(pageIndex + 1)">下一页</button>
    </div>

    <div v-if="toast.message" class="nop-toast" :class="toast.type">{{ toast.message }}</div>

    <DatasourceFormDrawer
      :open="createOpen"
      variant="create"
      @close="closeCreate"
      @success="handleList"
      @toast="showToast"
    />
    <DatasourceFormDrawer
      :open="updateOpen"
      variant="update"
      :record="updateRow"
      @close="closeUpdate"
      @success="handleList"
      @toast="showToast"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { deleteDatasource, getDatasource, getDatasourceList, updateDatasource } from '@/api/datasource'
import { onNopMoreToggle } from '@/utils/nopMoreMenu'
import DatasourceFormDrawer from './DatasourceFormDrawer.vue'

const loading = ref(false)
const pageError = ref('')
const list = ref([])
const searchInput = ref('')
const activeQuery = ref('')

const pageIndex = ref(1)
const pageSize = 10

const createOpen = ref(false)
const updateOpen = ref(false)
const updateRow = ref(null)

/** 正在切换启用状态的行 id，用于禁用开关防重复提交 */
const togglingId = ref('')

const toast = ref({ message: '', type: 'success' })
let toastTimer

function showToast({ message, type = 'success' }) {
  toast.value = { message, type }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = { message: '', type: 'success' }
  }, 3200)
}

const total = computed(() => list.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const pagedRows = computed(() => {
  const start = (pageIndex.value - 1) * pageSize
  return list.value.slice(start, start + pageSize)
})

const showTotalText = computed(() => {
  const t = total.value
  const [a, b] = [Math.min((pageIndex.value - 1) * pageSize + 1, t), Math.min(pageIndex.value * pageSize, t)]
  return `共 ${t} 条${t ? ` · 第 ${a}-${b} 条` : ''}`
})

function isRecordEnabled(record) {
  return record.enabled !== false && record.enabled !== 0
}

async function toggleRecordEnabled(record) {
  const id = record.id != null ? String(record.id) : ''
  if (!id || togglingId.value) return
  const next = !isRecordEnabled(record)
  togglingId.value = id
  pageError.value = ''
  try {
    const detail = await getDatasource({ id })
    if (!detail || typeof detail !== 'object') {
      throw new Error('获取数据源详情失败')
    }
    await updateDatasource({ ...detail, id, enabled: next })
    showToast({ message: next ? '已启用数据源' : '已禁用数据源', type: 'success' })
    await handleList()
  } catch (e) {
    pageError.value = e instanceof Error ? e.message : '更新启用状态失败'
  } finally {
    togglingId.value = ''
  }
}

function typeAbbr(t) {
  if (!t) return '?'
  if (t === 'AliCloudSLS') return 'SLS'
  if (t === 'ElasticSearch') return 'ES'
  if (t === 'VictoriaLogs') return 'VL'
  if (t === 'ClickHouse') return 'CH'
  return String(t).slice(0, 2).toUpperCase()
}

function formatUpdateAt(text) {
  if (text == null || !Number.isFinite(Number(text))) return '—'
  const d = new Date(Number(text) * 1000)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

async function copyId(id) {
  try {
    await navigator.clipboard.writeText(String(id))
    showToast({ message: '已复制 ID', type: 'success' })
  } catch {
    pageError.value = '复制失败（浏览器权限）'
  }
}

async function handleList() {
  pageError.value = ''
  loading.value = true
  try {
    const q = activeQuery.value.trim()
    const data = await getDatasourceList(q ? { query: q } : {})
    list.value = Array.isArray(data) ? data : []
    pageIndex.value = 1
  } catch (e) {
    list.value = []
    pageError.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function onSearch() {
  activeQuery.value = searchInput.value
  handleList()
}

function clearSearch() {
  searchInput.value = ''
  activeQuery.value = ''
  handleList()
}

function goPage(p) {
  pageIndex.value = Math.max(1, Math.min(p, totalPages.value))
}

function openCreate() {
  createOpen.value = true
}

function closeCreate() {
  createOpen.value = false
}

function openUpdate(record) {
  updateRow.value = record
  updateOpen.value = true
  document.querySelectorAll('.nop-more').forEach((el) => {
    el.removeAttribute('open')
  })
}

function closeUpdate() {
  updateOpen.value = false
  updateRow.value = null
}

function confirmDelete(record) {
  document.querySelectorAll('.nop-more').forEach((el) => {
    el.removeAttribute('open')
  })
  const name = record.name ?? ''
  if (!window.confirm(`确定要删除吗?\n\n数据源名称: ${name}`)) return
  deleteDatasource({ id: record.id, name })
    .then(() => {
      showToast({ message: '数据源删除成功', type: 'success' })
      return handleList()
    })
    .catch((e) => {
      pageError.value = e instanceof Error ? e.message : '删除失败'
    })
}

onMounted(() => {
  handleList()
})

onUnmounted(() => {
  clearTimeout(toastTimer)
})
</script>

<style scoped>
@import './datasources.css';

.nop-page {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 120px);
  min-height: calc(100dvh - 120px);
}
.nop-bc {
  flex-shrink: 0;
  font-size: 13px;
  color: #64748b;
  margin-bottom: 16px;
}
.nop-bc-current {
  color: var(--text-primary, #0f172a);
  font-weight: 600;
}
.nop-toolbar {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.nop-search-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.nop-search {
  padding: 8px 10px;
  border: 1px solid var(--border-default, #e5e7eb);
  border-radius: 8px;
  font-size: 13px;
  box-sizing: border-box;
}
.nop-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-default, #e5e7eb);
  background: #fff;
  font-size: 13px;
  cursor: pointer;
}
.nop-btn.primary {
  background: #111827;
  color: #fff;
  border-color: #111827;
}
.nop-btn.ghost {
  background: #f8fafc;
}
.nop-btn.sm {
  padding: 4px 10px;
  font-size: 12px;
}
.nop-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.nop-err {
  flex-shrink: 0;
  color: #b91c1c;
  font-size: 13px;
  margin-bottom: 8px;
}
.nop-table-wrap {
  flex: 1 1 0;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--border-default, #e5e7eb);
  border-radius: 10px;
  background: #fff;
}
.nop-loading {
  padding: 28px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #64748b;
}
.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #e5e7eb;
  border-top-color: #334155;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.nop-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 900px;
}
.nop-table th,
.nop-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-default, #e5e7eb);
  vertical-align: middle;
}
.nop-table th {
  background: #fafafa;
  font-weight: 600;
}
.nw {
  white-space: nowrap;
}
.nop-empty {
  text-align: center;
  color: #94a3b8;
  padding: 32px;
}
.ds-name {
  font-weight: 600;
  color: #0f172a;
}
.nop-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 6px;
}
.nop-uuid {
  cursor: pointer;
  word-break: break-all;
}
.nop-icon-copy {
  border: none;
  background: none;
  cursor: pointer;
  color: #64748b;
  padding: 0 4px;
}
.ds-type-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ds-type-abbr {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #f1f5f9;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  flex-shrink: 0;
}
.ds-type-text {
  font-size: 12px;
  color: #334155;
}
.ds-enable-cell {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.ds-enable-switch {
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  border: none;
  padding: 0;
  cursor: pointer;
  flex-shrink: 0;
  background: #cbd5e1;
  transition: background 0.15s ease;
}
.ds-enable-switch[aria-checked='true'] {
  background: #22c55e;
}
.ds-enable-switch:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.ds-enable-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
  transition: transform 0.15s ease;
}
.ds-enable-switch[aria-checked='true'] .ds-enable-knob {
  transform: translateX(20px);
}
.ds-status-label {
  font-size: 13px;
  font-weight: 500;
}
.ds-status-label-on {
  color: #15803d;
}
.ds-status-label-off {
  color: #64748b;
}
.nop-pill {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  background: #f1f5f9;
  color: #475569;
}
.nop-col-actions {
  width: 60px;
}
.nop-more {
  position: relative;
}
.nop-more-btn {
  list-style: none;
  cursor: pointer;
  text-align: center;
  font-size: 18px;
  color: #475569;
  user-select: none;
}
.nop-more summary::-webkit-details-marker {
  display: none;
}
.nop-more-menu {
  position: fixed;
  min-width: 120px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  z-index: 400;
  padding: 4px 0;
}
.nop-menu-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  border: none;
  background: none;
  font-size: 13px;
  cursor: pointer;
}
.nop-menu-item:hover {
  background: #f8fafc;
}
.nop-menu-item.danger {
  color: #b91c1c;
}
.nop-pager {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}
.muted {
  color: #64748b;
  font-size: 13px;
}
.nop-toast {
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1200;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 14px;
  background: #111827;
  color: #fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}
.nop-toast.success {
  background: #166534;
}
.nop-toast.error {
  background: #991b1b;
}
</style>
