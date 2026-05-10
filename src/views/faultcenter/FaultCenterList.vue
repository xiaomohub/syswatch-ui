<template>
  <div class="fc-page">
    <p v-if="pageError" class="fc-page-error">{{ pageError }}</p>

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
        <h2 class="fc-list-title">故障中心</h2>
      </div>
      <div class="fc-head-end">
        <button v-if="perm.canCreate()" type="button" class="btn btn-primary fc-create-btn" @click="goCreate">创建</button>
        <p v-else class="muted small" style="margin: 0">当前角色无创建权限。</p>
      </div>
    </div>

    <div class="fc-toolbar fc-list-toolbar">
      <div class="search-box fc-list-search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="filterQuery"
          type="text"
          class="search-input"
          placeholder="输入搜索关键字"
          @keyup.enter="loadList"
        />
        <button v-if="filterQuery" type="button" class="btn btn-text sm" title="清除" @click="clearSearch">清除</button>
        <button type="button" class="btn btn-secondary" :disabled="loading || !perm.canList()" @click="loadList">
          搜索
        </button>
      </div>
    </div>

    <div v-if="loading" class="fc-loading"><div class="spinner"></div>加载中…</div>
    <div v-else-if="centers.length === 0" class="fc-empty-cards">
      <h3 class="fc-empty-title">开始创建第一个故障中心</h3>
      <p class="muted">通过创建故障中心来统一管理您的告警信息</p>
    </div>
    <div v-else class="fc-card-grid">
      <article
        v-for="item in centers"
        :key="item.id"
        class="fc-fc-card"
        role="button"
        tabindex="0"
        @click="openDetail(item)"
        @keyup.enter="openDetail(item)"
      >
        <header class="fc-fc-card-head">
          <h3 class="fc-fc-card-title">{{ item.name || '—' }}</h3>
          <details v-if="perm.canDelete() || perm.canReset()" class="fc-fc-card-menu" @click.stop>
            <summary class="fc-fc-more" aria-label="更多">⋯</summary>
            <div class="fc-fc-menu">
              <button
                v-if="perm.canReset()"
                type="button"
                class="fc-fc-menu-item"
                @click="openEditModal(item)"
              >
                编辑
              </button>
              <button
                v-if="perm.canDelete()"
                type="button"
                class="fc-fc-menu-item danger"
                @click="confirmDelete(item)"
              >
                删除
              </button>
            </div>
          </details>
        </header>
        <div class="fc-fc-metrics">
          <span class="fc-metric" :style="{ color: metricColorPre(item.currentPreAlertNumber) }">
            预告警 {{ item.currentPreAlertNumber ?? 0 }}
          </span>
          <span class="fc-metric" :style="{ color: metricColorAlert(item.currentAlertNumber) }">
            待处理 {{ item.currentAlertNumber ?? 0 }}
          </span>
          <span class="fc-metric" :style="{ color: metricColorRecover(item.currentRecoverNumber) }">
            待恢复 {{ item.currentRecoverNumber ?? 0 }}
          </span>
        </div>
        <p class="fc-fc-time mono">{{ formatTime(item.createAt) }}</p>
      </article>
    </div>

    <FaultCenterCreateModal :open="createModalOpen" @close="createModalOpen = false" @created="onCreatedFaultCenter" />
    <FaultCenterEditModal
      :open="editModalOpen"
      :center-id="editModalCenterId"
      @close="closeEditModal"
      @saved="onEditSaved"
    />
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { unwrapW8t, faultCenterList, faultCenterDelete } from '@/api/faultcenter'
import { useFaultCenterPerm } from '@/composables/useFaultCenterPerm'
import FaultCenterCreateModal from './FaultCenterCreateModal.vue'
import FaultCenterEditModal from './FaultCenterEditModal.vue'
import './faultCenterCommon.css'

const route = useRoute()
const router = useRouter()
const perm = useFaultCenterPerm()

const createModalOpen = ref(false)
const editModalOpen = ref(false)
const editModalCenterId = ref('')
const pageError = ref('')
const loading = ref(false)
const centers = ref([])
const filterQuery = ref('')

const COL_PRE_WARN = '#ffe465'
const COL_OK = '#10b981'
const COL_ALERT = '#ef4444'
const COL_RECOVER = '#f97316'

function metricColorPre(n) {
  const v = Number(n) || 0
  return v > 0 ? COL_PRE_WARN : COL_OK
}
function metricColorAlert(n) {
  const v = Number(n) || 0
  return v > 0 ? COL_ALERT : COL_OK
}
function metricColorRecover(n) {
  const v = Number(n) || 0
  return v > 0 ? COL_RECOVER : COL_OK
}

/** createAt：Unix 秒 → YYYY-MM-DD HH:mm */
function formatTime(v) {
  if (v == null || v === '') return '—'
  const n = Number(v)
  let d
  if (Number.isFinite(n)) {
    const ms = n < 1e12 ? n * 1000 : n
    d = new Date(ms)
  } else {
    try {
      d = new Date(v)
    } catch {
      return String(v)
    }
  }
  if (Number.isNaN(d.getTime())) return String(v)
  const p = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function clearSearch() {
  filterQuery.value = ''
  loadList()
}

async function loadList() {
  pageError.value = ''
  if (!perm.canList()) {
    pageError.value = '当前角色未授权列表接口（GET /api/w8t/faultCenter/faultCenterList），请联系管理员配置 Path。'
    return
  }
  loading.value = true
  try {
    const q = filterQuery.value?.trim()
    const res = await faultCenterList({
      query: q || undefined
    })
    const data = unwrapW8t(res)
    centers.value = Array.isArray(data) ? data : []
  } catch (e) {
    centers.value = []
    pageError.value = e?.message || '加载列表失败'
  } finally {
    loading.value = false
  }
}

function goCreate() {
  createModalOpen.value = true
}

/** @param {{ id: string }} item */
function openEditModal(item) {
  if (!item?.id || !perm.canReset()) return
  if (!perm.canSearch()) {
    pageError.value = '当前角色未授权详情查询接口（faultCenterSearch），无法加载编辑表单。'
    return
  }
  editModalCenterId.value = item.id
  editModalOpen.value = true
}

function closeEditModal() {
  editModalOpen.value = false
  editModalCenterId.value = ''
}

function onEditSaved() {
  void loadList()
}

/** @param {{ id: string }} payload */
function onCreatedFaultCenter(payload) {
  const id = payload?.id?.trim?.() || ''
  if (id) {
    router.push({ name: 'FaultCenterDetail', params: { id } })
    return
  }
  void loadList()
}

function goDashboard() {
  router.push({ name: 'Dashboard' })
}

/** @param {{ id: string, name?: string }} row */
function openDetail(row) {
  if (!row?.id) return
  if (!perm.canSearch()) {
    pageError.value = '当前角色未授权详情查询接口（faultCenterSearch），无法打开详情。'
    return
  }
  router.push({ name: 'FaultCenterDetail', params: { id: row.id } })
}

/** @param {{ id: string, name?: string }} record */
function confirmDelete(record) {
  if (!record?.id || !perm.canDelete()) return
  const name = record.name || record.id
  if (!confirm(`确定删除故障中心 ${name} 吗？`)) return
  void doDelete(record)
}

async function doDelete(record) {
  pageError.value = ''
  try {
    await faultCenterDelete({ id: record.id, name: record.name || '' })
    await loadList()
  } catch (e) {
    pageError.value = e?.message || '删除失败'
  }
}

function consumeOpenCreateQuery() {
  if (route.query.openCreate !== '1') return
  createModalOpen.value = true
  router.replace({ name: 'FaultCenterList', query: {} })
}

watch(
  () => route.query.openCreate,
  () => consumeOpenCreateQuery(),
  { immediate: true }
)

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.fc-list-head {
  margin-bottom: 8px;
}
.fc-list-title {
  margin: 0;
  font-size: 1.35rem;
}
.fc-list-toolbar {
  margin-bottom: 16px;
}
.fc-list-search {
  flex: 1;
  min-width: 240px;
  max-width: 720px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.fc-list-search .search-input {
  flex: 1;
  width: auto;
  min-width: 0;
}
.btn.sm {
  padding: 6px 10px;
  font-size: 12px;
}
.fc-create-btn {
  font-weight: 600;
}
.fc-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}
.fc-fc-card {
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 18px 20px;
  background: var(--bg-card, #fff);
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.06));
}
.fc-fc-card:hover {
  transform: translateY(-3px) scale(1.01);
  box-shadow: var(--shadow-md, 0 8px 24px rgba(0, 0, 0, 0.1));
}
.fc-fc-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}
.fc-fc-card-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  word-break: break-word;
}
.fc-fc-card-menu {
  position: relative;
  flex-shrink: 0;
}
.fc-fc-more {
  list-style: none;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--text-muted);
  font-size: 1.25rem;
  line-height: 1;
}
.fc-fc-more::-webkit-details-marker {
  display: none;
}
.fc-fc-more:hover {
  background: var(--bg-hover, rgba(0, 0, 0, 0.05));
}
.fc-fc-menu {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 4px;
  min-width: 120px;
  padding: 6px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
  z-index: 5;
}
.fc-fc-menu-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border: none;
  background: none;
  font-size: 13px;
  cursor: pointer;
  border-radius: 6px;
  font-family: inherit;
}
.fc-fc-menu-item:hover {
  background: var(--bg-hover);
}
.fc-fc-menu-item.danger {
  color: #b91c1c;
}
.fc-fc-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 10px;
}
.fc-metric {
  white-space: nowrap;
}
.fc-fc-time {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}
.fc-empty-cards {
  text-align: center;
  padding: 48px 20px;
  border: 1px dashed var(--border-default);
  border-radius: 12px;
  background: var(--bg-secondary, rgba(0, 0, 0, 0.02));
}
.fc-empty-title {
  margin: 0 0 8px;
  font-size: 1.15rem;
}
@media (max-width: 600px) {
  .fc-card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
