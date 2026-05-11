<template>
  <div class="am-page">
    <div class="am-head">
      <h2 class="am-title">活跃告警</h2>
      <button type="button" class="am-btn" :disabled="loading || !effectiveFc" @click="load">刷新</button>
    </div>

    <p v-if="!effectiveFc" class="am-warn">{{ embedHint }}</p>

    <div class="am-filters">
      <input v-model="query" class="am-input sm" placeholder="query" @keyup.enter="resetPage">
      <input v-model="severity" class="am-input sm" placeholder="severity">
      <input v-model="datasourceType" class="am-input sm" placeholder="datasourceType">
      <input v-model="status" class="am-input sm" placeholder="status 过滤（可空）">
      <label class="am-inline">近 <input v-model.number="scopeDays" type="number" min="1" class="am-input tiny"> 天</label>
      <select v-model="sortOrder" class="am-input sm" @change="resetPage">
        <option value="descend">时间降序</option>
        <option value="ascend">时间升序</option>
      </select>
    </div>

    <p v-if="pageError" class="am-err">{{ pageError }}</p>

    <div class="am-table-card">
      <div v-if="loading" class="am-loading"><span class="spinner" />加载中…</div>
      <table v-else class="am-table">
        <thead>
          <tr>
            <th>指纹</th>
            <th>规则</th>
            <th>级别</th>
            <th>状态</th>
            <th>故障中心</th>
            <th>首次触发</th>
            <th>认领</th>
            <th class="tc">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0">
            <td colspan="8" class="am-empty">{{ effectiveFc ? '暂无活跃告警' : '—' }}</td>
          </tr>
          <tr v-for="(row, ri) in rows" :key="pickEventFingerprint(row) || `row-${ri}`">
            <td class="mono">{{ pickEventFingerprint(row) || '—' }}</td>
            <td>{{ row.rule_name || row.ruleName || '—' }}</td>
            <td>{{ row.severity || '—' }}</td>
            <td>{{ row.status || '—' }}</td>
            <td><code>{{ row.faultCenterId || '—' }}</code></td>
            <td>{{ formatEventTs(pickFirstTriggerTime(row)) }}</td>
            <td class="small claim-stack">
              <div>{{ claimCell(row) }}</div>
              <div v-if="claimTimeLine(row)" class="claim-time">{{ claimTimeLine(row) }}</div>
            </td>
            <td class="tc">
              <button type="button" class="link" @click="openComments(row)">评论</button>
              <button
                v-if="!isEventSilenced(row)"
                type="button"
                class="link"
                @click="openSilence(row)"
              >
                静默
              </button>
              <button
                v-else-if="pickSilenceIdFromEvent(row)"
                type="button"
                class="link"
                @click="cancelPlatformSilence(row)"
              >
                取消静默
              </button>
              <button type="button" class="link" @click="claim(row)">认领</button>
              <button type="button" class="link danger" @click="removeEv(row)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="totalPages > 1" class="am-pager">
        <span class="muted">共 {{ total }} 条，每页 {{ PAGE_SIZE }} 条</span>
        <div class="am-pager-controls">
          <button
            type="button"
            class="am-btn sm"
            :disabled="index <= 1 || loading"
            @click="goPage(index - 1)"
          >
            上一页
          </button>
          <div class="am-pager-nums" role="navigation" aria-label="页码">
            <template v-for="(slot, pi) in pagerSlots" :key="'ps-' + pi">
              <span v-if="slot === 'ellipsis'" class="am-pager-ellipsis" aria-hidden="true">…</span>
              <button
                v-else
                type="button"
                class="am-btn sm am-pager-num"
                :class="{ 'is-active': slot === index }"
                :disabled="loading"
                :aria-current="slot === index ? 'page' : undefined"
                @click="goPage(slot)"
              >
                {{ slot }}
              </button>
            </template>
          </div>
          <button
            type="button"
            class="am-btn sm"
            :disabled="index >= totalPages || loading"
            @click="goPage(index + 1)"
          >
            下一页
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="silenceOpen" class="modal-overlay" @click.self="silenceOpen = false">
        <div class="modal-box wide silence-modal">
          <h3>告警静默</h3>
          <p class="silence-meta">
            指纹 <code class="fp">{{ silenceRow ? pickEventFingerprint(silenceRow) : '' }}</code>
            <span v-if="silenceRow?.rule_name || silenceRow?.ruleName" class="muted">
              · 规则 {{ silenceRow?.rule_name || silenceRow?.ruleName }}
            </span>
          </p>
          <p v-if="silenceLabelHint" class="silence-warn">{{ silenceLabelHint }}</p>

          <label class="field">
            <span>名称 <span class="req">*</span></span>
            <input v-model="silenceName" class="am-input" type="text" placeholder="静默策略名称" />
          </label>

          <div class="field">
            <span>标签匹配 <span class="req">*</span></span>
            <p class="muted small silence-tip">多条为「且」关系；若事件未带 labels，请按后端告警标签手动核对（常用 <code>alertname</code>）。</p>
            <div v-for="(lr, i) in silenceLabelRows" :key="i" class="label-matcher-row">
              <input v-model="lr.key" class="am-input sm key" type="text" placeholder="键" aria-label="标签键" />
              <select v-model="lr.operator" class="am-input sm op" aria-label="运算符">
                <option v-for="op in SILENCE_OPERATORS" :key="op" :value="op">{{ op }}</option>
              </select>
              <input v-model="lr.value" class="am-input sm val" type="text" placeholder="值" aria-label="标签值" />
              <button type="button" class="am-btn sm ghost" @click="removeSilenceLabelRow(i)">删除</button>
            </div>
            <button type="button" class="am-btn sm" @click="addSilenceLabelRow">添加条件</button>
          </div>

          <div class="field">
            <span>快捷时长（从当前时刻起）</span>
            <div class="preset-chips">
              <button
                v-for="p in SILENCE_PRESETS"
                :key="p.h"
                type="button"
                class="chip"
                @click="applySilencePresetHours(p.h)"
              >
                {{ p.label }}
              </button>
            </div>
          </div>

          <label class="field">
            <span>开始时间 <span class="req">*</span></span>
            <input v-model="silenceStartsLocal" class="am-input" type="datetime-local" />
          </label>
          <label class="field">
            <span>结束时间 <span class="req">*</span></span>
            <input v-model="silenceEndsLocal" class="am-input" type="datetime-local" />
            <span class="muted small">可配合日历控件选择更长区间；结束须晚于开始。</span>
          </label>

          <p v-if="silenceErr" class="am-err">{{ silenceErr }}</p>
          <div class="modal-actions">
            <button type="button" class="am-btn" :disabled="silenceSaving" @click="silenceOpen = false">取消</button>
            <button type="button" class="am-btn primary" :disabled="silenceSaving" @click="submitSilence">创建静默</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="commentOpen" class="modal-overlay" @click.self="commentOpen = false">
        <div class="modal-box wide">
          <h3>事件评论 <code class="fp">{{ commentFp }}</code></h3>
          <div v-if="commentsLoading" class="am-loading">加载评论…</div>
          <ul v-else class="comment-list">
            <li v-for="c in comments" :key="c.commentId || c.id || JSON.stringify(c)" class="comment-item">
              <div class="c-meta">
                <span>{{ c.username || c.userId || '—' }}</span>
                <button
                  v-if="c.commentId || c.id"
                  type="button"
                  class="link danger sm"
                  @click="delComment(c.commentId || c.id)"
                >删</button>
              </div>
              <div class="c-body">{{ c.content || c.text || '—' }}</div>
            </li>
            <li v-if="comments.length === 0" class="muted">暂无评论</li>
          </ul>
          <label class="field"><span>新增</span>
            <textarea v-model="newComment" class="am-textarea" rows="3" placeholder="内容"></textarea>
          </label>
          <p v-if="commentErr" class="am-err">{{ commentErr }}</p>
          <div class="modal-actions">
            <button type="button" class="am-btn" @click="commentOpen = false">关闭</button>
            <button type="button" class="am-btn primary" :disabled="commentSaving" @click="addComment">发表</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { normalizeListPayload } from '@/utils/w8tPage'
import { buildPagerSlots } from '@/utils/pagerSlots'
import {
  formatEventTs,
  pickFirstTriggerTime,
  pickConfirmDisplay,
  formatConfirmTimeCell,
  pickEventFingerprint
} from '@/utils/w8tEventDisplay'
import {
  curEventList,
  eventProcess,
  eventDelete,
  eventListComments,
  eventAddComment,
  eventDeleteComment,
  silenceCreate,
  silenceDelete
} from '@/api/w8tAlert'
import {
  SILENCE_OPERATORS,
  datetimeLocalToUnix,
  unixToDatetimeLocal,
  labelsForApi,
  emptySilenceLabel,
  eventRowToSilenceLabelRows,
  pickSilenceIdFromEvent,
  isEventSilenced
} from './silenceUtils'
import { useFaultCenterContextStore } from '@/store/faultCenterContext'

const props = defineProps({
  /** 详情页嵌入时传入，优先于全局上下文 */
  faultCenterId: { type: String, default: '' },
  /** 与详情 URL <code>?query=</code> 双向同步（深链） */
  syncDetailRouteQuery: { type: Boolean, default: false }
})

const fcStore = useFaultCenterContextStore()
const route = useRoute()
const router = useRouter()

const effectiveFc = computed(() => (props.faultCenterId || '').trim() || fcStore.currentFaultCenterId)
const embedHint = computed(() =>
  props.faultCenterId ? '缺少故障中心 ID。' : '请先在顶部选择故障中心。'
)

/** 行内故障中心 ID（列表字段）优先，便于与 Java BFF 的 fault_center_id 对齐 */
function faultCenterIdForRow(row) {
  const fromRow = String(row?.faultCenterId ?? row?.fault_center_id ?? '').trim()
  const g = String(effectiveFc.value ?? '').trim()
  return fromRow || g
}

const loading = ref(false)
const pageError = ref('')
const rows = ref([])
const total = ref(0)
const index = ref(1)
/** 与请求绑定；不因后端缺省/错误的 size 回写而漂移，避免分页条不出现或页码错乱 */
const PAGE_SIZE = 10

const query = ref('')
const severity = ref('')
const datasourceType = ref('')
const status = ref('')
const scopeDays = ref(7)
const sortOrder = ref('descend')

/** 快捷静默：小时数 → 展示文案 */
const SILENCE_PRESETS = [
  { h: 1, label: '1 小时' },
  { h: 2, label: '2 小时' },
  { h: 4, label: '4 小时' },
  { h: 8, label: '8 小时' },
  { h: 12, label: '12 小时' },
  { h: 24, label: '1 天' },
  { h: 48, label: '2 天' },
  { h: 72, label: '3 天' },
  { h: 168, label: '7 天' }
]

const silenceOpen = ref(false)
/** @type {import('vue').Ref<Record<string, unknown> | null>} */
const silenceRow = ref(null)
const silenceName = ref('')
const silenceStartsLocal = ref('')
const silenceEndsLocal = ref('')
const silenceLabelRows = ref([emptySilenceLabel()])
const silenceErr = ref('')
const silenceSaving = ref(false)

const silenceLabelHint = computed(() => {
  const row = silenceRow.value
  if (!row || !silenceOpen.value) return ''
  const derived = eventRowToSilenceLabelRows(row)
  if (derived.length) return ''
  if (!String(row.rule_name ?? row.ruleName ?? '').trim()) {
    return '该事件未返回 labels 与规则名，请手动填写标签条件，否则静默可能无法命中告警。'
  }
  return ''
})

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const pagerSlots = computed(() => buildPagerSlots(index.value, totalPages.value))

/** @param {Record<string, unknown>} row */
function claimCell(row) {
  const { isOk, confirmUsername } = pickConfirmDisplay(row)
  if (!isOk) return '—'
  return confirmUsername || '已认领'
}

/** @param {Record<string, unknown>} row */
function claimTimeLine(row) {
  const t = formatConfirmTimeCell(row)
  return t === '—' ? '' : t
}

function syncQueryToRoute() {
  if (!props.syncDetailRouteQuery) return
  const nextQ = query.value?.trim() || ''
  const q = { ...route.query }
  if (nextQ) q.query = nextQ
  else delete q.query
  router.replace({ path: route.path, query: q })
}

function resetPage() {
  index.value = 1
  syncQueryToRoute()
  load()
}

function applyRouteQueryToLocal() {
  if (!props.syncDetailRouteQuery) return
  const raw = route.query.query
  const s = raw == null ? '' : Array.isArray(raw) ? String(raw[0] ?? '') : String(raw)
  if (s !== query.value) query.value = s
}

applyRouteQueryToLocal()

watch(
  () => effectiveFc.value,
  (id) => {
    if (id) resetPage()
    else {
      rows.value = []
      total.value = 0
    }
  },
  { immediate: true }
)

watch(
  () => route.query.query,
  () => {
    if (!props.syncDetailRouteQuery) return
    applyRouteQueryToLocal()
    if (effectiveFc.value) load()
  }
)

async function load() {
  const fc = effectiveFc.value
  if (!fc) return
  pageError.value = ''
  loading.value = true
  try {
    const data = await curEventList({
      faultCenterId: fc,
      query: query.value?.trim() || undefined,
      severity: severity.value?.trim() || undefined,
      datasourceType: datasourceType.value?.trim() || undefined,
      status: status.value?.trim() || undefined,
      scope: scopeDays.value > 0 ? scopeDays.value : 7,
      sortOrder: sortOrder.value,
      index: index.value,
      size: PAGE_SIZE
    })
    const n = normalizeListPayload(data)
    rows.value = n.list
    total.value = n.total
    const tp = Math.max(1, Math.ceil((n.total || 0) / PAGE_SIZE))
    index.value = Math.min(Math.max(1, Number(n.index) || index.value), tp)
  } catch (e) {
    rows.value = []
    pageError.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function goPage(p) {
  const tp = Math.max(1, Math.ceil(total.value / PAGE_SIZE))
  index.value = Math.max(1, Math.min(p, tp))
  load()
}

async function claim(row) {
  const fc = faultCenterIdForRow(row)
  const fp = pickEventFingerprint(row)
  if (!fc || !fp) return
  try {
    await eventProcess({ faultCenterId: fc, fingerprints: [fp] })
    await load()
  } catch (e) {
    pageError.value = e?.message || '认领失败'
  }
}

async function removeEv(row) {
  const fc = faultCenterIdForRow(row)
  const fp = pickEventFingerprint(row)
  if (!fc || !fp) return
  if (!confirm('从 Redis 删除该活跃事件？')) return
  try {
    await eventDelete({ faultCenterId: fc, fingerprints: [fp] })
    await load()
  } catch (e) {
    pageError.value = e?.message || '删除失败'
  }
}

/** 平台静默：POST /api/w8t/silence/silenceDelete（需 curEvent 行内返回 silenceId 等） */
async function cancelPlatformSilence(row) {
  const id = pickSilenceIdFromEvent(row)
  const fc = faultCenterIdForRow(row)
  if (!id || !fc) return
  if (!confirm(`取消平台静默「${id}」？事件将按规则重新评估（非 Alertmanager 静默）。`)) return
  try {
    await silenceDelete({ id, faultCenterId: fc })
    await load()
  } catch (e) {
    pageError.value = e?.message || '取消静默失败'
  }
}

const commentOpen = ref(false)
const commentFp = ref('')
/** 打开评论弹窗时的故障中心，与列表行一致 */
const commentFc = ref('')
const comments = ref([])
const commentsLoading = ref(false)
const newComment = ref('')
const commentErr = ref('')
const commentSaving = ref(false)

async function openComments(row) {
  const fp = pickEventFingerprint(row)
  commentFp.value = fp
  commentFc.value = faultCenterIdForRow(row)
  newComment.value = ''
  commentErr.value = ''
  commentOpen.value = true
  commentsLoading.value = true
  comments.value = []
  const tenantId = localStorage.getItem('tenantId') || ''
  try {
    const data = await eventListComments({
      tenantId: tenantId || undefined,
      fingerprint: fp,
      faultCenterId: commentFc.value || undefined
    })
    comments.value = Array.isArray(data) ? data : data?.list || data?.records || []
  } catch (e) {
    commentErr.value = e?.message || '加载评论失败'
  } finally {
    commentsLoading.value = false
  }
}

async function addComment() {
  const fc = (commentFc.value || effectiveFc.value || '').trim()
  if (!fc || !commentFp.value || !newComment.value?.trim()) return
  commentSaving.value = true
  commentErr.value = ''
  try {
    await eventAddComment({
      faultCenterId: fc,
      fingerprint: commentFp.value,
      content: newComment.value.trim()
    })
    newComment.value = ''
    await openComments({ fingerprint: commentFp.value })
  } catch (e) {
    commentErr.value = e?.message || '发表失败'
  } finally {
    commentSaving.value = false
  }
}

async function delComment(commentId) {
  if (!confirm('删除该评论？')) return
  try {
    await eventDeleteComment({ commentId })
    await openComments({ fingerprint: commentFp.value })
  } catch (e) {
    commentErr.value = e?.message || '删除失败'
  }
}

/** @param {Record<string, unknown>} row */
function openSilence(row) {
  const fc = faultCenterIdForRow(row)
  const fp = pickEventFingerprint(row)
  if (!fc || !fp) return
  silenceRow.value = row
  silenceErr.value = ''
  const now = Math.floor(Date.now() / 1000)
  silenceStartsLocal.value = unixToDatetimeLocal(now)
  silenceEndsLocal.value = unixToDatetimeLocal(now + 3600)
  const derived = eventRowToSilenceLabelRows(row)
  silenceLabelRows.value = derived.length ? derived.map((x) => ({ ...x })) : [emptySilenceLabel()]
  const rule = String(row.rule_name ?? row.ruleName ?? '').trim()
  const fpShort = pickEventFingerprint(row).slice(0, 10)
  silenceName.value = rule ? `静默 · ${rule}` : `静默 · ${fpShort || '告警'}`
  silenceOpen.value = true
}

/** @param {number} h */
function applySilencePresetHours(h) {
  const now = Math.floor(Date.now() / 1000)
  silenceStartsLocal.value = unixToDatetimeLocal(now)
  silenceEndsLocal.value = unixToDatetimeLocal(now + h * 3600)
}

function addSilenceLabelRow() {
  silenceLabelRows.value = [...silenceLabelRows.value, emptySilenceLabel()]
}

/** @param {number} i */
function removeSilenceLabelRow(i) {
  const next = silenceLabelRows.value.filter((_, j) => j !== i)
  silenceLabelRows.value = next.length ? next : [emptySilenceLabel()]
}

async function submitSilence() {
  const row = silenceRow.value
  if (!row) return
  const fc = faultCenterIdForRow(row)
  silenceErr.value = ''
  const name = silenceName.value?.trim()
  if (!name) {
    silenceErr.value = '请填写名称'
    return
  }
  const labels = labelsForApi(silenceLabelRows.value)
  if (!labels.length) {
    silenceErr.value = '请至少填写一条有效的标签条件（键不能为空）'
    return
  }
  const startsAt = datetimeLocalToUnix(silenceStartsLocal.value)
  const endsAt = datetimeLocalToUnix(silenceEndsLocal.value)
  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt)) {
    silenceErr.value = '请填写有效的开始、结束时间'
    return
  }
  if (endsAt <= startsAt) {
    silenceErr.value = '结束时间必须晚于开始时间'
    return
  }
  if (!fc) {
    silenceErr.value = '缺少故障中心'
    return
  }
  silenceSaving.value = true
  try {
    await silenceCreate({
      name,
      labels,
      startsAt,
      endsAt,
      faultCenterId: fc,
      comment: `自活跃告警创建 · fp=${pickEventFingerprint(row)}`
    })
    silenceOpen.value = false
    await load()
  } catch (e) {
    silenceErr.value = e?.message || e?.response?.data?.msg || '创建静默失败'
  } finally {
    silenceSaving.value = false
  }
}

</script>

<style scoped>
.am-page { padding: 8px 0 32px; }
.am-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.am-title { margin: 0; font-size: 20px; font-weight: 600; }
.am-warn { color: #b45309; font-size: 13px; }
.am-filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; align-items: center; }
.am-input {
  padding: 8px 10px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  font-size: 13px;
}
.am-input.sm { min-width: 100px; }
.am-input.tiny { width: 56px; }
.am-inline { font-size: 13px; display: flex; align-items: center; gap: 6px; }
.am-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-default);
  background: #fff;
  font-size: 13px;
  cursor: pointer;
}
.am-btn.primary { background: #1d4ed8; color: #fff; border-color: #1d4ed8; }
.am-btn.sm { padding: 4px 10px; font-size: 12px; }
.am-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.am-err { color: #b91c1c; font-size: 13px; }
.am-table-card { border: 1px solid var(--border-default); border-radius: 10px; overflow: auto; background: #fff; }
.am-loading { padding: 16px; display: flex; align-items: center; gap: 10px; }
.spinner {
  width: 18px; height: 18px;
  border: 2px solid #ddd;
  border-top-color: #333;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.am-table { width: 100%; border-collapse: collapse; font-size: 12px; min-width: 960px; }
.am-table th, .am-table td { padding: 8px 10px; border-bottom: 1px solid var(--border-default); text-align: left; vertical-align: top; }
.am-table th { background: #fafafa; font-weight: 600; }
.mono { font-family: ui-monospace, monospace; word-break: break-all; }
.small { font-size: 12px; color: #555; }
.tc { text-align: center; }
.am-empty { text-align: center; color: #888; padding: 24px; }
.link { background: none; border: none; color: #2563eb; cursor: pointer; margin: 0 4px; font-size: 12px; }
.link.danger { color: #b91c1c; }
.link.sm { font-size: 12px; }
.am-pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  padding: 12px;
  border-top: 1px solid var(--border-default);
}
.am-pager-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.am-pager-nums {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.am-pager-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
}
.am-pager-num.is-active {
  background: #eff6ff;
  border-color: #2563eb;
  color: #1d4ed8;
  font-weight: 600;
}
.am-pager-ellipsis {
  padding: 0 2px;
  color: #888;
  font-size: 13px;
  user-select: none;
}
.muted { color: #666; font-size: 13px; }
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000;
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.modal-box {
  background: #fff; border-radius: 12px; padding: 20px 22px; min-width: 360px; max-width: 640px; width: 100%;
}
.modal-box.wide { max-width: 560px; }
.modal-box h3 { margin: 0 0 12px; font-size: 16px; }
.fp { font-size: 12px; word-break: break-all; }
.comment-list { list-style: none; margin: 0 0 12px; padding: 0; max-height: 240px; overflow: auto; }
.comment-item { border-bottom: 1px solid #eee; padding: 8px 0; }
.c-meta { display: flex; justify-content: space-between; font-size: 12px; color: #666; }
.c-body { font-size: 13px; margin-top: 4px; white-space: pre-wrap; }
.field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
.am-textarea {
  padding: 8px 10px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
}
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
.claim-stack { vertical-align: top; line-height: 1.35; }
.claim-time { font-size: 11px; color: #64748b; margin-top: 2px; }
.silence-modal { max-width: 560px; }
.silence-meta { margin: 0 0 12px; font-size: 13px; line-height: 1.5; }
.silence-warn { margin: 0 0 12px; font-size: 13px; color: #b45309; }
.silence-tip { margin: 0 0 8px; }
.preset-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--border-default);
  background: #f8fafc;
  font-size: 12px;
  cursor: pointer;
}
.chip:hover { background: #e2e8f0; }
.label-matcher-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.label-matcher-row .key { flex: 1 1 120px; min-width: 100px; }
.label-matcher-row .op { flex: 0 0 72px; }
.label-matcher-row .val { flex: 1 1 140px; min-width: 100px; }
.am-btn.ghost { background: #f8fafc; }
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; font-size: 13px; }
.req { color: #b91c1c; }
</style>
