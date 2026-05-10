<template>
  <div class="fc-page">
    <p v-if="pageError" class="fc-page-error">{{ pageError }}</p>
    <p v-if="pageSuccess" class="fc-page-success">{{ pageSuccess }}</p>

    <div class="fc-page-head fc-list-head fc-head-unified">
      <div class="fc-head-start">
        <button
          type="button"
          class="fc-back-dashboard"
          aria-label="返回监控面板"
          title="返回监控面板"
          @click="goDashboard"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2 class="fc-list-title">值班中心</h2>
      </div>
      <div class="fc-head-end">
        <button type="button" class="btn btn-primary fc-create-btn" @click="openCreate">创建</button>
      </div>
    </div>

    <div v-if="loading" class="fc-loading"><div class="spinner"></div>加载中…</div>
    <div v-else-if="rows.length === 0" class="fc-empty-cards">
      <h3 class="fc-empty-title">暂无值班表</h3>
      <p class="muted">点击「创建」添加值班表，配置名称、描述与负责人。</p>
    </div>
    <div v-else class="fc-table-card duty-table">
      <div class="duty-grid-head" role="row">
        <div>名称</div>
        <div>负责人</div>
        <div>今日值班</div>
        <div>更新时间</div>
        <div>操作人</div>
        <div class="col-actions">操作</div>
      </div>
      <div
        v-for="row in rows"
        :key="row.id"
        class="duty-grid-row"
        role="button"
        tabindex="0"
        @click="goCalendar(row)"
        @keyup.enter="goCalendar(row)"
      >
        <div class="col-name">
          <span class="title linkish">{{ row.name || '—' }}</span>
          <div class="sub">
            <code>{{ row.id }}</code>
            <button type="button" class="link-btn" title="复制 ID" @click.stop="copyId(row.id)">复制</button>
          </div>
        </div>
        <div>{{ row.manager?.username || '—' }}</div>
        <div class="col-tags">
          <template v-if="dutyUserTags(row).length">
            <span v-for="(t, i) in dutyUserTags(row)" :key="i" class="duty-tag">{{ t }}</span>
          </template>
          <span v-else class="muted">暂无</span>
        </div>
        <div class="mono">{{ formatUpdateAt(row.updateAt) }}</div>
        <div>{{ row.updateBy || '未知用户' }}</div>
        <div class="col-actions" @click.stop>
          <button type="button" class="link-btn" @click="goCalendar(row)">进入</button>
          <button type="button" class="link-btn" @click="openEdit(row)">编辑</button>
          <button type="button" class="link-btn danger" @click="confirmDelete(row)">删除</button>
        </div>
      </div>
    </div>

    <DutyFormModal
      :open="formOpen"
      :mode="formMode"
      :duty="formDuty"
      @close="formOpen = false"
      @saved="onFormSaved"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getDutyManagerList, deleteDutyManager } from '@/api/duty'
import DutyFormModal from './DutyFormModal.vue'
import '../faultcenter/faultCenterCommon.css'

const router = useRouter()

const pageError = ref('')
const pageSuccess = ref('')
const loading = ref(false)
const rows = ref([])

const formOpen = ref(false)
const formMode = ref('create')
const formDuty = ref(null)

let successTimer

function flashSuccess(msg) {
  pageSuccess.value = msg
  clearTimeout(successTimer)
  successTimer = setTimeout(() => {
    pageSuccess.value = ''
  }, 3200)
}

function goDashboard() {
  router.push({ name: 'Dashboard' })
}

/** @param {{ curDutyUser?: Array<Record<string, string>> }} row */
function dutyUserTags(row) {
  const raw = row.curDutyUser
  if (!Array.isArray(raw) || raw.length === 0) return []
  return raw.map((u) => u?.username || u?.userName || u?.userid || '—').filter(Boolean)
}

function formatUpdateAt(text) {
  if (text == null || text === '') return '—'
  const n = Number(text)
  if (Number.isFinite(n)) {
    return new Date(n < 1e12 ? n * 1000 : n).toLocaleString()
  }
  return String(text)
}

async function loadList() {
  pageError.value = ''
  loading.value = true
  try {
    rows.value = await getDutyManagerList()
  } catch (e) {
    rows.value = []
    pageError.value = e?.message || '加载列表失败'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  formMode.value = 'create'
  formDuty.value = null
  formOpen.value = true
}

function openEdit(row) {
  formMode.value = 'update'
  formDuty.value = row
  formOpen.value = true
}

async function onFormSaved() {
  await loadList()
  flashSuccess(formMode.value === 'update' ? '值班表已更新。' : '值班表已创建。')
}

function goCalendar(row) {
  if (!row?.id) return
  router.push({
    name: 'DutyCalendar',
    params: { id: row.id },
    query: { calendarName: row.name || '' }
  })
}

async function copyId(id) {
  try {
    await navigator.clipboard.writeText(String(id))
    flashSuccess('已复制 ID')
  } catch {
    pageError.value = '复制失败，请手动选择复制。'
  }
}

function confirmDelete(row) {
  if (!row?.id) return
  const ok = window.confirm(`确定删除值班表「${row.name || row.id}」吗？`)
  if (!ok) return
  deleteDutyManager({ id: row.id, name: row.name })
    .then(() => {
      flashSuccess('已删除。')
      return loadList()
    })
    .catch((e) => {
      pageError.value = e?.message || '删除失败'
    })
}

onMounted(loadList)
</script>

<style scoped>
.duty-table .duty-grid-head,
.duty-table .duty-grid-row {
  display: grid;
  grid-template-columns: minmax(140px, 1.5fr) minmax(72px, 0.7fr) minmax(100px, 1fr) minmax(120px, 1fr) minmax(72px, 0.65fr) minmax(148px, 1fr);
  gap: 10px;
  padding: 12px 16px;
  align-items: center;
  font-size: 13px;
}

.duty-table .duty-grid-head {
  background: var(--bg-tertiary);
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.duty-table .duty-grid-row {
  border-top: 1px solid var(--border-default);
  cursor: pointer;
}

.duty-table .duty-grid-row:hover {
  background: var(--bg-subtle);
}

.col-name .title {
  font-weight: 600;
  color: var(--text-primary);
}

.linkish {
  color: var(--brand-700);
}

.col-name .sub {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.col-name code {
  font-size: 11px;
  color: var(--text-muted);
  word-break: break-all;
}

.col-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.duty-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  background: var(--brand-50);
  border: 1px solid var(--border-default);
  color: var(--text-secondary);
}

.mono {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  color: var(--text-muted);
}

.col-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  justify-content: flex-end;
}

.muted {
  color: var(--text-muted);
  font-size: 12px;
}
</style>
