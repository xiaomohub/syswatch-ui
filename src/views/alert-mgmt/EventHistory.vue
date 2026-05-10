<template>
  <div class="am-page">
    <div class="am-head">
      <h2 class="am-title">历史告警</h2>
      <button type="button" class="am-btn" :disabled="loading || !effectiveFc" @click="load">刷新</button>
    </div>

    <p v-if="!effectiveFc" class="am-warn">{{ embedHint }}</p>

    <div class="am-filters">
      <input v-model="query" class="am-input sm" placeholder="query" @keyup.enter="resetPage">
      <input v-model="ruleId" class="am-input sm" placeholder="ruleId">
      <input v-model="ruleName" class="am-input sm" placeholder="ruleName">
      <input v-model="fingerprint" class="am-input sm" placeholder="fingerprint">
      <input v-model="datasourceType" class="am-input sm" placeholder="datasourceType（可选）">
      <input v-model="severity" class="am-input sm" placeholder="severity">
      <input v-model="status" class="am-input sm" placeholder="status 如 Recovered">
      <label class="am-inline">开始 <input v-model="startLocal" type="datetime-local" class="am-input"></label>
      <label class="am-inline">结束 <input v-model="endLocal" type="datetime-local" class="am-input"></label>
      <select v-model="sortOrder" class="am-input sm">
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
            <th>数据源</th>
            <th>首次触发</th>
            <th>恢复时间</th>
            <th>认领人</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0">
            <td colspan="7" class="am-empty">{{ effectiveFc ? '暂无历史记录' : '—' }}</td>
          </tr>
          <tr v-for="(row, i) in rows" :key="pickEventFingerprint(row) || row.id || `h-${i}`">
            <td class="mono">{{ pickEventFingerprint(row) || '—' }}</td>
            <td>{{ pickHisEventRuleName(row) || '—' }}</td>
            <td>{{ row.severity || '—' }}</td>
            <td>{{ pickHisEventDatasourceDisplay(row) || '—' }}</td>
            <td class="nw">{{ formatEventTs(pickFirstTriggerTime(row)) }}</td>
            <td class="nw">{{ formatEventTs(pickRecoverTime(row)) }}</td>
            <td class="claim-cell claim-stack">
              <div>{{ formatHisEventClaimCell(row) }}</div>
              <div v-if="hisClaimTimeLine(row)" class="claim-time">{{ hisClaimTimeLine(row) }}</div>
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
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { normalizeListPayload } from '@/utils/w8tPage'
import {
  formatEventTs,
  formatHisEventClaimCell,
  formatConfirmTimeCell,
  pickFirstTriggerTime,
  pickRecoverTime,
  pickHisEventRuleName,
  pickHisEventDatasourceDisplay,
  pickEventFingerprint
} from '@/utils/w8tEventDisplay'
import { hisEventList } from '@/api/w8tAlert'
import { useFaultCenterContextStore } from '@/store/faultCenterContext'

const props = defineProps({
  faultCenterId: { type: String, default: '' },
  syncDetailRouteQuery: { type: Boolean, default: false }
})

const fcStore = useFaultCenterContextStore()
const route = useRoute()
const router = useRouter()

const effectiveFc = computed(() => (props.faultCenterId || '').trim() || fcStore.currentFaultCenterId)
const embedHint = computed(() =>
  props.faultCenterId ? '缺少故障中心 ID。' : '请先在顶部选择故障中心（本接口要求 faultCenterId）。'
)

const loading = ref(false)
const pageError = ref('')
const rows = ref([])
const total = ref(0)
const index = ref(1)
const PAGE_SIZE = 10

const query = ref('')
const ruleId = ref('')
const ruleName = ref('')
const fingerprint = ref('')
const datasourceType = ref('')
const severity = ref('')
const status = ref('')
const startLocal = ref('')
const endLocal = ref('')
const sortOrder = ref('descend')

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

/** @param {Record<string, unknown>} row */
function hisClaimTimeLine(row) {
  const t = formatConfirmTimeCell(row)
  return t === '—' ? '' : t
}

function toUnixSec(localStr) {
  if (!localStr) return undefined
  const d = new Date(localStr)
  const t = d.getTime()
  if (Number.isNaN(t)) return undefined
  return Math.floor(t / 1000)
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
    const startAt = toUnixSec(startLocal.value)
    const endAt = toUnixSec(endLocal.value)
    const data = await hisEventList({
      faultCenterId: fc,
      query: query.value?.trim() || undefined,
      ruleId: ruleId.value?.trim() || undefined,
      ruleName: ruleName.value?.trim() || undefined,
      fingerprint: fingerprint.value?.trim() || undefined,
      datasourceType: datasourceType.value?.trim() || undefined,
      severity: severity.value?.trim() || undefined,
      status: status.value?.trim() || undefined,
      startAt,
      endAt,
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
.am-input.sm { min-width: 120px; }
.am-inline { font-size: 13px; display: flex; align-items: center; gap: 6px; }
.am-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-default);
  background: #fff;
  font-size: 13px;
  cursor: pointer;
}
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
.am-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 960px; }
.am-table th, .am-table td { padding: 8px 10px; border-bottom: 1px solid var(--border-default); text-align: left; }
.am-table th { background: #fafafa; font-weight: 600; }
.mono { font-family: ui-monospace, monospace; word-break: break-all; }
.nw { white-space: nowrap; }
.claim-cell { font-size: 13px; max-width: 160px; word-break: break-word; }
.claim-stack { vertical-align: top; line-height: 1.35; }
.claim-time { font-size: 11px; color: #64748b; margin-top: 2px; }
.am-empty { text-align: center; color: #888; padding: 24px; }
.am-pager { display: flex; align-items: center; gap: 10px; padding: 12px; border-top: 1px solid var(--border-default); }
.muted { color: #666; font-size: 13px; }
</style>
