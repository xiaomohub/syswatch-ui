<template>
  <div class="nop-page">
    <nav class="nop-bc" aria-label="面包屑">
      <span>通知管理</span>
      <span class="nop-bc-sep">/</span>
      <span class="nop-bc-current">通知模版</span>
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
      <button
        v-if="perm.canCreate()"
        type="button"
        class="nop-btn primary"
        @click="openCreate"
      >
        创建
      </button>
    </div>

    <p v-if="pageError" class="nop-err">{{ pageError }}</p>

    <div class="nop-table-wrap">
      <div v-if="loading" class="nop-loading"><span class="spinner" />加载中…</div>
      <table v-else class="nop-table">
        <thead>
          <tr>
            <th>名称</th>
            <th>模版类型</th>
            <th>描述</th>
            <th class="nw">更新时间</th>
            <th>操作人</th>
            <th v-if="list.length >= 1" class="nop-col-actions nw">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pagedRows.length === 0">
            <td :colspan="list.length >= 1 ? 6 : 5" class="nop-empty">暂无数据</td>
          </tr>
          <tr
            v-for="record in pagedRows"
            :key="rowKey(record)"
            :class="{ 'nop-row-feishu-click': canQuickEditFeishu(record) }"
            :title="canQuickEditFeishu(record) ? '点击蓝色区域进入编辑（飞书模版）' : undefined"
            @click="onFeishuRowClick(record, $event)"
          >
            <td>
              <div class="nt-name" :class="{ 'nop-link-hit': canQuickEditFeishu(record) }">{{ record.name }}</div>
              <div class="nop-sub">
                <span :title="'点击复制 ID'" class="nop-uuid" @click="copyId(rowKey(record))">
                  {{ rowKey(record) }}
                </span>
                <button type="button" class="nop-icon-copy" title="复制 ID" @click="copyId(rowKey(record))">⎘</button>
              </div>
            </td>
            <td :class="{ 'nop-link-td': canQuickEditFeishu(record) }">
              <NotificationTypeIcon v-if="typeLabel(record.noticeType)" :type="record.noticeType" />
              <span v-else class="muted">-</span>
            </td>
            <td :class="{ 'nop-link-td': canQuickEditFeishu(record) }">{{ descCell(record.description) }}</td>
            <td class="nw">{{ formatUpdateAt(record.updateAt) }}</td>
            <td>
              <span class="nop-pill">{{ record.updateBy || '未知用户' }}</span>
            </td>
            <td v-if="list.length >= 1" class="nw">
              <details class="nop-more" @toggle="onNopMoreToggle">
                <summary class="nop-more-btn">⋯</summary>
                <div class="nop-more-menu">
                  <button
                    v-if="perm.canUpdate()"
                    type="button"
                    class="nop-menu-item"
                    @click="openUpdate(record)"
                  >
                    更新
                  </button>
                  <button
                    v-if="perm.canCreate()"
                    type="button"
                    class="nop-menu-item"
                    @click="handleCopy(record)"
                  >
                    复制
                  </button>
                  <button
                    v-if="perm.canDelete()"
                    type="button"
                    class="nop-menu-item danger"
                    @click="confirmDelete(record)"
                  >
                    删除
                  </button>
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

    <NoticeTemplateFormDrawer
      :open="createDrawerOpen"
      variant="create"
      :record="createPrefill"
      @close="closeCreate"
      @success="handleList"
      @toast="showToast"
    />
    <NoticeTemplateFormDrawer
      :open="updateDrawerOpen"
      variant="update"
      :record="updateRow"
      @close="closeUpdate"
      @success="handleList"
      @toast="showToast"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { deleteNoticeTmpl, getNoticeTmplList } from '@/api/noticeTmpl'
import { useNoticeTmplPerm } from '@/composables/useNoticeTmplPerm'
import { onNopMoreToggle } from '@/utils/nopMoreMenu'
import NotificationTypeIcon from '@/views/notice-objects/NotificationTypeIcon.vue'
import NoticeTemplateFormDrawer from './NoticeTemplateFormDrawer.vue'

const TMPL_TYPES = new Set(['FeiShu', 'Email', 'DingDing', 'WeChat', 'Slack'])

const perm = useNoticeTmplPerm()

const loading = ref(false)
const pageError = ref('')
const list = ref([])
const searchInput = ref('')
const activeQuery = ref('')

const pageIndex = ref(1)
const pageSize = 10

const createDrawerOpen = ref(false)
const createPrefill = ref(null)
const updateDrawerOpen = ref(false)
const updateRow = ref(null)

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

function rowKey(record) {
  return record.id ?? record.uuid ?? ''
}

function typeLabel(noticeType) {
  return noticeType && TMPL_TYPES.has(String(noticeType))
}

function isFeishuTemplate(record) {
  return String(record?.noticeType ?? '') === 'FeiShu'
}

function canQuickEditFeishu(record) {
  return perm.canUpdate() && isFeishuTemplate(record)
}

/** 飞书模版：点击行内区域直接打开编辑（与 ⋯ → 更新 相同），排除 ID 复制与操作菜单 */
function onFeishuRowClick(record, e) {
  if (!canQuickEditFeishu(record)) return
  const el = e.target
  if (!(el instanceof Element)) return
  if (el.closest('.nop-sub, .nop-more, .nop-more-menu, button, summary, a, input, textarea, label')) return
  openUpdate(record)
}

function descCell(text) {
  const s = String(text ?? '').trim()
  return s ? s : '-'
}

function formatUpdateAt(text) {
  if (text == null || !Number.isFinite(Number(text))) return '—'
  const d = new Date(Number(text) * 1000)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

async function copyId(id) {
  const s = String(id ?? '')
  if (!s) return
  try {
    await navigator.clipboard.writeText(s)
    showToast({ message: '已复制 ID', type: 'success' })
  } catch {
    pageError.value = '复制失败（浏览器权限）'
  }
}

async function handleList() {
  pageError.value = ''
  if (!perm.canList()) {
    pageError.value = '无列表权限'
    list.value = []
    return
  }
  loading.value = true
  try {
    const q = activeQuery.value.trim()
    const data = await getNoticeTmplList(q ? { query: q } : {})
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
  createPrefill.value = null
  createDrawerOpen.value = true
}

function closeCreate() {
  createDrawerOpen.value = false
  createPrefill.value = null
}

function openUpdate(record) {
  updateRow.value = record
  updateDrawerOpen.value = true
  document.querySelectorAll('.nop-more').forEach((el) => {
    el.removeAttribute('open')
  })
}

function closeUpdate() {
  updateDrawerOpen.value = false
  updateRow.value = null
}

function handleCopy(record) {
  const copied = JSON.parse(JSON.stringify(record))
  copied.name = `${record.name}-复制`
  createPrefill.value = copied
  createDrawerOpen.value = true
  document.querySelectorAll('.nop-more').forEach((el) => {
    el.removeAttribute('open')
  })
}

function confirmDelete(record) {
  document.querySelectorAll('.nop-more').forEach((el) => {
    el.removeAttribute('open')
  })
  const id = rowKey(record)
  if (!id) {
    pageError.value = '无法删除：缺少模版 ID'
    return
  }
  if (!window.confirm(`确定要删除此模版吗?\n\n模版名称: ${record.name}`)) return
  deleteNoticeTmpl({ id, name: record.name })
    .then(() => {
      showToast({ message: '通知模版删除成功', type: 'success' })
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
.nop-bc-sep {
  margin: 0 8px;
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
  min-width: 800px;
}
.nop-table tbody tr.nop-row-feishu-click {
  cursor: pointer;
}
.nop-table tbody tr.nop-row-feishu-click:hover td {
  background: #eff6ff;
}
/* 飞书可编辑行：蓝色链接感，提示可点 */
.nop-table tbody tr.nop-row-feishu-click .nop-link-hit {
  color: #2563eb;
  text-decoration: underline;
  text-underline-offset: 3px;
  font-weight: 600;
}
.nop-table tbody tr.nop-row-feishu-click:hover .nop-link-hit {
  color: #1d4ed8;
}
.nop-table tbody tr.nop-row-feishu-click td.nop-link-td {
  color: #2563eb;
  font-weight: 500;
}
.nop-table tbody tr.nop-row-feishu-click:hover td.nop-link-td {
  color: #1d4ed8;
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
.nt-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
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
