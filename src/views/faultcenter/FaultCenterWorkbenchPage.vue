<template>
  <div class="fc-page">
    <div class="fc-page-head fc-head-unified">
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
        <h2>工作台</h2>
      </div>
      <div class="fc-head-end">
        <label class="field" style="margin: 0; flex-direction: row; align-items: center; gap: 8px">
          <span style="white-space: nowrap">故障中心</span>
          <select v-model="selectedId" class="fc-input" style="min-width: 220px" @change="onSelectFc">
            <option value="" disabled>请选择</option>
            <option v-for="c in fcStore.centers" :key="c.id" :value="c.id">{{ c.name || c.id }}</option>
          </select>
        </label>
        <button type="button" class="btn btn-secondary" :disabled="loading || !selectedId" @click="loadDash">刷新</button>
        <button type="button" class="btn btn-secondary" @click="goList">返回列表</button>
      </div>
    </div>

    <p class="muted small">
      <code>GET /api/system/getDashboardInfo?faultCenterId=</code>（Auth + TenantID，无 w8t Permission）。规则总数
      <code>countAlertRules</code> 为租户全量，未必按当前中心过滤。
    </p>

    <p v-if="pageError" class="fc-page-error">{{ pageError }}</p>
    <p v-if="!selectedId && !fcStore.loading" class="fc-page-error">请先选择故障中心；若无选项请先在列表中创建中心。</p>

    <div v-if="loading" class="fc-loading"><div class="spinner"></div>加载中…</div>

    <template v-else-if="dash && selectedId">
      <div class="fc-table-card" style="padding: 18px">
        <div class="wb-stats">
          <div class="wb-stat">
            <span class="wb-stat-k">规则总数</span>
            <span class="wb-stat-v">{{ dash.countAlertRules ?? '—' }}</span>
          </div>
          <div class="wb-stat">
            <span class="wb-stat-k">故障中心数</span>
            <span class="wb-stat-v">{{ dash.faultCenterNumber ?? '—' }}</span>
          </div>
          <div class="wb-stat">
            <span class="wb-stat-k">用户数</span>
            <span class="wb-stat-v">{{ dash.userNumber ?? '—' }}</span>
          </div>
        </div>

        <h4 class="fc-form-h" style="margin-top: 18px">告警分布</h4>
        <div class="wb-dist">
          <span v-for="(n, sev) in alarmDist" :key="sev" class="wb-pill">{{ sev }}：{{ n }}</span>
          <span v-if="!Object.keys(alarmDist).length" class="muted small">暂无分布数据</span>
        </div>

        <h4 class="fc-form-h" style="margin-top: 18px">当前告警摘要（按 ruleName 去重）</h4>
        <div class="wb-table-wrap">
          <table class="wb-table">
            <thead>
              <tr>
                <th>规则名</th>
                <th>严重级别</th>
                <th>中心 ID</th>
                <th>触发时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in curAlerts" :key="i">
                <td>{{ row.ruleName || '—' }}</td>
                <td>{{ row.severity || '—' }}</td>
                <td><code>{{ row.faultCenterId || '—' }}</code></td>
                <td class="mono">{{ row.tiggerTime ?? row.triggerTime ?? '—' }}</td>
              </tr>
              <tr v-if="!curAlerts.length">
                <td colspan="4" class="wb-empty">暂无当前告警</td>
              </tr>
            </tbody>
          </table>
        </div>

        <details style="margin-top: 16px">
          <summary class="muted small" style="cursor: pointer">原始 JSON</summary>
          <pre class="json-pre" style="margin-top: 8px">{{ pretty(dash) }}</pre>
        </details>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { unwrapW8t, getDashboardInfo } from '@/api/faultcenter'
import { useFaultCenterContextStore } from '@/store/faultCenterContext'
import './faultCenterCommon.css'

const route = useRoute()
const router = useRouter()
const fcStore = useFaultCenterContextStore()

const selectedId = ref('')
const loading = ref(false)
const pageError = ref('')
/** @type {import('vue').Ref<Record<string, any> | null>} */
const dash = ref(null)

const curAlerts = computed(() => {
  const list = dash.value?.curAlertList
  return Array.isArray(list) ? list : []
})

const alarmDist = computed(() => {
  const d = dash.value?.alarmDistribution
  return d && typeof d === 'object' ? d : {}
})

function pretty(obj) {
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}

async function loadDash() {
  pageError.value = ''
  if (!selectedId.value) {
    dash.value = null
    return
  }
  loading.value = true
  try {
    const res = await getDashboardInfo({ faultCenterId: selectedId.value })
    dash.value = unwrapW8t(res)
  } catch (e) {
    dash.value = null
    pageError.value = e?.message || '加载工作台失败'
  } finally {
    loading.value = false
  }
}

function onSelectFc() {
  fcStore.setCurrentFaultCenterId(selectedId.value)
  loadDash()
}

function goList() {
  router.push({ name: 'FaultCenterList' })
}

function goDashboard() {
  router.push({ name: 'Dashboard' })
}

watch(
  () => fcStore.centers,
  (list) => {
    if (!Array.isArray(list) || !list.length) return
    const q = route.query.faultCenterId
    const qid = typeof q === 'string' ? q : Array.isArray(q) ? q[0] : ''
    if (qid && list.some((c) => c.id === qid)) {
      selectedId.value = qid
      fcStore.setCurrentFaultCenterId(qid)
      loadDash()
    } else if (!selectedId.value && fcStore.currentFaultCenterId) {
      selectedId.value = fcStore.currentFaultCenterId
      loadDash()
    } else if (!selectedId.value && list[0]) {
      selectedId.value = list[0].id
      fcStore.setCurrentFaultCenterId(list[0].id)
      loadDash()
    }
  },
  { deep: true }
)

watch(
  () => route.query.faultCenterId,
  (q) => {
    const qid = typeof q === 'string' ? q : ''
    if (qid && fcStore.centers.some((c) => c.id === qid)) {
      selectedId.value = qid
      fcStore.setCurrentFaultCenterId(qid)
      loadDash()
    }
  }
)

async function init() {
  await fcStore.loadCenters()
  const q = route.query.faultCenterId
  const qid = typeof q === 'string' ? q : Array.isArray(q) ? q[0] : ''
  if (qid && fcStore.centers.some((c) => c.id === qid)) {
    selectedId.value = qid
    fcStore.setCurrentFaultCenterId(qid)
  } else if (fcStore.currentFaultCenterId && fcStore.centers.some((c) => c.id === fcStore.currentFaultCenterId)) {
    selectedId.value = fcStore.currentFaultCenterId
  } else if (fcStore.centers[0]) {
    selectedId.value = fcStore.centers[0].id
    fcStore.setCurrentFaultCenterId(fcStore.centers[0].id)
  }
  await loadDash()
}

onMounted(() => {
  init()
})
</script>

<style scoped>
.wb-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.wb-stat {
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid var(--border-default);
  background: var(--bg-subtle);
  min-width: 120px;
}

.wb-stat-k {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.wb-stat-v {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}

.wb-dist {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.wb-pill {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: var(--brand-50);
  border: 1px solid var(--border-default);
  color: var(--text-primary);
}

.wb-table-wrap {
  overflow: auto;
  border: 1px solid var(--border-default);
  border-radius: 12px;
}

.wb-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.wb-table th,
.wb-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-default);
}

.wb-table th {
  background: var(--bg-tertiary);
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
}

.wb-table .mono {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
}

.wb-empty {
  text-align: center;
  color: var(--text-muted);
  padding: 24px !important;
}
</style>
