<template>
  <div class="am-page" :class="{ embedded }">
    <div v-if="!embedded" class="am-head">
      <h2 class="am-title">通知记录</h2>
      <div class="am-actions">
        <button type="button" class="am-btn" :disabled="loading" @click="load">刷新</button>
      </div>
    </div>
    <div v-else class="am-head am-head-compact">
      <div class="am-actions">
        <button type="button" class="am-btn sm" :disabled="loading" @click="load">刷新</button>
      </div>
    </div>

    <div class="am-filters">
      <template v-if="!embedded">
        <input v-model="f.eventId" class="am-input sm" placeholder="事件 ID" @keyup.enter="resetPage">
        <input v-model="f.severity" class="am-input sm" placeholder="等级 severity" @keyup.enter="resetPage">
        <input v-model="f.status" class="am-input sm" placeholder="状态 status" @keyup.enter="resetPage">
        <input v-model="f.uuid" class="am-input sm" placeholder="通知对象 uuid" @keyup.enter="resetPage">
        <input v-model="f.query" class="am-input sm" placeholder="关键词" @keyup.enter="resetPage">
      </template>
      <template v-else>
        <input v-model="f.severity" class="am-input sm" placeholder="等级 severity" @keyup.enter="resetPage">
        <input v-model="f.status" class="am-input sm" placeholder="状态 status" @keyup.enter="resetPage">
        <input v-model="f.query" class="am-input sm" placeholder="关键词 query" @keyup.enter="resetPage">
      </template>
      <button type="button" class="am-btn sm" @click="resetPage">查询</button>
      <button type="button" class="am-btn sm" @click="resetFilters">重置</button>
    </div>

    <p v-if="pageError" class="am-err">{{ pageError }}</p>

    <div class="am-table-card">
      <div v-if="loading" class="am-loading"><span class="spinner" />加载中…</div>
      <table v-else class="am-table">
        <thead>
          <tr>
            <th>时间</th>
            <th>规则 / 事件</th>
            <th>渠道</th>
            <th>对象</th>
            <th>等级</th>
            <th class="th-status">状态</th>
            <th>告警摘要</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0">
            <td colspan="7" class="am-empty">暂无记录</td>
          </tr>
          <tr v-for="(row, ri) in rows" :key="rowKey(row, ri)">
            <td class="nw">{{ formatTime(row.createAt) }}</td>
            <td class="rule-event">
              <div class="rule-name-line">{{ row.ruleName || '—' }}</div>
              <div class="event-wrap" :title="row.eventId || ''">
                <code class="event-id">{{ row.eventId || '—' }}</code>
              </div>
            </td>
            <td class="td-chan">
              <NotificationTypeIcon :type="row.nType" />
            </td>
            <td class="td-obj">
              <template v-if="rowObjLabel(row).name">
                <div class="obj-name-line">{{ rowObjLabel(row).name }}</div>
                <div class="obj-id-wrap" :title="row.nObj || ''">
                  <code class="obj-code">{{ row.nObj || '—' }}</code>
                </div>
              </template>
              <code v-else class="obj-code" :title="row.nObj || ''">{{ row.nObj || '—' }}</code>
            </td>
            <td>
              <span class="sev" :class="`sev-${String(row.severity || '')}`">{{ row.severity }}</span>
            </td>
            <td class="td-status">
              <span :class="['pill', 'pill-inline', row.status === 0 ? 'ok' : 'bad']">
                {{ row.status === 0 ? '成功' : '失败' }}
              </span>
            </td>
            <td class="msg">
              <div class="summary-row">
                <button
                  v-if="hasSummaryDetail(row)"
                  type="button"
                  class="summary-preview summary-preview-btn"
                  :title="listSummaryTitle(row)"
                  @click="openSummary(row)"
                >
                  {{ recordListPreview(row) }}
                </button>
                <span v-else class="summary-preview muted-preview">{{ recordListPreview(row) }}</span>
                <button
                  v-if="hasSummaryDetail(row)"
                  type="button"
                  class="btn-view-summary"
                  @click="openSummary(row)"
                >
                  查看
                </button>
                <button
                  v-if="perm.canRecordAlarmDetail() && eventIdForRow(row)"
                  type="button"
                  class="btn-view-summary"
                  @click="openAlarmDetail(row)"
                >
                  详情
                </button>
              </div>
              <div v-if="row.errMsg" class="sub-err">{{ row.errMsg }}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="total > size" class="am-pager">
        <span class="muted">共 {{ total }} 条 · 每页 {{ size }}</span>
        <button type="button" class="am-btn sm" :disabled="index <= 1" @click="goPage(index - 1)">上一页</button>
        <span class="muted">第 {{ index }} / {{ totalPages }} 页</span>
        <button type="button" class="am-btn sm" :disabled="index >= totalPages" @click="goPage(index + 1)">下一页</button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="detailOpen" class="ard-mask" @click.self="closeAlarmDetail">
        <aside class="ard-panel" @click.stop>
          <header class="ard-head">
            <h2 class="ard-title">告警详情</h2>
            <button type="button" class="ard-x" aria-label="关闭" @click="closeAlarmDetail">×</button>
          </header>
          <div class="ard-content">
            <div v-if="detailLoading" class="ard-loading"><span class="spinner" />加载中…</div>
            <p v-else-if="detailError" class="ard-err">{{ detailError }}</p>
            <template v-else-if="detailVo">
              <div class="ard-chips">
                <span class="ard-chip">来源：{{ detailVo.source }}</span>
                <span v-if="detailVo.faultCenterId || detailVo.fault_center_id" class="ard-chip"
                  >FC：<code>{{ detailVo.faultCenterId || detailVo.fault_center_id }}</code></span
                >
                <span v-if="detailVo.historyId || detailVo.history_id" class="ard-chip"
                  >historyId：<code>{{ detailVo.historyId || detailVo.history_id }}</code></span
                >
                <span
                  v-if="
                    (detailVo.historyStatus != null && detailVo.historyStatus !== '') ||
                    (detailVo.history_status != null && detailVo.history_status !== '')
                  "
                  class="ard-chip"
                  >状态：{{ detailVo.historyStatus ?? detailVo.history_status }}</span
                >
                <span v-if="detailFirstTriggerText" class="ard-chip">首次触发：{{ detailFirstTriggerText }}</span>
              </div>
              <pre v-if="detailVo.event != null" class="ard-pre">{{ detailEventJson }}</pre>
              <p v-else-if="detailVo.message" class="ard-msg">{{ detailVo.message }}</p>
              <p v-else class="ard-msg muted">无事件数据</p>
            </template>
          </div>
        </aside>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="summaryOpen" class="sum-mask" @click.self="summaryOpen = false">
        <div class="sum-dialog" role="dialog" aria-modal="true" aria-labelledby="sum-dialog-title" @click.stop>
          <header class="sum-head">
            <h2 id="sum-dialog-title" class="sum-title">告警内容</h2>
            <button type="button" class="sum-x" aria-label="关闭" @click="summaryOpen = false">×</button>
          </header>
          <div class="sum-meta" v-if="summaryRow">
            <span v-if="summaryRow.ruleName" class="sum-chip">{{ summaryRow.ruleName }}</span>
            <code v-if="summaryRow.eventId" class="sum-chip mono">{{ summaryRow.eventId }}</code>
          </div>
          <div class="sum-body">
            <pre class="sum-pre">{{ recordAlarmBody(summaryRow) }}</pre>
            <p v-if="summaryRow?.errMsg" class="sum-err-label">错误信息</p>
            <pre v-if="summaryRow?.errMsg" class="sum-pre err">{{ summaryRow.errMsg }}</pre>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { noticeList, noticeRecordAlarmDetail, noticeRecordList } from '@/api/notice'
import { useNoticePerm } from '@/composables/useNoticePerm'
import { useFaultCenterContextStore } from '@/store/faultCenterContext'
import NotificationTypeIcon from '@/views/notice-objects/NotificationTypeIcon.vue'

const props = defineProps({
  /** 内嵌于通知对象 Drawer，固定 uuid 过滤 */
  embedded: { type: Boolean, default: false },
  /** 通知对象 uuid，对应请求参数 uuid */
  noticeObjectId: { type: String, default: '' },
  /** 内嵌时当前对象名称（与 noticeObjectId 对应），用于对象列展示 */
  noticeObjectName: { type: String, default: '' }
})

const perm = useNoticePerm()
const fcStore = useFaultCenterContextStore()
const loading = ref(false)
const pageError = ref('')
const rows = ref([])
const total = ref(0)
const index = ref(1)
const size = ref(20)

const f = reactive({
  eventId: '',
  severity: '',
  status: '',
  uuid: '',
  query: ''
})

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / size.value)))

const summaryOpen = ref(false)
const summaryRow = ref(null)

const detailOpen = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
/** @type {import('vue').Ref<import('@/types/notice').NoticeRecordAlarmDetailVO | null>} */
const detailVo = ref(null)

const detailEventJson = computed(() => {
  const ev = detailVo.value?.event
  if (ev == null) return ''
  try {
    return JSON.stringify(ev, null, 2)
  } catch {
    return String(ev)
  }
})

const detailFirstTriggerText = computed(() => {
  const t = detailVo.value?.firstTriggerTime ?? detailVo.value?.first_trigger_time
  if (t == null || !Number.isFinite(Number(t))) return ''
  const n = Number(t)
  const d = new Date(n < 1e12 ? n * 1000 : n)
  return Number.isNaN(d.getTime()) ? String(t) : d.toLocaleString()
})

function eventIdForRow(row) {
  const id = row?.eventId
  return id != null && String(id).trim() !== '' ? String(id).trim() : ''
}

function faultCenterIdForRecordRow(row) {
  const fromRow = String(row?.faultCenterId ?? row?.fault_center_id ?? '').trim()
  if (fromRow) return fromRow
  return String(fcStore.currentFaultCenterId || '').trim() || undefined
}

function closeAlarmDetail() {
  detailOpen.value = false
}

async function openAlarmDetail(row) {
  const eid = eventIdForRow(row)
  if (!eid || !perm.canRecordAlarmDetail()) return
  detailVo.value = null
  detailError.value = ''
  detailOpen.value = true
  detailLoading.value = true
  try {
    const data = await noticeRecordAlarmDetail({
      eventId: eid,
      faultCenterId: faultCenterIdForRecordRow(row)
    })
    detailVo.value = data && typeof data === 'object' ? data : null
  } catch (e) {
    detailError.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    detailLoading.value = false
  }
}

/** @type {import('vue').Ref<Record<string, string>>} */
const objNameCache = ref({})

function rowObjLabel(row) {
  const id = row?.nObj != null && String(row.nObj).trim() !== '' ? String(row.nObj).trim() : ''
  const apiName = row?.nObjName
  if (apiName != null && String(apiName).trim() !== '') {
    return { name: String(apiName).trim(), id }
  }
  if (props.embedded && props.noticeObjectName && id && id === props.noticeObjectId) {
    return { name: props.noticeObjectName, id }
  }
  if (id && objNameCache.value[id]) {
    return { name: objNameCache.value[id], id }
  }
  return { name: '', id }
}

function mergeNoticeNames(objs) {
  if (!Array.isArray(objs) || objs.length === 0) return
  const next = { ...objNameCache.value }
  for (const o of objs) {
    const name = o?.name
    if (name == null || String(name).trim() === '') continue
    const n = String(name).trim()
    if (o.uuid) next[o.uuid] = n
    if (o.id) next[o.id] = n
  }
  objNameCache.value = next
}

async function enrichObjNamesForRows(recordRows) {
  if (!perm.canList() || !Array.isArray(recordRows) || recordRows.length === 0) return
  let needFetch = false
  for (const row of recordRows) {
    const id = row?.nObj != null && String(row.nObj).trim() !== '' ? String(row.nObj).trim() : ''
    if (!id) continue
    if (row?.nObjName != null && String(row.nObjName).trim() !== '') continue
    if (props.embedded && props.noticeObjectName && id === props.noticeObjectId) continue
    if (!objNameCache.value[id]) {
      needFetch = true
      break
    }
  }
  if (!needFetch) return
  try {
    const data = await noticeList({})
    const arr = Array.isArray(data) ? data : []
    mergeNoticeNames(arr)
    const loose = { ...objNameCache.value }
    let changed = false
    for (const row of recordRows) {
      const id = row?.nObj != null && String(row.nObj).trim() !== '' ? String(row.nObj).trim() : ''
      if (!id || loose[id]) continue
      const hit = arr.find(
        (o) =>
          o?.uuid &&
          o?.name != null &&
          String(o.name).trim() !== '' &&
          (o.uuid === id || (id.length >= 8 && o.uuid.includes(id)))
      )
      if (hit) {
        loose[id] = String(hit.name).trim()
        changed = true
      }
    }
    if (changed) objNameCache.value = loose
  } catch {
    /* 仅展示 nObj */
  }
}

function rowKey(row, ri) {
  return `${row.eventId ?? ''}:${row.createAt ?? ''}:${row.nType ?? ''}:${row.nObj ?? ''}:${ri}`
}

function previewAlarm(msg) {
  if (msg == null || String(msg).trim() === '') return '—'
  const t = String(msg).replace(/\s+/g, ' ').trim()
  const max = 56
  return t.length > max ? `${t.slice(0, max)}…` : t
}

function recordListPreview(row) {
  const m = row?.alarmMsg
  if (m != null && String(m).trim() !== '') return previewAlarm(m)
  const d = row?.alarmDetail
  if (d == null) return '—'
  if (typeof d === 'string' && String(d).trim() !== '') return previewAlarm(d)
  if (typeof d === 'object') return previewAlarm(JSON.stringify(d))
  return '—'
}

function listSummaryTitle(row) {
  const body = recordAlarmBody(row)
  return body === '—' ? '' : body
}

function recordAlarmBody(row) {
  if (!row) return '—'
  const d = row.alarmDetail
  if (d != null) {
    if (typeof d === 'string' && String(d).trim() !== '') return d
    if (typeof d === 'object') return JSON.stringify(d, null, 2)
  }
  const m = row.alarmMsg
  return m != null && String(m).trim() !== '' ? String(m) : '—'
}

function hasSummaryDetail(row) {
  const m = row?.alarmMsg
  const d = row?.alarmDetail
  const hasM = m != null && String(m).trim() !== ''
  const hasD =
    d != null &&
    (typeof d === 'object' || (typeof d === 'string' && String(d).trim() !== ''))
  return hasM || hasD
}

function openSummary(row) {
  summaryRow.value = row
  summaryOpen.value = true
}

function formatTime(ts) {
  if (ts == null || !Number.isFinite(ts)) return '—'
  const d = new Date(ts < 1e12 ? ts * 1000 : ts)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

function resetFilters() {
  f.eventId = ''
  f.severity = ''
  f.status = ''
  f.uuid = props.embedded && props.noticeObjectId ? props.noticeObjectId : ''
  f.query = ''
  resetPage()
}

function resetPage() {
  index.value = 1
  load()
}

function goPage(p) {
  index.value = Math.max(1, Math.min(p, totalPages.value))
  load()
}

async function load() {
  pageError.value = ''
  if (!perm.canRecordList()) {
    pageError.value = '无通知记录列表权限'
    rows.value = []
    return
  }
  loading.value = true
  try {
    const uuid =
      props.embedded && props.noticeObjectId
        ? props.noticeObjectId
        : f.uuid.trim() || undefined
    const data = await noticeRecordList({
      eventId: props.embedded ? undefined : f.eventId.trim() || undefined,
      severity: f.severity.trim() || undefined,
      status: f.status.trim() || undefined,
      uuid,
      query: f.query.trim() || undefined,
      index: index.value,
      size: size.value
    })
    rows.value = data.list || []
    total.value = data.total ?? 0
    index.value = data.index ?? index.value
    size.value = data.size ?? size.value
    enrichObjNamesForRows(rows.value)
  } catch (e) {
    rows.value = []
    pageError.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.noticeObjectId,
  (id) => {
    if (props.embedded && id) {
      f.uuid = id
      resetPage()
    }
  }
)

onMounted(() => {
  if (props.embedded && props.noticeObjectId) {
    f.uuid = props.noticeObjectId
  }
  load()
})
</script>

<style scoped>
.am-page {
  padding: 8px 0 32px;
}
.am-page.embedded {
  padding: 0 0 16px;
}
.am-page.embedded .am-table-card {
  border-color: transparent;
  box-shadow: none;
}
.am-page.embedded .am-table th {
  background: #f8fafc;
}
.am-head-compact {
  margin-bottom: 8px;
  justify-content: flex-end;
}
.am-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.am-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
.am-actions {
  display: flex;
  gap: 8px;
}
.am-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.am-input {
  padding: 8px 10px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  font-size: 13px;
}
.am-input.sm {
  min-width: 120px;
}
.am-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-default);
  background: #fff;
  font-size: 13px;
  cursor: pointer;
}
.am-btn.sm {
  padding: 4px 10px;
  font-size: 12px;
}
.am-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.am-err {
  color: #b91c1c;
  font-size: 13px;
}
.am-table-card {
  border: 1px solid var(--border-default);
  border-radius: 10px;
  overflow: auto;
  background: #fff;
}
.am-loading {
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #ddd;
  border-top-color: #333;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.am-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 860px;
}
.am-table th,
.am-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-default);
  vertical-align: middle;
}
.am-table th {
  background: #fafafa;
  font-weight: 600;
}
.th-status {
  white-space: nowrap;
  width: 1%;
}
.rule-event {
  max-width: 220px;
  min-width: 140px;
}
.rule-name-line {
  font-weight: 600;
  color: #111827;
  line-height: 1.35;
}
.event-wrap {
  margin-top: 4px;
  min-width: 0;
}
.event-id {
  display: block;
  font-size: 11px;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
.td-chan {
  white-space: nowrap;
  width: 1%;
}
.td-obj {
  max-width: 200px;
  min-width: 100px;
}
.obj-name-line {
  font-weight: 600;
  color: #111827;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
.obj-id-wrap {
  margin-top: 4px;
  min-width: 0;
}
.obj-code {
  display: block;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
.td-status {
  white-space: nowrap;
  width: 1%;
  text-align: left;
  vertical-align: middle;
}
.nw {
  white-space: nowrap;
}
.msg {
  max-width: 260px;
  min-width: 120px;
  word-break: break-word;
}
.summary-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
}
.summary-preview {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #334155;
  text-align: left;
}
.summary-preview-btn {
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  font: inherit;
  color: #1e40af;
}
.summary-preview-btn:hover {
  text-decoration: underline;
}
.muted-preview {
  color: #94a3b8;
}
.btn-view-summary {
  flex-shrink: 0;
  border: none;
  background: none;
  padding: 2px 6px;
  font-size: 12px;
  color: #2563eb;
  cursor: pointer;
  border-radius: 4px;
}
.btn-view-summary:hover {
  background: #eff6ff;
}
.sub-err {
  color: #b91c1c;
  font-size: 12px;
  margin-top: 4px;
}
.pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
}
.pill-inline {
  white-space: nowrap;
}
.pill.ok {
  background: #dcfce7;
  color: #166534;
}
.pill.bad {
  background: #fee2e2;
  color: #991b1b;
}
.am-empty {
  text-align: center;
  color: #888;
  padding: 28px;
}
.am-pager {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--border-default);
}
.muted {
  color: #666;
  font-size: 13px;
}
.sev {
  font-weight: 600;
  font-size: 13px;
}
.sev-P0 {
  color: #b91c1c;
}
.sev-P1 {
  color: #c2410c;
}
.sev-P2 {
  color: #4b5563;
}

.sum-mask {
  position: fixed;
  inset: 0;
  z-index: 1300;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.sum-dialog {
  width: min(640px, 100%);
  max-height: min(80vh, 720px);
  background: var(--bg-surface, #fff);
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.sum-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-default, #e5e7eb);
}
.sum-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.sum-x {
  border: none;
  background: none;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  color: #64748b;
}
.sum-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 18px;
  background: #f8fafc;
  border-bottom: 1px solid var(--border-default, #e5e7eb);
}
.sum-chip {
  font-size: 12px;
  color: #475569;
}
.sum-chip.mono {
  font-family: ui-monospace, monospace;
  word-break: break-all;
}
.sum-body {
  padding: 14px 18px;
  overflow: auto;
  flex: 1;
  min-height: 0;
}
.sum-pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  line-height: 1.55;
  color: #0f172a;
  font-family: inherit;
}
.sum-pre.err {
  color: #991b1b;
}
.sum-err-label {
  margin: 14px 0 6px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}

.ard-mask {
  position: fixed;
  inset: 0;
  z-index: 1310;
  background: rgba(15, 23, 42, 0.35);
  display: flex;
  justify-content: flex-end;
}
.ard-panel {
  width: min(560px, 100vw);
  height: 100%;
  background: var(--bg-surface, #fff);
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
}
.ard-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-default, #e5e7eb);
  flex-shrink: 0;
}
.ard-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.ard-x {
  border: none;
  background: none;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  color: #64748b;
}
.ard-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 12px 18px 20px;
}
.ard-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 0;
  color: #64748b;
}
.ard-err {
  color: #b91c1c;
  font-size: 13px;
  margin: 12px 0;
}
.ard-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}
.ard-chip {
  font-size: 12px;
  color: #475569;
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 6px;
}
.ard-chip code {
  font-size: 11px;
}
.ard-pre {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  background: #f8fafc;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}
.ard-msg {
  font-size: 13px;
  color: #334155;
  margin: 0;
}
.ard-msg.muted {
  color: #94a3b8;
}
</style>
