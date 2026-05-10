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
          <tr v-for="row in rows" :key="row.fingerprint">
            <td class="mono">{{ row.fingerprint }}</td>
            <td>{{ row.rule_name || row.ruleName || '—' }}</td>
            <td>{{ row.severity || '—' }}</td>
            <td>{{ row.status || '—' }}</td>
            <td><code>{{ row.faultCenterId || '—' }}</code></td>
            <td>{{ formatEventTs(pickFirstTriggerTime(row)) }}</td>
            <td class="small">{{ claimCell(row) }}</td>
            <td class="tc">
              <button type="button" class="link" @click="openComments(row)">评论</button>
              <button type="button" class="link" @click="claim(row)">认领</button>
              <button type="button" class="link danger" @click="removeEv(row)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="totalPages > 1" class="am-pager">
        <span class="muted">共 {{ total }} 条，每页 {{ PAGE_SIZE }} 条</span>
        <button type="button" class="am-btn sm" :disabled="index <= 1" @click="goPage(index - 1)">上一页</button>
        <span>{{ index }} / {{ totalPages }}</span>
        <button type="button" class="am-btn sm" :disabled="index >= totalPages" @click="goPage(index + 1)">下一页</button>
      </div>
    </div>

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
import { formatEventTs, pickFirstTriggerTime, pickConfirmDisplay } from '@/utils/w8tEventDisplay'
import {
  curEventList,
  eventProcess,
  eventDelete,
  eventListComments,
  eventAddComment,
  eventDeleteComment
} from '@/api/w8tAlert'
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

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

/** @param {Record<string, unknown>} row */
function claimCell(row) {
  const { isOk, confirmUsername } = pickConfirmDisplay(row)
  if (!isOk) return '—'
  return confirmUsername || '已认领'
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
  if (!fc || !row.fingerprint) return
  try {
    await eventProcess({ faultCenterId: fc, fingerprints: [row.fingerprint] })
    await load()
  } catch (e) {
    pageError.value = e?.message || '认领失败'
  }
}

async function removeEv(row) {
  const fc = faultCenterIdForRow(row)
  if (!fc || !row.fingerprint) return
  if (!confirm('从 Redis 删除该活跃事件？')) return
  try {
    await eventDelete({ faultCenterId: fc, fingerprints: [row.fingerprint] })
    await load()
  } catch (e) {
    pageError.value = e?.message || '删除失败'
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
  commentFp.value = row.fingerprint
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
      fingerprint: row.fingerprint,
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
.am-pager { display: flex; align-items: center; gap: 10px; padding: 12px; border-top: 1px solid var(--border-default); }
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
</style>
