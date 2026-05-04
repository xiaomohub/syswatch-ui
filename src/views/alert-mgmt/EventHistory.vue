<template>
  <div class="am-page">
    <div class="am-head">
      <h2 class="am-title">历史告警</h2>
      <button type="button" class="am-btn" :disabled="loading || !fcStore.currentFaultCenterId" @click="load">刷新</button>
    </div>

    <p v-if="!fcStore.currentFaultCenterId" class="am-warn">请先在顶部选择故障中心（本接口要求 faultCenterId）。</p>

    <div class="am-filters">
      <input v-model="query" class="am-input sm" placeholder="query" @keyup.enter="resetPage">
      <input v-model="ruleId" class="am-input sm" placeholder="ruleId">
      <input v-model="ruleName" class="am-input sm" placeholder="ruleName">
      <input v-model="fingerprint" class="am-input sm" placeholder="fingerprint">
      <input v-model="datasourceType" class="am-input sm" placeholder="datasourceType">
      <input v-model="severity" class="am-input sm" placeholder="severity">
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
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0">
            <td colspan="5" class="am-empty">{{ fcStore.currentFaultCenterId ? '暂无历史记录' : '—' }}</td>
          </tr>
          <tr v-for="(row, i) in rows" :key="row.fingerprint || row.id || i">
            <td class="mono">{{ row.fingerprint || '—' }}</td>
            <td>{{ row.rule_name || row.ruleName || '—' }}</td>
            <td>{{ row.severity || '—' }}</td>
            <td>{{ row.datasourceType || '—' }}</td>
            <td>{{ formatTs(row.first_trigger_time) }}</td>
          </tr>
        </tbody>
      </table>

      <div v-if="total > size" class="am-pager">
        <span class="muted">共 {{ total }} 条</span>
        <button type="button" class="am-btn sm" :disabled="index <= 1" @click="goPage(index - 1)">上一页</button>
        <span>{{ index }} / {{ totalPages }}</span>
        <button type="button" class="am-btn sm" :disabled="index >= totalPages" @click="goPage(index + 1)">下一页</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { normalizeListPayload } from '@/utils/w8tPage'
import { hisEventList } from '@/api/w8tAlert'
import { useFaultCenterContextStore } from '@/store/faultCenterContext'

const fcStore = useFaultCenterContextStore()

const loading = ref(false)
const pageError = ref('')
const rows = ref([])
const total = ref(0)
const index = ref(1)
const size = ref(20)

const query = ref('')
const ruleId = ref('')
const ruleName = ref('')
const fingerprint = ref('')
const datasourceType = ref('')
const severity = ref('')
const startLocal = ref('')
const endLocal = ref('')
const sortOrder = ref('descend')

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / size.value)))

function toUnixSec(localStr) {
  if (!localStr) return undefined
  const d = new Date(localStr)
  const t = d.getTime()
  if (Number.isNaN(t)) return undefined
  return Math.floor(t / 1000)
}

function formatTs(v) {
  if (v == null || v === '') return '—'
  const n = Number(v)
  const ms = n < 1e12 ? n * 1000 : n
  try {
    return new Date(ms).toLocaleString('zh-CN')
  } catch {
    return String(v)
  }
}

function resetPage() {
  index.value = 1
  load()
}

watch(
  () => fcStore.currentFaultCenterId,
  (id) => {
    if (id) resetPage()
    else {
      rows.value = []
      total.value = 0
    }
  }
)

async function load() {
  const fc = fcStore.currentFaultCenterId
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
      startAt,
      endAt,
      sortOrder: sortOrder.value,
      index: index.value,
      size: Math.max(1, size.value)
    })
    const n = normalizeListPayload(data)
    rows.value = n.list
    total.value = n.total
    index.value = n.index
    size.value = n.size
  } catch (e) {
    rows.value = []
    pageError.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function goPage(p) {
  index.value = Math.max(1, Math.min(p, totalPages.value))
  load()
}

onMounted(() => {
  if (fcStore.currentFaultCenterId) load()
})
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
.am-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 720px; }
.am-table th, .am-table td { padding: 8px 10px; border-bottom: 1px solid var(--border-default); text-align: left; }
.am-table th { background: #fafafa; font-weight: 600; }
.mono { font-family: ui-monospace, monospace; word-break: break-all; }
.am-empty { text-align: center; color: #888; padding: 24px; }
.am-pager { display: flex; align-items: center; gap: 10px; padding: 12px; border-top: 1px solid var(--border-default); }
.muted { color: #666; font-size: 13px; }
</style>
