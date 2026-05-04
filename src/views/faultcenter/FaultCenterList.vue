<template>
  <div class="fc-page">
    <p v-if="pageError" class="fc-page-error">{{ pageError }}</p>
    <p v-if="copyHint" class="fc-page-success">{{ copyHint }}</p>

    <div class="fc-toolbar">
      <div class="fc-filters">
        <div class="search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            v-model="filterQuery"
            type="text"
            class="search-input"
            placeholder="模糊搜索 name / id / description"
            @keyup.enter="loadList"
          />
        </div>
        <input v-model="filterId" type="text" class="fc-input sm" placeholder="id 精确" />
        <input v-model="filterName" type="text" class="fc-input sm" placeholder="name" />
        <button type="button" class="btn btn-secondary" :disabled="loading || !perm.canList()" @click="loadList">
          搜索
        </button>
        <button type="button" class="btn btn-secondary" :disabled="loading || !perm.canList()" @click="loadList">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            :class="{ spinning: loading }"
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          刷新
        </button>
        <button type="button" class="btn btn-text" v-if="hasListFilters" @click="clearListFilters">清除条件</button>
        <button type="button" class="btn btn-secondary" @click="goWorkbench()">工作台</button>
      </div>
      <button v-if="perm.canCreate()" type="button" class="btn btn-primary" @click="goCreate">新建</button>
    </div>

    <div class="fc-hint-card">
      <h4 class="fc-hint-title">告警归属与统计</h4>
      <p class="fc-hint-text">
        <strong>预告警 / 告警中 / 待恢复</strong>由 Redis 活跃事件实时汇总。规则绑定
        <code>faultCenterId</code>；若需按业务维度拆分，可为各维度单独建中心。
        「分类」列在后端返回 <code>category</code>、<code>scope</code> 或 <code>tags</code> 时展示。
      </p>
    </div>

    <div class="fc-table-card">
      <div class="fc-table-head">
        <span class="col name">名称</span>
        <span class="col scope">分类</span>
        <span class="col id">ID</span>
        <span class="col num" title="预告警">预告警</span>
        <span class="col num" title="告警中">告警中</span>
        <span class="col num" title="待恢复">待恢复</span>
        <span class="col time">创建时间</span>
        <span class="col actions">操作</span>
      </div>
      <div v-if="loading" class="fc-loading"><div class="spinner"></div>加载中…</div>
      <div v-else-if="centers.length === 0" class="fc-empty">
        <p>暂无故障中心</p>
        <p class="muted">可点击「新建」创建；若已配置 RBAC，请确认角色包含 <code>GET /api/w8t/faultCenter/faultCenterList</code>。</p>
        <button v-if="perm.canCreate()" type="button" class="btn btn-primary" style="margin-top: 16px" @click="goCreate">
          新建故障中心
        </button>
      </div>
      <div v-else class="fc-table-body">
        <div v-for="row in centers" :key="row.id" class="fc-row">
          <div class="col name">
            <div class="title">{{ row.name || '—' }}</div>
            <div class="sub">{{ row.description || '—' }}</div>
          </div>
          <div class="col scope" :title="scopeLabel(row)">{{ scopeLabel(row) || '—' }}</div>
          <div class="col id"><code>{{ row.id }}</code></div>
          <div class="col num">{{ row.currentPreAlertNumber ?? 0 }}</div>
          <div class="col num">{{ row.currentAlertNumber ?? 0 }}</div>
          <div class="col num">{{ row.currentRecoverNumber ?? 0 }}</div>
          <div class="col time mono">{{ formatTime(row.createAt) }}</div>
          <div class="col actions">
            <button type="button" class="link-btn" title="复制 ID" @click="copyId(row.id)">复制 ID</button>
            <button v-if="perm.canSearch()" type="button" class="link-btn" @click="openDetail(row)">JSON</button>
            <button
              v-if="perm.canSearch() && perm.canUpdate()"
              type="button"
              class="link-btn"
              @click="goEdit(row)"
            >
              编辑
            </button>
            <button v-if="perm.canSlo()" type="button" class="link-btn" @click="goSlo(row)">SLO</button>
            <button type="button" class="link-btn" @click="goWorkbench(row)">工作台</button>
            <button v-if="perm.canDelete()" type="button" class="link-btn danger" @click="askDelete(row)">删除</button>
            <button v-if="perm.canReset()" type="button" class="link-btn" @click="openReset(row)">重置</button>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="detailOpen" class="modal-overlay" @click.self="detailOpen = false">
        <div class="modal detail-modal">
          <header class="modal-hd">
            <h3>故障中心 JSON <code>{{ detail?.id }}</code></h3>
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

    <Teleport to="body">
      <div v-if="deleteOpen" class="modal-overlay" @click.self="deleteOpen = false">
        <div class="modal sm-modal">
          <header class="modal-hd"><h3>删除故障中心</h3></header>
          <div class="modal-bd">
            <p>
              确定删除 <code>{{ deleteTarget?.id }}</code>（{{ deleteTarget?.name }}）？此操作不可恢复。
            </p>
            <p class="muted small" style="margin-top: 10px">
              将停止该中心的消费协程（Leader）、删除库记录与 Redis
              <code>*.info</code> 键。若仍有规则绑定该中心，请先在告警管理中调整规则。
            </p>
          </div>
          <footer class="modal-ft">
            <button type="button" class="btn btn-secondary" @click="deleteOpen = false">取消</button>
            <button type="button" class="btn btn-danger" :disabled="deleteSubmitting" @click="confirmDelete">删除</button>
          </footer>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="resetOpen" class="modal-overlay" @click.self="resetOpen = false">
        <div class="modal form-modal">
          <header class="modal-hd"><h3>轻量重置</h3></header>
          <div class="modal-bd">
            <p class="muted small">仅更新名称、描述、聚合类型（可选字段）；与 <code>faultCenterReset</code> 一致。</p>
            <label class="field"><span>名称（可选）</span><input v-model="resetForm.name" class="fc-input" type="text" /></label>
            <label class="field"><span>描述（可选）</span><textarea v-model="resetForm.description" class="fc-textarea" rows="2" /></label>
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
            <button type="button" class="btn btn-primary" :disabled="resetSubmitting" @click="submitReset">确定</button>
          </footer>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  unwrapW8t,
  faultCenterList,
  faultCenterSearch,
  faultCenterDelete,
  faultCenterReset
} from '@/api/faultcenter'
import { useFaultCenterPerm } from '@/composables/useFaultCenterPerm'
import './faultCenterCommon.css'

const router = useRouter()
const perm = useFaultCenterPerm()

const pageError = ref('')
const copyHint = ref('')
let copyTimer = null

const loading = ref(false)
const centers = ref([])

const filterQuery = ref('')
const filterId = ref('')
const filterName = ref('')

const hasListFilters = computed(() => !!(filterQuery.value || filterId.value || filterName.value))

function clearListFilters() {
  filterQuery.value = ''
  filterId.value = ''
  filterName.value = ''
  loadList()
}

/** createAt：后端为 Unix 秒 */
function formatTime(v) {
  if (v == null || v === '') return '—'
  const n = Number(v)
  if (Number.isFinite(n)) {
    const ms = n < 1e12 ? n * 1000 : n
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('zh-CN')
  }
  try {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('zh-CN')
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

function scopeLabel(row) {
  if (!row || typeof row !== 'object') return ''
  const c = row.category ?? row.scope
  if (c != null && String(c).trim()) return String(c).trim()
  if (Array.isArray(row.tags) && row.tags.length) return row.tags.map((t) => String(t)).join('、')
  if (Array.isArray(row.labels) && row.labels.length) {
    return row.labels
      .map((l) => (typeof l === 'string' ? l : l?.name || l?.key || ''))
      .filter(Boolean)
      .join('、')
  }
  return ''
}

async function loadList() {
  pageError.value = ''
  if (!perm.canList()) {
    pageError.value = '当前角色未授权列表接口（GET /api/w8t/faultCenter/faultCenterList），请联系管理员配置 Path。'
    return
  }
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

function goCreate() {
  router.push({ name: 'FaultCenterCreate' })
}

function goEdit(row) {
  router.push({ name: 'FaultCenterEdit', params: { id: row.id } })
}

function goSlo(row) {
  router.push({ name: 'FaultCenterSlo', params: { id: row.id } })
}

/** @param {{ id: string } | undefined} row */
function goWorkbench(row) {
  if (row?.id) {
    router.push({ name: 'FaultCenterWorkbench', query: { faultCenterId: row.id } })
  } else {
    router.push({ name: 'FaultCenterWorkbench' })
  }
}

async function copyId(id) {
  copyHint.value = ''
  try {
    await navigator.clipboard.writeText(id)
    copyHint.value = '已复制 ID 到剪贴板'
  } catch {
    copyHint.value = '复制失败，请手动选择复制'
  }
  if (copyTimer) clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copyHint.value = ''
  }, 2200)
}

/** ---------- JSON 详情 ---------- */
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

onMounted(() => {
  loadList()
})
</script>
