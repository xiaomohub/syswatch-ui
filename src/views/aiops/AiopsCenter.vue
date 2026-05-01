<template>
  <div class="aiops-center">
    <header class="hero">
      <div>
        <h1 class="hero-title">智能诊断</h1>
        <p class="hero-desc">
          告警根因分析、定期日志巡检与历史记录均通过后端 API 完成；调度器在后端拉取日志/指标接口并归因，前端只负责展示与触发。
        </p>
      </div>
      <div class="hero-tags">
        <span class="tag">POST /api/aiops/rca/analyze</span>
        <span class="tag">POST /api/aiops/inspections/run</span>
        <span class="tag">GET …/inspections/schedules</span>
      </div>
    </header>

    <nav class="tabs">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        class="tab"
        :class="{ active: activeTab === t.id }"
        @click="setTab(t.id)"
      >
        {{ t.label }}
      </button>
    </nav>

    <!-- 告警根因 -->
    <section v-show="activeTab === 'rca'" class="section">
      <div class="grid-2">
        <div class="panel">
          <h2 class="panel-h">告警上下文</h2>
          <label class="field">
            <span>告警 ID</span>
            <input v-model="rcaForm.alertId" type="text" placeholder="审计关联" />
          </label>
          <label class="field">
            <span>告警名称</span>
            <input v-model="rcaForm.alertName" type="text" placeholder="规则名" />
          </label>
          <label class="field">
            <span>摘要</span>
            <input v-model="rcaForm.summary" type="text" placeholder="summary" />
          </label>
          <label class="field">
            <span>描述</span>
            <textarea v-model="rcaForm.description" rows="4" placeholder="指标、栈、详情"></textarea>
          </label>
          <label class="field">
            <span>触发时间</span>
            <input v-model="rcaForm.startsAt" type="text" placeholder="ISO8601" />
          </label>
          <label class="field">
            <span>补充上下文</span>
            <textarea v-model="rcaForm.extraContext" rows="2" placeholder="变更、关联服务"></textarea>
          </label>
          <button
            type="button"
            class="btn-primary"
            :disabled="rcaLoading || !rcaCanSubmit"
            @click="runRca"
          >
            {{ rcaLoading ? '分析中…' : '调用根因分析 API' }}
          </button>
          <p v-if="rcaError" class="err">{{ rcaError }}</p>
        </div>
        <div class="panel">
          <h2 class="panel-h">分析结果</h2>
          <div v-if="!rcaResult && !rcaLoading && !rcaError" class="muted">
            提交后展示接口返回结构。可从「告警统计」快捷预填本表单。
          </div>
          <div v-if="rcaLoading" class="row-loading">
            <span class="spinner" />
            <span>请求 POST /api/aiops/rca/analyze …</span>
          </div>
          <template v-else-if="rcaResult">
            <p v-if="rcaResult.requestId" class="meta">requestId：<code>{{ rcaResult.requestId }}</code></p>
            <div v-if="rcaResult.summary" class="block">
              <h3>结论摘要</h3>
              <p class="text">{{ rcaResult.summary }}</p>
            </div>
            <div v-if="rcaResult.rootCauses?.length" class="block">
              <h3>可能根因</h3>
              <ul class="causes">
                <li v-for="(c, i) in rcaResult.rootCauses" :key="i">
                  <div class="cause-top">
                    <strong>{{ c.title || '根因 ' + (i + 1) }}</strong>
                    <span v-if="c.likelihood != null" class="pill">{{ c.likelihood }}</span>
                  </div>
                  <p v-if="c.evidence" class="sub">依据：{{ c.evidence }}</p>
                  <p v-if="c.reasoning" class="sub">{{ c.reasoning }}</p>
                </li>
              </ul>
            </div>
            <div v-if="rcaResult.recommendations?.length" class="block">
              <h3>处置建议</h3>
              <ol class="recs">
                <li v-for="(r, i) in rcaResult.recommendations" :key="i">{{ r }}</li>
              </ol>
            </div>
            <div v-if="rcaResult.analysis && !rcaResult.summary" class="block">
              <h3>完整分析</h3>
              <pre class="pre">{{ rcaResult.analysis }}</pre>
            </div>
            <p v-if="rcaResult.disclaimer" class="disc">{{ rcaResult.disclaimer }}</p>
          </template>
        </div>
      </div>
    </section>

    <!-- 日志巡检 -->
    <section v-show="activeTab === 'inspection'" class="section">
      <div class="panel">
        <div class="panel-head">
          <h2 class="panel-h">定时巡检任务</h2>
          <button type="button" class="btn-ghost" :disabled="schedLoading" @click="loadSchedules">
            刷新 GET /inspections/schedules
          </button>
        </div>
        <p v-if="schedError" class="err">{{ schedError }}</p>
        <div v-if="schedLoading" class="muted">加载中…</div>
        <table v-else class="table">
          <thead>
            <tr>
              <th>名称</th>
              <th>周期</th>
              <th>数据源</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in schedules" :key="s.id ?? s.scheduleId">
              <td>{{ s.name }}</td>
              <td class="mono">{{ s.cronExpr || s.cron_expr || '—' }}</td>
              <td>{{ s.sourceType || s.source_type || 'log' }}</td>
              <td>{{ s.enabled === false || s.enabled === 0 ? '停用' : '启用' }}</td>
            </tr>
            <tr v-if="!schedules.length">
              <td colspan="4" class="muted">暂无数据（后端未实现或返回空列表）</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="panel">
        <h2 class="panel-h">立即检测（拉取日志 API 并归因）</h2>
        <p class="muted small">
          后端应调用现有日志查询/存储过程，再结合模型输出 summary / attribution；此处仅提交参数。
        </p>
        <div class="inline-fields">
          <label class="field inline">
            <span>关联计划</span>
            <select v-model="runForm.scheduleId" class="select">
              <option value="">（不指定，自由参数）</option>
              <option v-for="s in schedules" :key="s.id" :value="String(s.id)">{{ s.name }}</option>
            </select>
          </label>
          <label class="field inline">
            <span>timeFrom</span>
            <input v-model="runForm.timeFrom" type="text" placeholder="ISO 或 now-1h" />
          </label>
          <label class="field inline">
            <span>timeTo</span>
            <input v-model="runForm.timeTo" type="text" placeholder="默认 now" />
          </label>
        </div>
        <label class="field">
          <span>queryHint（索引/服务/关键字）</span>
          <input v-model="runForm.queryHint" type="text" placeholder="交给后端解析" />
        </label>
        <button
          type="button"
          class="btn-primary"
          :disabled="runLoading"
          @click="submitInspectionRun"
        >
          {{ runLoading ? '提交中…' : 'POST /api/aiops/inspections/run' }}
        </button>
        <p v-if="runError" class="err">{{ runError }}</p>
        <p v-if="runSuccess" class="ok">{{ runSuccess }}</p>
      </div>

      <div class="panel">
        <div class="panel-head">
          <h2 class="panel-h">巡检运行记录</h2>
          <button type="button" class="btn-ghost" :disabled="runsLoading" @click="loadRuns">刷新</button>
        </div>
        <p v-if="runsError" class="err">{{ runsError }}</p>
        <table class="table">
          <thead>
            <tr>
              <th>运行 ID</th>
              <th>触发</th>
              <th>状态</th>
              <th>开始时间</th>
              <th>摘要</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in runs" :key="r.runId || r.id">
              <td class="mono">{{ r.runId || r.id }}</td>
              <td>{{ r.triggerType || r.trigger_type || '—' }}</td>
              <td>{{ r.status }}</td>
              <td class="mono">{{ r.startedAt || r.started_at || r.createdAt || r.created_at || '—' }}</td>
              <td>{{ r.summary || r.responseSummary || r.response_summary || '—' }}</td>
              <td>
                <button type="button" class="link" @click="openRunDetail(r)">详情</button>
              </td>
            </tr>
            <tr v-if="!runsLoading && !runs.length">
              <td colspan="6" class="muted">暂无记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 根因历史 -->
    <section v-show="activeTab === 'history'" class="section">
      <div class="panel">
        <div class="panel-head">
          <h2 class="panel-h">根因分析历史</h2>
          <button type="button" class="btn-ghost" :disabled="histLoading" @click="loadRcaHistory">
            GET /api/aiops/rca/history
          </button>
        </div>
        <p v-if="histError" class="err">{{ histError }}</p>
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>告警</th>
              <th>摘要</th>
              <th>时间</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="h in rcaHistory" :key="h.id ?? h.requestId">
              <td class="mono">{{ h.id ?? h.requestId }}</td>
              <td>{{ h.alertName || h.alert_name || '—' }}</td>
              <td>{{ h.responseSummary || h.response_summary || h.summary || '—' }}</td>
              <td class="mono">{{ h.createdAt || h.created_at || '—' }}</td>
              <td>
                <button type="button" class="link" @click="openHistDetail(h)">查看</button>
              </td>
            </tr>
            <tr v-if="!histLoading && !rcaHistory.length">
              <td colspan="5" class="muted">暂无历史（后端实现后展示）</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="detailOverlay" class="overlay" @click.self="detailOverlay = null">
        <div class="drawer">
          <header class="drawer-h">
            <h3>运行详情</h3>
            <button type="button" class="close" @click="detailOverlay = null">×</button>
          </header>
          <pre class="drawer-pre">{{ detailJson }}</pre>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import {
  analyzeRca,
  fetchRcaHistory,
  fetchRcaHistoryDetail,
  fetchInspectionSchedules,
  triggerInspectionRun,
  fetchInspectionRuns,
  fetchInspectionRunDetail,
  unwrapItems,
  normalizeRcaResult
} from '@/api/aiops'

const PREFILL_KEY = 'aiops_rca_prefill'

const tabs = [
  { id: 'rca', label: '告警根因' },
  { id: 'inspection', label: '日志巡检' },
  { id: 'history', label: '分析历史' }
]

const activeTab = ref('rca')

const rcaForm = ref({
  alertId: '',
  alertName: '',
  summary: '',
  description: '',
  startsAt: '',
  extraContext: ''
})
const rcaLoading = ref(false)
const rcaError = ref('')
const rcaResult = ref(null)

const rcaCanSubmit = computed(() => {
  const f = rcaForm.value
  return (
    (f.summary && f.summary.trim()) ||
    (f.description && f.description.trim()) ||
    (f.alertName && f.alertName.trim()) ||
    (f.alertId && f.alertId.trim()) ||
    (f.extraContext && f.extraContext.trim())
  )
})

const schedules = ref([])
const schedLoading = ref(false)
const schedError = ref('')

const runForm = ref({
  scheduleId: '',
  timeFrom: '',
  timeTo: '',
  queryHint: ''
})
const runLoading = ref(false)
const runError = ref('')
const runSuccess = ref('')

const runs = ref([])
const runsLoading = ref(false)
const runsError = ref('')

const rcaHistory = ref([])
const histLoading = ref(false)
const histError = ref('')

const detailOverlay = ref(null)
const detailJson = ref('')

function setTab(id) {
  activeTab.value = id
}

function buildExtraContextPayload(raw) {
  const t = typeof raw === 'string' ? raw.trim() : ''
  if (!t) return undefined
  try {
    const o = JSON.parse(t)
    if (o && typeof o === 'object' && !Array.isArray(o)) return o
  } catch {
    /* 非 JSON 时作为纯文本补充 */
  }
  return { notes: t }
}

async function runRca() {
  rcaError.value = ''
  rcaResult.value = null
  rcaLoading.value = true
  try {
    const res = await analyzeRca({
      alertId: rcaForm.value.alertId || undefined,
      alertName: rcaForm.value.alertName || undefined,
      summary: rcaForm.value.summary || undefined,
      description: rcaForm.value.description || undefined,
      startsAt: rcaForm.value.startsAt || undefined,
      extraContext: buildExtraContextPayload(rcaForm.value.extraContext)
    })
    const n = normalizeRcaResult(res.data)
    if (!n || (!n.summary && !n.analysis && !n.rootCauses?.length)) {
      rcaError.value = '返回体为空或字段未识别，请对照 API 文档'
    } else {
      rcaResult.value = n
    }
  } catch (e) {
    rcaError.value = e.response?.data?.message || e.response?.data?.error || e.message || '请求失败'
  } finally {
    rcaLoading.value = false
  }
}

async function loadSchedules() {
  schedError.value = ''
  schedLoading.value = true
  try {
    const res = await fetchInspectionSchedules()
    schedules.value = unwrapItems(res.data)
  } catch (e) {
    schedules.value = []
    schedError.value =
      e.response?.status === 404
        ? '接口未实现（404）'
        : e.response?.data?.message || e.message || '加载失败'
  } finally {
    schedLoading.value = false
  }
}

async function loadRuns() {
  runsError.value = ''
  runsLoading.value = true
  try {
    const res = await fetchInspectionRuns({ pageNum: 1, pageSize: 50 })
    runs.value = unwrapItems(res.data)
  } catch (e) {
    runs.value = []
    runsError.value =
      e.response?.status === 404
        ? '接口未实现（404）'
        : e.response?.data?.message || e.message || '加载失败'
  } finally {
    runsLoading.value = false
  }
}

async function submitInspectionRun() {
  runError.value = ''
  runSuccess.value = ''
  runLoading.value = true
  try {
    const payload = {
      timeFrom: runForm.value.timeFrom || undefined,
      timeTo: runForm.value.timeTo || undefined,
      queryHint: runForm.value.queryHint || undefined
    }
    if (runForm.value.scheduleId) {
      payload.scheduleId = runForm.value.scheduleId
    }
    const res = await triggerInspectionRun(payload)
    const d = res.data ?? {}
    runSuccess.value =
      d.runId || d.id
        ? `任务已创建：${d.runId ?? d.id}`
        : '已提交，请查看运行记录'
    await loadRuns()
  } catch (e) {
    runError.value = e.response?.data?.message || e.response?.data?.error || e.message || '提交失败'
  } finally {
    runLoading.value = false
  }
}

async function loadRcaHistory() {
  histError.value = ''
  histLoading.value = true
  try {
    const res = await fetchRcaHistory({ pageNum: 1, pageSize: 50 })
    rcaHistory.value = unwrapItems(res.data)
  } catch (e) {
    rcaHistory.value = []
    histError.value =
      e.response?.status === 404
        ? '接口未实现（404）'
        : e.response?.data?.message || e.message || '加载失败'
  } finally {
    histLoading.value = false
  }
}

async function openRunDetail(row) {
  const id = row.runId || row.id
  if (id == null) return
  try {
    const res = await fetchInspectionRunDetail(id)
    detailJson.value = JSON.stringify(res.data, null, 2)
    detailOverlay.value = 'run'
  } catch (e) {
    detailJson.value = e.response?.data?.message || e.message || String(e)
    detailOverlay.value = 'run'
  }
}

async function openHistDetail(row) {
  const id = row.id ?? row.requestId
  if (id == null) return
  try {
    const res = await fetchRcaHistoryDetail(id)
    detailJson.value = JSON.stringify(res.data, null, 2)
    detailOverlay.value = 'hist'
  } catch (e) {
    detailJson.value = e.response?.data?.message || e.message || String(e)
    detailOverlay.value = 'hist'
  }
}

watch(activeTab, (t) => {
  if (t === 'inspection' && !schedules.value.length && !schedLoading.value) loadSchedules()
  if (t === 'inspection' && !runs.value.length && !runsLoading.value) loadRuns()
  if (t === 'history' && !rcaHistory.value.length && !histLoading.value) loadRcaHistory()
})

onMounted(() => {
  const raw = sessionStorage.getItem(PREFILL_KEY)
  if (!raw) return
  try {
    const p = JSON.parse(raw)
    if (p.alertId != null) rcaForm.value.alertId = String(p.alertId)
    if (p.alertName) rcaForm.value.alertName = String(p.alertName)
    if (p.summary) rcaForm.value.summary = String(p.summary)
    if (p.description) rcaForm.value.description = String(p.description)
    if (p.startsAt) rcaForm.value.startsAt = String(p.startsAt)
    activeTab.value = 'rca'
  } catch {
    /* ignore */
  }
  sessionStorage.removeItem(PREFILL_KEY)
})
</script>

<style scoped>
.aiops-center {
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.hero {
  padding: 20px 24px;
  border-radius: 12px;
  background: var(--brand-50);
  border: 1px solid var(--border-default);
}
.hero-title {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
}
.hero-desc {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.65;
  max-width: 900px;
}
.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}
.tag {
  font-size: 11px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--bg-surface);
  color: var(--brand-700);
  border: 1px solid var(--border-default);
}
.tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.tab {
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid var(--border-default);
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
}
.tab.active {
  border-color: var(--brand-600);
  color: var(--brand-700);
  background: var(--brand-50);
}
.section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1.05fr;
  gap: 20px;
  align-items: start;
}
@media (max-width: 960px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
.panel {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 22px;
  box-shadow: var(--shadow-sm);
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.panel-h {
  margin: 0 0 16px;
  font-size: 17px;
  font-weight: 600;
}
.panel-head .panel-h {
  margin: 0;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
  font-size: 12px;
  color: var(--text-muted);
}
.field.inline {
  flex: 1;
  min-width: 140px;
}
.inline-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
}
.field input,
.field textarea,
.select {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
}
.field textarea {
  resize: vertical;
}
.btn-primary {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  background: var(--brand-600);
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-ghost {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
}
.btn-ghost:disabled {
  opacity: 0.5;
}
.err {
  color: var(--accent-red);
  font-size: 13px;
  margin-top: 10px;
}
.ok {
  color: var(--accent-green);
  font-size: 13px;
  margin-top: 10px;
  word-break: break-all;
}
.muted {
  color: var(--text-muted);
  font-size: 14px;
}
.muted.small {
  font-size: 13px;
  margin-bottom: 12px;
}
.row-loading {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-secondary);
}
.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent-cyan);
  border-radius: 50%;
  animation: spin 0.85s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.meta {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 12px;
}
.meta code {
  color: var(--accent-cyan);
}
.block {
  margin-bottom: 16px;
}
.block h3 {
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--accent-cyan);
}
.text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary);
}
.causes {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.causes li {
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
}
.cause-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.pill {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(139, 92, 246, 0.2);
  color: var(--brand-700);
}
.sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--text-muted);
}
.recs {
  margin: 0;
  padding-left: 18px;
  color: var(--text-secondary);
  line-height: 1.65;
}
.pre {
  white-space: pre-wrap;
  font-size: 12px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  color: var(--text-secondary);
}
.disc {
  font-size: 12px;
  color: var(--text-muted);
  border-top: 1px solid var(--border-color);
  padding-top: 12px;
  margin-top: 12px;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.table th,
.table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}
.table th {
  color: var(--text-muted);
  font-weight: 500;
}
.mono {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
}
.link {
  background: none;
  border: none;
  color: var(--accent-cyan);
  cursor: pointer;
  font-size: 13px;
  padding: 0;
}
.link:hover {
  text-decoration: underline;
}
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.drawer {
  width: min(720px, 100%);
  max-height: 85vh;
  overflow: auto;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 0;
}
.drawer-h {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}
.drawer-h h3 {
  margin: 0;
  font-size: 16px;
}
.close {
  border: none;
  background: none;
  color: var(--text-muted);
  font-size: 22px;
  cursor: pointer;
  line-height: 1;
}
.drawer-pre {
  margin: 0;
  padding: 16px 20px;
  font-size: 12px;
  line-height: 1.5;
  overflow: auto;
  color: var(--text-secondary);
}
</style>
