<template>
  <div class="nop-page">
    <nav class="nop-bc" aria-label="面包屑">
      <span>通知管理</span>
      <span class="nop-bc-sep">/</span>
      <span class="nop-bc-current">通知对象</span>
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
            <th>值班表</th>
            <th class="nw">更新时间</th>
            <th>操作人</th>
            <th v-if="list.length >= 1" class="nop-col-actions nw">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pagedRows.length === 0">
            <td :colspan="list.length >= 1 ? 5 : 4" class="nop-empty">暂无数据</td>
          </tr>
          <tr v-for="record in pagedRows" :key="record.id ?? record.uuid">
            <td>
              <div>
                <button type="button" class="nop-linkish" @click="openHistory(record)">{{ record.name }}</button>
              </div>
              <div class="nop-sub">
                <span :title="'点击复制 ID'" class="nop-uuid" @click="copyUuid(record.uuid)">
                  {{ record.uuid }}
                </span>
                <button type="button" class="nop-icon-copy" title="复制 ID" @click="copyUuid(record.uuid)">⎘</button>
              </div>
            </td>
            <td>
              <span v-for="(tag, ti) in dutyTags(record)" :key="ti" class="nop-tag">{{ tag }}</span>
            </td>
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

    <NoticeObjectFormDrawer
      :open="createDrawerOpen"
      variant="create"
      :record="createPrefill"
      @close="closeCreate"
      @success="handleList"
      @toast="showToast"
    />
    <NoticeObjectFormDrawer
      :open="updateDrawerOpen"
      variant="update"
      :record="updateRow"
      @close="closeUpdate"
      @success="handleList"
      @toast="showToast"
    />

    <Teleport to="body">
      <div v-if="historyOpen" class="nod-mask" @click.self="historyOpen = false">
        <aside class="nod-panel hist" @click.stop>
          <header class="nod-head">
            <h2 class="nod-title">通知记录 - {{ historyTitle }}</h2>
            <button type="button" class="nod-x" aria-label="关闭" @click="historyOpen = false">×</button>
          </header>
          <div class="hist-body">
            <NoticeRecords v-if="historyUuid" embedded :notice-object-id="historyUuid" />
          </div>
        </aside>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getDutyManagerList } from '@/api/duty'
import { noticeDelete, noticeList } from '@/api/notice'
import { useNoticePerm } from '@/composables/useNoticePerm'
import { onNopMoreToggle } from '@/utils/nopMoreMenu'
import NoticeObjectFormDrawer from './NoticeObjectFormDrawer.vue'
import NoticeRecords from '@/views/notice/NoticeRecords.vue'

const perm = useNoticePerm()

const loading = ref(false)
const pageError = ref('')
const list = ref([])
const dutyList = ref([])
const searchInput = ref('')
const activeQuery = ref('')

const pageIndex = ref(1)
const pageSize = 10

const createDrawerOpen = ref(false)
const createPrefill = ref(null)
const updateDrawerOpen = ref(false)
const updateRow = ref(null)

const historyOpen = ref(false)
const historyUuid = ref('')
const historyTitle = ref('')

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

function getDutyNameById(id) {
  const d = dutyList.value.find((x) => String(x.id) === String(id))
  return d?.name || '-'
}

function dutyTags(record) {
  const raw = record.dutyId
  if (raw == null || raw === '') return ['-']
  const ids = String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (!ids.length) return ['-']
  return ids.map((id) => getDutyNameById(id))
}

function formatUpdateAt(text) {
  if (text == null || !Number.isFinite(Number(text))) return '—'
  const d = new Date(Number(text) * 1000)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

async function copyUuid(uuid) {
  try {
    await navigator.clipboard.writeText(uuid)
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
    const [duties, data] = await Promise.all([
      getDutyManagerList(),
      noticeList({ query: activeQuery.value.trim() || undefined })
    ])
    dutyList.value = duties
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
  if (!window.confirm(`确定要删除吗?\n\n通知对象名称: ${record.name}`)) return
  noticeDelete({ uuid: record.uuid, name: record.name })
    .then(() => {
      showToast({ message: '通知对象删除成功', type: 'success' })
      return handleList()
    })
    .catch((e) => {
      pageError.value = e instanceof Error ? e.message : '删除失败'
    })
}

function openHistory(record) {
  historyTitle.value = record.name
  historyUuid.value = record.uuid
  historyOpen.value = true
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
  min-width: 720px;
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
.nop-linkish {
  border: none;
  background: none;
  padding: 0;
  color: #2563eb;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  text-align: left;
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
.nop-tag {
  display: inline-block;
  margin: 2px 4px 2px 0;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  background: #e0f2fe;
  color: #0369a1;
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
.hist-body {
  flex: 1;
  overflow: auto;
  padding: 0 12px 16px;
}
.nod-panel.hist {
  width: min(960px, 100vw);
}
</style>

<style>
/* Teleport 抽屉与表单抽屉共用遮罩类名 */
.nop-page .nod-mask,
.nod-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  z-index: 1100;
  display: flex;
  justify-content: flex-end;
}
.nop-page .nod-panel,
.nod-panel {
  width: 820px;
  max-width: 100vw;
  height: 100%;
  background: var(--bg-surface, #fff);
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
}
.nop-page .nod-head,
.nod-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-default, #e5e7eb);
}
.nop-page .nod-title,
.nod-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.nop-page .nod-x,
.nod-x {
  border: none;
  background: none;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  color: #64748b;
}
</style>
