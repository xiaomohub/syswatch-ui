<template>
  <div class="fc-page">
    <p v-if="pageError" class="fc-page-error">{{ pageError }}</p>

    <!-- 工具栏 -->
    <div class="fc-toolbar">
      <div class="fc-filters">
        <div class="search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            v-model="filterQuery"
            type="text"
            class="search-input"
            placeholder="列表模糊搜索 query..."
            @keyup.enter="loadList"
          >
        </div>
        <input v-model="filterId" type="text" class="fc-input sm" placeholder="id 精确">
        <input v-model="filterName" type="text" class="fc-input sm" placeholder="name">
        <button type="button" class="btn btn-secondary" :disabled="loading" @click="loadList">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ spinning: loading }">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          刷新列表
        </button>
        <button type="button" class="btn btn-text" v-if="hasListFilters" @click="clearListFilters">清除</button>
      </div>
      <button type="button" class="btn btn-primary" @click="openCreate">新建故障中心</button>
    </div>

    <!-- 列表 -->
    <div class="fc-table-card">
      <div class="fc-table-head">
        <span class="col name">名称</span>
        <span class="col id">ID</span>
        <span class="col num" title="预告警">预告警</span>
        <span class="col num" title="告警中">告警中</span>
        <span class="col num" title="待恢复">待恢复</span>
        <span class="col time">创建时间</span>
        <span class="col actions">操作</span>
      </div>
      <div v-if="loading" class="fc-loading"><div class="spinner"></div>加载中…</div>
      <div v-else-if="centers.length === 0" class="fc-empty">
        <p>暂无数据</p>
        <p class="muted">请确认后端已放行 <code>GET /api/w8t/faultCenter/faultCenterList</code> 等接口权限，或当前租户下暂无数据。</p>
      </div>
      <div v-else class="fc-table-body">
        <div v-for="row in centers" :key="row.id" class="fc-row">
          <div class="col name">
            <div class="title">{{ row.name || '—' }}</div>
            <div class="sub">{{ row.description || '—' }}</div>
          </div>
          <div class="col id"><code>{{ row.id }}</code></div>
          <div class="col num">{{ row.currentPreAlertNumber ?? 0 }}</div>
          <div class="col num">{{ row.currentAlertNumber ?? 0 }}</div>
          <div class="col num">{{ row.currentRecoverNumber ?? 0 }}</div>
          <div class="col time mono">{{ formatTime(row.createAt) }}</div>
          <div class="col actions">
            <button type="button" class="link-btn" @click="openDetail(row)">详情</button>
            <button type="button" class="link-btn" @click="openEdit(row)">编辑</button>
            <button type="button" class="link-btn" @click="openSlo(row)">SLO</button>
            <button type="button" class="link-btn" @click="openDashboard(row)">工作台</button>
            <button type="button" class="link-btn danger" @click="askDelete(row)">删除</button>
            <button type="button" class="link-btn" @click="openReset(row)">重置</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 新建 / 编辑 -->
    <Teleport to="body">
      <div v-if="formOpen" class="modal-overlay" @click.self="formOpen = false">
        <div class="modal form-modal">
          <header class="modal-hd">
            <h3>{{ formMode === 'create' ? '新建故障中心' : '编辑故障中心' }}</h3>
            <button type="button" class="icon-close" @click="formOpen = false">×</button>
          </header>
          <div class="modal-bd">
            <label class="field"><span>名称</span><input v-model="form.name" class="fc-input" type="text"></label>
            <label class="field"><span>描述</span><textarea v-model="form.description" class="fc-textarea" rows="2"></textarea></label>
            <label class="field">
              <span>通知对象 ID（逗号分隔）</span>
              <input v-model="form.noticeIdsStr" class="fc-input" type="text" placeholder="n1,n2">
            </label>
            <label class="field">
              <span>noticeRoutes（JSON 数组）</span>
              <textarea v-model="form.noticeRoutesJson" class="fc-textarea mono" rows="3" placeholder="[]"></textarea>
            </label>
            <div class="field grid4">
              <span class="span-full">重复通知间隔（分钟 / 等级）</span>
              <label>P0 <input v-model.number="form.repeatP0" class="fc-input" type="number" min="1"></label>
              <label>P1 <input v-model.number="form.repeatP1" class="fc-input" type="number" min="1"></label>
              <label>P2 <input v-model.number="form.repeatP2" class="fc-input" type="number" min="1"></label>
              <label>P3 <input v-model.number="form.repeatP3" class="fc-input" type="number" min="1"></label>
            </div>
            <label class="field inline"><input v-model="form.recoverNotify" type="checkbox"> 恢复是否通知</label>
            <label class="field">
              <span>聚合类型 aggregationType</span>
              <select v-model="form.aggregationType" class="fc-input">
                <option value="">默认（不按规则名聚合）</option>
                <option value="Rule">Rule（按规则名聚合）</option>
              </select>
            </label>
            <label class="field"><span>恢复等待时间 recoverWaitTime（秒）</span><input v-model.number="form.recoverWaitTime" class="fc-input" type="number" min="0"></label>
            <label class="field inline"><input v-model="form.isUpgradeEnabled" type="checkbox"> 启用告警升级</label>
            <div class="field">
              <span>可升级等级</span>
              <div class="checks">
                <label><input v-model="form.upP0" type="checkbox"> P0</label>
                <label><input v-model="form.upP1" type="checkbox"> P1</label>
                <label><input v-model="form.upP2" type="checkbox"> P2</label>
                <label><input v-model="form.upP3" type="checkbox"> P3</label>
              </div>
            </div>
            <div class="field grid2">
              <span class="span-full">升级策略 upgradeStrategy</span>
              <label class="inline"><input v-model="form.upgradeStrategyEnabled" type="checkbox"> enabled</label>
              <label>timeout（秒）<input v-model.number="form.upgradeTimeout" class="fc-input" type="number" min="0"></label>
              <label>repeatInterval<input v-model.number="form.upgradeRepeatInterval" class="fc-input" type="number" min="0"></label>
              <label class="span-full">noticeId<input v-model="form.upgradeNoticeId" class="fc-input" type="text"></label>
            </div>
          </div>
          <footer class="modal-ft">
            <button type="button" class="btn btn-secondary" @click="formOpen = false">取消</button>
            <button type="button" class="btn btn-primary" :disabled="formSubmitting" @click="submitForm">
              {{ formSubmitting ? '提交中…' : '保存' }}
            </button>
          </footer>
        </div>
      </div>
    </Teleport>

    <!-- 详情 -->
    <Teleport to="body">
      <div v-if="detailOpen" class="modal-overlay" @click.self="detailOpen = false">
        <div class="modal detail-modal">
          <header class="modal-hd">
            <h3>故障中心详情 <code>{{ detail?.id }}</code></h3>
            <button type="button" class="icon-close" @click="detailOpen = false">×</button>
          </header>
          <div class="modal-bd" v-if="detail">
            <pre class="json-pre">{{ pretty(detail) }}</pre>
          </div>
          <footer class="modal-ft">
            <button type="button" class="btn btn-secondary" @click="detailOpen = false">关闭</button>
          </footer>
        </div>
      </div>
    </Teleport>

    <!-- 删除确认 -->
    <Teleport to="body">
      <div v-if="deleteOpen" class="modal-overlay" @click.self="deleteOpen = false">
        <div class="modal sm-modal">
          <header class="modal-hd"><h3>删除故障中心</h3></header>
          <div class="modal-bd">
            <p>确定删除 <code>{{ deleteTarget?.id }}</code>（{{ deleteTarget?.name }}）？此操作不可恢复。</p>
          </div>
          <footer class="modal-ft">
            <button type="button" class="btn btn-secondary" @click="deleteOpen = false">取消</button>
            <button type="button" class="btn btn-danger" :disabled="deleteSubmitting" @click="confirmDelete">删除</button>
          </footer>
        </div>
      </div>
    </Teleport>

    <!-- 轻量重置 -->
    <Teleport to="body">
      <div v-if="resetOpen" class="modal-overlay" @click.self="resetOpen = false">
        <div class="modal form-modal">
          <header class="modal-hd"><h3>轻量重置 faultCenterReset</h3></header>
          <div class="modal-bd">
            <p class="muted small">仅名称、描述、聚合类型等字段；以实际后端行为为准。</p>
            <label class="field"><span>名称（可选）</span><input v-model="resetForm.name" class="fc-input" type="text"></label>
            <label class="field"><span>描述（可选）</span><textarea v-model="resetForm.description" class="fc-textarea" rows="2"></textarea></label>
            <label class="field">
              <span>aggregationType（可选）</span>
              <select v-model="resetForm.aggregationType" class="fc-input">
                <option value="">不修改</option>
                <option value="Rule">Rule</option>
              </select>
            </label>
          </div>
          <footer class="modal-ft">
            <button type="button" class="btn btn-secondary" @click="resetOpen = false">取消</button>
            <button type="button" class="btn btn-primary" :disabled="resetSubmitting" @click="submitReset">提交重置</button>
          </footer>
        </div>
      </div>
    </Teleport>

    <!-- SLO -->
    <Teleport to="body">
      <div v-if="sloOpen" class="modal-overlay" @click.self="sloOpen = false">
        <div class="modal slo-modal">
          <header class="modal-hd">
            <h3>SLO（近 7 天）<code>{{ sloCenterId }}</code></h3>
            <button type="button" class="icon-close" @click="sloOpen = false">×</button>
          </header>
          <div class="modal-bd">
            <p v-if="sloError" class="fc-page-error">{{ sloError }}</p>
            <div v-else-if="sloLoading" class="fc-loading"><div class="spinner"></div></div>
            <div v-else class="slo-charts">
              <div class="slo-block">
                <h4>MTTA（秒 → 折线纵轴为相对高度，数值见接口原始秒）</h4>
                <div class="slo-labels"><span v-for="(lb, i) in sloLabels" :key="'mtta-'+i">{{ lb }}</span></div>
                <div class="slo-svg-wrap" v-html="sloSvgMtta"></div>
              </div>
              <div class="slo-block">
                <h4>MTTR（秒 → 折线纵轴为相对高度）</h4>
                <div class="slo-labels"><span v-for="(lb, i) in sloLabels" :key="'mttr-'+i">{{ lb }}</span></div>
                <div class="slo-svg-wrap" v-html="sloSvgMttr"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 工作台总览 -->
    <Teleport to="body">
      <div v-if="dashOpen" class="modal-overlay" @click.self="dashOpen = false">
        <div class="modal detail-modal">
          <header class="modal-hd">
            <h3>工作台 getDashboardInfo</h3>
            <button type="button" class="icon-close" @click="dashOpen = false">×</button>
          </header>
          <div class="modal-bd">
            <p v-if="dashError" class="fc-page-error">{{ dashError }}</p>
            <div v-else-if="dashLoading" class="fc-loading"><div class="spinner"></div></div>
            <pre v-else class="json-pre">{{ pretty(dashData) }}</pre>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  unwrapW8t,
  faultCenterList,
  faultCenterSearch,
  faultCenterCreate,
  faultCenterUpdate,
  faultCenterDelete,
  faultCenterReset,
  faultCenterSlo,
  getDashboardInfo
} from '@/api/faultcenter'

const pageError = ref('')

const loading = ref(false)
const centers = ref([])

const filterQuery = ref('')
const filterId = ref('')
const filterName = ref('')

const hasListFilters = computed(
  () => !!(filterQuery.value || filterId.value || filterName.value)
)

function clearListFilters() {
  filterQuery.value = ''
  filterId.value = ''
  filterName.value = ''
  loadList()
}

function formatTime(v) {
  if (v == null || v === '') return '—'
  try {
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return String(v)
    return d.toLocaleString('zh-CN')
  } catch {
    return String(v)
  }
}

function pretty(obj) {
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}

async function loadList() {
  pageError.value = ''
  loading.value = true
  try {
    const res = await faultCenterList({
      query: filterQuery.value?.trim() || undefined,
      id: filterId.value?.trim() || undefined,
      name: filterName.value?.trim() || undefined
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

/** ---------- 表单 ---------- */
const formOpen = ref(false)
const formMode = ref('create')
const formSubmitting = ref(false)
/** @type {import('vue').Ref<Record<string, any> | null>} */
const editBase = ref(null)

const form = ref({
  name: '',
  description: '',
  noticeIdsStr: '',
  noticeRoutesJson: '[]',
  repeatP0: 30,
  repeatP1: 30,
  repeatP2: 30,
  repeatP3: 30,
  recoverNotify: true,
  aggregationType: '',
  recoverWaitTime: 60,
  isUpgradeEnabled: false,
  upP0: false,
  upP1: false,
  upP2: false,
  upP3: false,
  upgradeStrategyEnabled: false,
  upgradeTimeout: 300,
  upgradeRepeatInterval: 60,
  upgradeNoticeId: ''
})

function resetFormFields() {
  form.value = {
    name: '',
    description: '',
    noticeIdsStr: '',
    noticeRoutesJson: '[]',
    repeatP0: 30,
    repeatP1: 30,
    repeatP2: 30,
    repeatP3: 30,
    recoverNotify: true,
    aggregationType: '',
    recoverWaitTime: 60,
    isUpgradeEnabled: false,
    upP0: false,
    upP1: false,
    upP2: false,
    upP3: false,
    upgradeStrategyEnabled: false,
    upgradeTimeout: 300,
    upgradeRepeatInterval: 60,
    upgradeNoticeId: ''
  }
  editBase.value = null
}

function parseNoticeIds(str) {
  return String(str || '')
    .split(/[,，\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseNoticeRoutes(json) {
  try {
    const v = JSON.parse(json || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

function upgradableFromForm() {
  const f = form.value
  const out = []
  if (f.upP0) out.push('P0')
  if (f.upP1) out.push('P1')
  if (f.upP2) out.push('P2')
  if (f.upP3) out.push('P3')
  return out
}

function setUpgradableChecks(arr) {
  const s = new Set(Array.isArray(arr) ? arr : [])
  form.value.upP0 = s.has('P0')
  form.value.upP1 = s.has('P1')
  form.value.upP2 = s.has('P2')
  form.value.upP3 = s.has('P3')
}

function hydrateFormFromServer(row) {
  const ri = row.repeatNoticeInterval && typeof row.repeatNoticeInterval === 'object' ? row.repeatNoticeInterval : {}
  const us = row.upgradeStrategy && typeof row.upgradeStrategy === 'object' ? row.upgradeStrategy : {}
  form.value.name = row.name || ''
  form.value.description = row.description || ''
  form.value.noticeIdsStr = Array.isArray(row.noticeIds) ? row.noticeIds.join(', ') : ''
  form.value.noticeRoutesJson = JSON.stringify(Array.isArray(row.noticeRoutes) ? row.noticeRoutes : [], null, 2)
  form.value.repeatP0 = Number(ri.P0 ?? 30)
  form.value.repeatP1 = Number(ri.P1 ?? 30)
  form.value.repeatP2 = Number(ri.P2 ?? 30)
  form.value.repeatP3 = Number(ri.P3 ?? 30)
  form.value.recoverNotify = row.recoverNotify !== false
  form.value.aggregationType = row.aggregationType || ''
  form.value.recoverWaitTime = Number(row.recoverWaitTime ?? 60)
  form.value.isUpgradeEnabled = !!row.isUpgradeEnabled
  setUpgradableChecks(row.upgradableSeverity)
  form.value.upgradeStrategyEnabled = !!us.enabled
  form.value.upgradeTimeout = Number(us.timeout ?? 300)
  form.value.upgradeRepeatInterval = Number(us.repeatInterval ?? 60)
  form.value.upgradeNoticeId = us.noticeId || ''
}

function buildBodyFromForm() {
  const f = form.value
  return {
    name: f.name.trim(),
    description: f.description || '',
    noticeIds: parseNoticeIds(f.noticeIdsStr),
    noticeRoutes: parseNoticeRoutes(f.noticeRoutesJson),
    repeatNoticeInterval: {
      P0: Number(f.repeatP0) || 30,
      P1: Number(f.repeatP1) || 30,
      P2: Number(f.repeatP2) || 30,
      P3: Number(f.repeatP3) || 30
    },
    recoverNotify: !!f.recoverNotify,
    aggregationType: f.aggregationType || '',
    recoverWaitTime: Number(f.recoverWaitTime) || 0,
    isUpgradeEnabled: !!f.isUpgradeEnabled,
    upgradableSeverity: upgradableFromForm(),
    upgradeStrategy: {
      enabled: !!f.upgradeStrategyEnabled,
      timeout: Number(f.upgradeTimeout) || 0,
      repeatInterval: Number(f.upgradeRepeatInterval) || 0,
      noticeId: f.upgradeNoticeId || ''
    }
  }
}

function openCreate() {
  pageError.value = ''
  formMode.value = 'create'
  resetFormFields()
  formOpen.value = true
}

async function openEdit(row) {
  pageError.value = ''
  formMode.value = 'edit'
  resetFormFields()
  try {
    const res = await faultCenterSearch({ id: row.id })
    const data = unwrapW8t(res)
    editBase.value = data && typeof data === 'object' ? { ...data } : {}
    hydrateFormFromServer(editBase.value)
    formOpen.value = true
  } catch (e) {
    pageError.value = e?.message || '拉取详情失败'
  }
}

async function submitForm() {
  pageError.value = ''
  if (!form.value.name?.trim()) {
    pageError.value = '名称不能为空'
    return
  }
  formSubmitting.value = true
  try {
    if (formMode.value === 'create') {
      const body = buildBodyFromForm()
      unwrapW8t(await faultCenterCreate(body))
    } else {
      const merged = {
        ...(editBase.value || {}),
        ...buildBodyFromForm(),
        id: editBase.value?.id
      }
      if (!merged.id) {
        pageError.value = '缺少故障中心 id'
        return
      }
      unwrapW8t(await faultCenterUpdate(merged))
    }
    formOpen.value = false
    await loadList()
  } catch (e) {
    pageError.value = e?.message || '保存失败'
  } finally {
    formSubmitting.value = false
  }
}

/** ---------- 详情 ---------- */
const detailOpen = ref(false)
const detail = ref(null)

async function openDetail(row) {
  pageError.value = ''
  try {
    const res = await faultCenterSearch({ id: row.id })
    detail.value = unwrapW8t(res)
    detailOpen.value = true
  } catch (e) {
    pageError.value = e?.message || '加载详情失败'
  }
}

/** ---------- 删除 ---------- */
const deleteOpen = ref(false)
const deleteTarget = ref(null)
const deleteSubmitting = ref(false)

function askDelete(row) {
  deleteTarget.value = row
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value?.id) return
  deleteSubmitting.value = true
  try {
    unwrapW8t(await faultCenterDelete(deleteTarget.value.id))
    deleteOpen.value = false
    deleteTarget.value = null
    await loadList()
  } catch (e) {
    pageError.value = e?.message || '删除失败'
  } finally {
    deleteSubmitting.value = false
  }
}

/** ---------- 重置 ---------- */
const resetOpen = ref(false)
const resetSubmitting = ref(false)
const resetForm = ref({ id: '', name: '', description: '', aggregationType: '' })

function openReset(row) {
  resetForm.value = { id: row.id, name: '', description: '', aggregationType: '' }
  resetOpen.value = true
}

async function submitReset() {
  resetSubmitting.value = true
  pageError.value = ''
  try {
    const body = { id: resetForm.value.id }
    if (resetForm.value.name) body.name = resetForm.value.name
    if (resetForm.value.description) body.description = resetForm.value.description
    if (resetForm.value.aggregationType) body.aggregationType = resetForm.value.aggregationType
    unwrapW8t(await faultCenterReset(body))
    resetOpen.value = false
    await loadList()
  } catch (e) {
    pageError.value = e?.message || '重置失败'
  } finally {
    resetSubmitting.value = false
  }
}

/** ---------- SLO ---------- */
const sloOpen = ref(false)
const sloCenterId = ref('')
const sloLoading = ref(false)
const sloError = ref('')
/** @type {import('vue').Ref<{ mtta?: number[], mttr?: number[] }>} */
const sloSeries = ref({ mtta: [], mttr: [] })

const sloLabels = ['D-6', 'D-5', 'D-4', 'D-3', 'D-2', 'D-1', '今天']

function secToMin(s) {
  const n = Number(s)
  if (!Number.isFinite(n) || n <= 0) return 0
  return n / 60
}

function sloPolyline(values, height, width) {
  const arr = Array.isArray(values) ? values.map((x) => secToMin(x)) : []
  while (arr.length < 7) arr.push(0)
  const slice = arr.slice(0, 7)
  const max = Math.max(1, ...slice)
  const w = width
  const h = height
  const step = w / (slice.length - 1 || 1)
  const pts = slice.map((v, i) => {
    const x = i * step
    const y = h - (v / max) * (h - 8) - 4
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return pts.join(' ')
}

const sloSvgMtta = computed(() => {
  const pts = sloPolyline(sloSeries.value.mtta, 120, 320)
  return `<svg width="100%" height="120" viewBox="0 0 320 120" xmlns="http://www.w3.org/2000/svg" aria-label="MTTA"><polyline fill="none" stroke="#2563eb" stroke-width="2" points="${pts}"/></svg>`
})

const sloSvgMttr = computed(() => {
  const pts = sloPolyline(sloSeries.value.mttr, 120, 320)
  return `<svg width="100%" height="120" viewBox="0 0 320 120" xmlns="http://www.w3.org/2000/svg" aria-label="MTTR"><polyline fill="none" stroke="#7c3aed" stroke-width="2" points="${pts}"/></svg>`
})

async function openSlo(row) {
  sloCenterId.value = row.id
  sloOpen.value = true
  sloError.value = ''
  sloLoading.value = true
  sloSeries.value = { mtta: [], mttr: [] }
  try {
    const res = await faultCenterSlo({ id: row.id })
    const data = unwrapW8t(res) || {}
    sloSeries.value = {
      mtta: Array.isArray(data.mtta) ? data.mtta : [],
      mttr: Array.isArray(data.mttr) ? data.mttr : []
    }
  } catch (e) {
    sloError.value = e?.message || '加载 SLO 失败'
  } finally {
    sloLoading.value = false
  }
}

/** ---------- 工作台 ---------- */
const dashOpen = ref(false)
const dashLoading = ref(false)
const dashError = ref('')
const dashData = ref(null)

async function openDashboard(row) {
  dashOpen.value = true
  dashLoading.value = true
  dashError.value = ''
  dashData.value = null
  try {
    const res = await getDashboardInfo({ faultCenterId: row.id })
    dashData.value = unwrapW8t(res)
  } catch (e) {
    dashError.value = e?.message || '加载工作台失败'
  } finally {
    dashLoading.value = false
  }
}

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.fc-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.fc-input {
  padding: 10px 12px;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  min-width: 200px;
}

.fc-input.sm {
  min-width: 120px;
}

.fc-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
}

.fc-textarea.mono {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
}

.fc-page-error {
  margin: 0;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--danger-50);
  border: 1px solid color-mix(in srgb, var(--danger-600) 22%, var(--border-default));
  color: var(--danger-700);
  font-size: 13px;
}

.fc-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.fc-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.search-box {
  position: relative;
}

.search-box svg {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.search-input {
  padding: 10px 12px 10px 40px;
  width: 260px;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  background: var(--bg-card);
  font-size: 13px;
  font-family: inherit;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  font-family: inherit;
}

.btn-primary {
  background: var(--brand-600);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: var(--brand-700);
}

.btn-secondary {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}

.btn-secondary:hover:not(:disabled) {
  border-color: var(--border-strong);
}

.btn-text {
  background: transparent;
  color: var(--text-muted);
  font-weight: 500;
}

.btn-danger {
  background: var(--danger-600);
  color: #fff;
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.spinning {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.fc-table-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  overflow: hidden;
}

.fc-table-head,
.fc-row {
  display: grid;
  grid-template-columns: minmax(140px, 1.2fr) minmax(100px, 0.9fr) 72px 72px 72px minmax(120px, 0.9fr) minmax(200px, 1.4fr);
  gap: 10px;
  padding: 12px 16px;
  align-items: center;
}

.fc-table-head {
  background: var(--bg-tertiary);
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.fc-row {
  border-top: 1px solid var(--border-default);
  font-size: 13px;
}

.fc-row:hover {
  background: var(--bg-subtle);
}

.col.name .title {
  font-weight: 600;
  color: var(--text-primary);
}

.col.name .sub {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col.id code {
  font-size: 11px;
  word-break: break-all;
}

.col.num {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-weight: 600;
  text-align: right;
}

.col.time.mono {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  color: var(--text-muted);
}

.col.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  justify-content: flex-end;
}

.link-btn {
  border: none;
  background: none;
  padding: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--brand-700);
  cursor: pointer;
  font-family: inherit;
}

.link-btn:hover {
  text-decoration: underline;
}

.link-btn.danger {
  color: var(--danger-600);
}

.fc-loading,
.fc-empty {
  padding: 48px 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
}

.fc-empty .muted {
  margin-top: 8px;
  font-size: 12px;
}

.spinner {
  width: 32px;
  height: 32px;
  margin: 0 auto 12px;
  border: 3px solid var(--border-color);
  border-top-color: var(--brand-600);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: 16px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
}

.form-modal {
  width: min(560px, 100%);
}

.detail-modal {
  width: min(720px, 100%);
}

.slo-modal {
  width: min(680px, 100%);
}

.sm-modal {
  width: min(420px, 100%);
}

.modal-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border-default);
}

.modal-hd h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

.icon-close {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  color: var(--text-muted);
  border-radius: 8px;
}

.icon-close:hover {
  background: var(--bg-subtle);
  color: var(--text-primary);
}

.modal-bd {
  padding: 16px 18px;
  overflow: auto;
}

.modal-ft {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 18px;
  border-top: 1px solid var(--border-default);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 600;
}

.field.inline {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.field.grid4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.field.grid4 .span-full {
  grid-column: 1 / -1;
}

.field.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.field.grid2 .span-full {
  grid-column: 1 / -1;
}

.checks {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.json-pre {
  margin: 0;
  padding: 14px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.5;
  overflow: auto;
  max-height: 60vh;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}

.muted.small {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0 0 12px;
}

.slo-charts {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.slo-block h4 {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
}

.slo-svg-wrap {
  margin-top: 8px;
}

.slo-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text-muted);
  max-width: 320px;
  margin-bottom: 4px;
}

@media (max-width: 1100px) {
  .fc-table-head,
  .fc-row {
    grid-template-columns: 1fr;
  }
  .col.actions {
    justify-content: flex-start;
  }
}
</style>
