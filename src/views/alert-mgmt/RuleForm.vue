<template>
  <div class="am-page">
    <div class="am-head">
      <h2 class="am-title">{{ isEdit ? '编辑规则' : '创建规则' }}</h2>
      <RouterLink :to="backToRulesList" class="am-btn linkish">返回列表</RouterLink>
    </div>

    <p v-if="pageError" class="am-err">{{ pageError }}</p>
    <div v-if="loadRule" class="am-loading"><span class="spinner" />加载规则…</div>

    <div v-else class="form-card-unified">
      <label class="field">
        <span>规则组 <span class="req">*</span></span>
        <select v-model="form.ruleGroupId" class="am-input" required>
          <option value="" disabled>请选择</option>
          <option v-for="g in ruleGroups" :key="g.id" :value="g.id">{{ g.name || g.id }}</option>
        </select>
      </label>
      <label class="field">
        <span>规则名称 <span class="req">*</span></span>
        <input v-model="form.ruleName" class="am-input" type="text" required placeholder="规则名称">
      </label>
      <label class="field">
        <span>描述</span>
        <textarea v-model="form.description" class="am-textarea" rows="2" placeholder="可选"></textarea>
      </label>

      <div class="field">
        <span>额外标签</span>
        <p class="am-hint">键与值组成一条标签，例如 <code>type</code> = <code>row</code>；可添加多组。</p>
        <div
          v-for="(row, i) in labelRows"
          :key="i"
          class="label-pair-row"
        >
          <input v-model="row.key" class="am-input label-pair-key" type="text" placeholder="键，如 type" aria-label="标签键">
          <span class="label-eq" aria-hidden="true">=</span>
          <input v-model="row.value" class="am-input label-pair-val" type="text" placeholder="值，如 row" aria-label="标签值">
          <button type="button" class="am-btn sm ghost" @click="removeLabelRow(i)">删除</button>
        </div>
        <button type="button" class="am-btn add-label-btn" @click="addLabelRow">+ 添加标签</button>
      </div>

      <label class="field">
        <span>数据源类型 <span class="req">*</span></span>
        <select v-model="form.datasourceType" class="am-input">
          <option v-for="t in datasourceTypes" :key="t" :value="t">{{ t }}</option>
        </select>
      </label>
      <label class="field">
        <span>关联数据源 <span class="req">*</span></span>
        <select v-model="selectedDatasourceId" class="am-input">
          <option value="">选择数据源</option>
          <option v-for="d in datasourceOptions" :key="d.id" :value="d.id">{{ d.name || d.id }}</option>
        </select>
      </label>

      <div class="field">
        <div class="promql-field-head">
          <span>{{ queryFieldLabel }} <span class="req">*</span></span>
          <button
            v-if="supportsPromqlPreview"
            type="button"
            class="am-btn sm"
            @click="openPromqlPreview"
          >
            数据预览
          </button>
        </div>
        <p v-if="promqlPreviewHint" class="am-err promql-preview-hint">{{ promqlPreviewHint }}</p>
        <textarea v-model="promql" class="am-textarea mono" rows="6" placeholder="例如 up == 0"></textarea>
      </div>
      <div class="field field-row">
        <label class="field-inline">
          <span>告警条件 <span class="req">*</span></span>
          <select v-model="form.severity" class="am-input sm">
            <option v-for="s in severityOptions" :key="s" :value="s">{{ s }}</option>
          </select>
        </label>
        <label class="field-inline grow">
          <span>持续</span>
          <span class="inline-num">
            <input v-model.number="forSeconds" class="am-input sm" type="number" min="0" step="1">
            <span class="am-muted">秒</span>
          </span>
        </label>
      </div>
      <label class="field">
        <span>告警详情</span>
        <textarea v-model="alertDetail" class="am-textarea" rows="2" placeholder="将写入告警 annotations.summary"></textarea>
      </label>
      <label class="field">
        <span>回调 PromQL</span>
        <textarea v-model="callbackPromql" class="am-textarea mono" rows="3" placeholder="可选，恢复或回调用查询"></textarea>
      </label>
      <label class="field">
        <span>执行频率</span>
        <span class="inline-num">
          <input v-model.number="form.evalInterval" class="am-input sm" type="number" min="1" step="1">
          <span class="am-muted">秒</span>
        </span>
      </label>

      <label class="field">
        <span>生效时间</span>
        <p class="am-hint">如果为空则表示全天候。</p>
        <div class="field-row time-row">
          <label class="field-inline">
            <span>开始</span>
            <input v-model="timeStart" class="am-input sm" type="time">
          </label>
          <label class="field-inline">
            <span>结束</span>
            <input v-model="timeEnd" class="am-input sm" type="time">
          </label>
        </div>
      </label>

      <label class="field">
        <span>事件推送给 WatchAlert 故障中心 <span class="req">*</span></span>
        <select v-model="form.faultCenterId" class="am-input" required>
          <option value="" disabled>请选择故障中心</option>
          <option v-for="c in fcStore.centers" :key="c.id" :value="c.id">{{ c.name || c.id }}</option>
        </select>
        <p class="am-hint">
          <RouterLink to="/fault-center" class="am-link">前往创建</RouterLink>
          故障中心
        </p>
      </label>

      <label class="field inline">
        <input v-model="form.enabled" type="checkbox"> 启用规则
      </label>

      <p v-if="submitError" class="am-err">{{ submitError }}</p>
      <div class="form-actions">
        <button type="button" class="am-btn primary" :disabled="submitting" @click="submit">保存</button>
      </div>
    </div>

    <PromqlPreviewModal
      :key="promqlPreviewKey"
      :open="promqlPreviewOpen"
      :datasource-ids="resolveDatasourceIds()"
      :promql="promql"
      :type-label="form.datasourceType"
      @close="promqlPreviewOpen = false"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { normalizeListPayload } from '@/utils/w8tPage'
import { ruleGroupList, ruleSearch, ruleCreate, ruleUpdate, datasourceList } from '@/api/w8tAlert'
import { useFaultCenterContextStore } from '@/store/faultCenterContext'
import {
  ALERT_DATASOURCE_TYPES,
  DEFAULT_ALERT_DATASOURCE_TYPE
} from '@/constants/alertDatasourceTypes'
import PromqlPreviewModal from '@/views/alert-mgmt/PromqlPreviewModal.vue'

const route = useRoute()
const router = useRouter()
const fcStore = useFaultCenterContextStore()

const datasourceTypes = ALERT_DATASOURCE_TYPES
const severityOptions = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'warning', 'critical']

const isEdit = computed(() => route.name === 'AlertMgmtRuleEdit')

const backToRulesList = computed(() => ({
  path: '/alert-mgmt/rules',
  ...(form.value.ruleGroupId ? { query: { groupId: form.value.ruleGroupId } } : {})
}))
const paramGroupId = computed(() => String(route.params.ruleGroupId || ''))
const paramRuleId = computed(() => String(route.params.ruleId || ''))

const pageError = ref('')
const submitError = ref('')
const submitting = ref(false)
const loadRule = ref(false)

const ruleGroups = ref([])
const datasourceOptions = ref([])
const selectedDatasourceId = ref('')
/** 编辑加载时的多数据源 ID，去掉手动输入框后仍要在未改选时原样提交 */
const preservedMultiDatasourceIds = ref([])

const form = ref({
  ruleId: '',
  ruleGroupId: '',
  faultCenterId: '',
  datasourceType: DEFAULT_ALERT_DATASOURCE_TYPE,
  ruleName: '',
  severity: 'P2',
  evalInterval: 5,
  repeatNoticeInterval: 300,
  description: '',
  enabled: true
})

const promql = ref('')
const forSeconds = ref(0)
const alertDetail = ref('')
const callbackPromql = ref('')
/** @type {import('vue').Ref<{ key: string, value: string }[]>} */
const labelRows = ref([])
const timeStart = ref('')
const timeEnd = ref('')

function addLabelRow() {
  labelRows.value.push({ key: '', value: '' })
}

function removeLabelRow(i) {
  labelRows.value.splice(i, 1)
}

/** 由「键 = 值」行生成 prometheus labels 对象，空键跳过，同名键以后者为准 */
function labelsFromRows(rows) {
  const out = {}
  for (const r of rows) {
    const k = r.key?.trim()
    if (!k) continue
    out[k] = r.value != null ? String(r.value).trim() : ''
  }
  return out
}

/** 接口未映射的 prometheusConfig 字段，保存时合并回去 */
const promCfgRest = ref({})

const PROMQL_DATASOURCE_TYPES = new Set(['Prometheus', 'VictoriaMetrics'])

const queryFieldLabel = computed(() =>
  PROMQL_DATASOURCE_TYPES.has(form.value.datasourceType) ? 'PromQL' : '查询语句'
)

const supportsPromqlPreview = computed(() => PROMQL_DATASOURCE_TYPES.has(form.value.datasourceType))

const promqlPreviewOpen = ref(false)
const promqlPreviewKey = ref(0)
const promqlPreviewHint = ref('')

function openPromqlPreview() {
  promqlPreviewHint.value = ''
  const ids = resolveDatasourceIds()
  if (!ids.length) {
    promqlPreviewHint.value = '请先选择关联数据源'
    return
  }
  if (!promql.value?.trim()) {
    promqlPreviewHint.value = '请先填写 PromQL'
    return
  }
  promqlPreviewKey.value += 1
  promqlPreviewOpen.value = true
}

function parseForToSeconds(forStr) {
  if (!forStr || typeof forStr !== 'string') return 0
  const s = forStr.trim().toLowerCase()
  const sec = s.match(/^(\d+)s$/)
  if (sec) return parseInt(sec[1], 10)
  const min = s.match(/^(\d+)m$/)
  if (min) return parseInt(min[1], 10) * 60
  const hr = s.match(/^(\d+)h$/)
  if (hr) return parseInt(hr[1], 10) * 3600
  return 0
}

function buildEffectiveTime() {
  const a = timeStart.value?.trim()
  const b = timeEnd.value?.trim()
  if (!a && !b) return undefined
  if (a && b && a === b) return undefined
  return { start: a || '00:00', end: b || '23:59' }
}

function buildPrometheusConfig() {
  const labels = labelsFromRows(labelRows.value)
  const cfg = { ...promCfgRest.value }
  const q = promql.value?.trim()
  if (q) cfg.promQL = q
  else delete cfg.promQL

  if (forSeconds.value > 0) cfg.for = `${forSeconds.value}s`
  else delete cfg.for

  if (alertDetail.value?.trim()) {
    cfg.annotations = { ...(cfg.annotations && typeof cfg.annotations === 'object' ? cfg.annotations : {}), summary: alertDetail.value.trim() }
  } else if (cfg.annotations && 'summary' in cfg.annotations) {
    const { summary: _s, ...rest } = cfg.annotations
    if (Object.keys(rest).length) cfg.annotations = rest
    else delete cfg.annotations
  }

  if (callbackPromql.value?.trim()) cfg.callbackPromQL = callbackPromql.value.trim()
  else delete cfg.callbackPromQL

  if (Object.keys(labels).length) {
    cfg.labels = { ...(cfg.labels && typeof cfg.labels === 'object' ? cfg.labels : {}), ...labels }
  } else if (cfg.labels && !Object.keys(cfg.labels).length) {
    delete cfg.labels
  }

  return cfg
}

function resolveDatasourceIds() {
  if (!selectedDatasourceId.value) return []
  const multi = preservedMultiDatasourceIds.value
  if (
    multi.length > 1 &&
    selectedDatasourceId.value === multi[0]
  ) {
    return [...multi]
  }
  return [selectedDatasourceId.value]
}

function ensureDatasourceOptionsForIds(ids) {
  const set = new Set(datasourceOptions.value.map((d) => d.id))
  for (const id of ids) {
    if (!set.has(id)) {
      datasourceOptions.value = [...datasourceOptions.value, { id, name: id }]
      set.add(id)
    }
  }
}

async function loadGroups() {
  try {
    const data = await ruleGroupList({ index: 1, size: 500 })
    const n = normalizeListPayload(data)
    ruleGroups.value = n.list
  } catch {
    ruleGroups.value = []
  }
}

async function loadDatasources() {
  datasourceOptions.value = []
  try {
    const data = await datasourceList({ datasourceType: form.value.datasourceType })
    const raw = Array.isArray(data) ? data : data?.list || data?.records || []
    datasourceOptions.value = raw
      .map((x) => ({
        id: String(x.id ?? x.datasourceId ?? x.ID ?? ''),
        name: x.name ?? x.title ?? x.id ?? ''
      }))
      .filter((x) => x.id)
  } catch {
    datasourceOptions.value = []
  }
}

watch(
  () => form.value.datasourceType,
  () => {
    preservedMultiDatasourceIds.value = []
    loadDatasources()
    if (!isEdit.value) {
      selectedDatasourceId.value = ''
    }
  }
)

function stripMappedPromCfg(cfg) {
  const o = { ...(cfg && typeof cfg === 'object' ? cfg : {}) }
  delete o.promQL
  delete o.expr
  delete o.for
  delete o.annotations
  delete o.callbackPromQL
  delete o.labels
  return o
}

async function loadExisting() {
  if (!isEdit.value) return
  loadRule.value = true
  pageError.value = ''
  try {
    const row = await ruleSearch({
      ruleGroupId: paramGroupId.value,
      ruleId: paramRuleId.value
    })
    if (!row || typeof row !== 'object') {
      pageError.value = '未找到规则'
      return
    }
    const cfg = row.prometheusConfig && typeof row.prometheusConfig === 'object' ? row.prometheusConfig : {}
    promql.value = cfg.promQL || cfg.expr || ''
    forSeconds.value = cfg.for ? parseForToSeconds(cfg.for) : 0
    alertDetail.value = cfg.annotations?.summary || ''
    callbackPromql.value = cfg.callbackPromQL || ''
    const lb = cfg.labels && typeof cfg.labels === 'object' && !Array.isArray(cfg.labels) ? cfg.labels : {}
    const entries = Object.entries(lb)
    labelRows.value = entries.length
      ? entries.map(([key, value]) => ({
          key: String(key),
          value: value == null ? '' : String(value)
        }))
      : []

    const et = row.effectiveTime
    if (et && typeof et === 'object') {
      timeStart.value = et.start ?? et.dailyStart ?? ''
      timeEnd.value = et.end ?? et.dailyEnd ?? ''
    } else {
      timeStart.value = ''
      timeEnd.value = ''
    }

    promCfgRest.value = stripMappedPromCfg(cfg)

    const ids = Array.isArray(row.datasourceId) ? row.datasourceId.map(String) : []

    form.value = {
      ruleId: row.ruleId || paramRuleId.value,
      ruleGroupId: row.ruleGroupId || paramGroupId.value,
      faultCenterId: row.faultCenterId || '',
      datasourceType: row.datasourceType || DEFAULT_ALERT_DATASOURCE_TYPE,
      ruleName: row.ruleName || '',
      severity: row.severity || 'P2',
      evalInterval: row.evalInterval ?? 5,
      repeatNoticeInterval: row.repeatNoticeInterval ?? 300,
      description: row.description || '',
      enabled: row.enabled !== false
    }

    await loadDatasources()
    preservedMultiDatasourceIds.value = ids.length > 1 ? [...ids] : []
    if (ids.length) {
      ensureDatasourceOptionsForIds(ids)
      selectedDatasourceId.value = ids[0]
    } else {
      selectedDatasourceId.value = ''
    }
  } catch (e) {
    pageError.value = e?.message || '加载规则失败'
  } finally {
    loadRule.value = false
  }
}

async function submit() {
  submitError.value = ''
  if (!form.value.ruleGroupId || !form.value.ruleName?.trim()) {
    submitError.value = '请填写规则组与规则名称'
    return
  }
  if (!form.value.faultCenterId) {
    submitError.value = '请选择故障中心'
    return
  }
  const datasourceId = resolveDatasourceIds()
  if (!datasourceId.length) {
    submitError.value = '请选择关联数据源'
    return
  }
  if (!promql.value?.trim()) {
    submitError.value = `请填写${queryFieldLabel.value}`
    return
  }

  let prometheusConfig
  try {
    prometheusConfig = buildPrometheusConfig()
  } catch (e) {
    submitError.value = e?.message || '配置解析失败'
    return
  }
  const eff = buildEffectiveTime()

  const body = {
    ruleGroupId: form.value.ruleGroupId,
    faultCenterId: form.value.faultCenterId,
    datasourceType: form.value.datasourceType,
    datasourceId,
    ruleName: form.value.ruleName.trim(),
    evalInterval: form.value.evalInterval,
    repeatNoticeInterval: form.value.repeatNoticeInterval,
    description: form.value.description || '',
    severity: form.value.severity || 'P2',
    enabled: form.value.enabled,
    prometheusConfig
  }
  if (eff !== undefined) body.effectiveTime = eff

  submitting.value = true
  try {
    if (isEdit.value) {
      body.ruleId = form.value.ruleId || paramRuleId.value
      await ruleUpdate(body)
    } else {
      await ruleCreate(body)
    }
    router.push({
      path: '/alert-mgmt/rules',
      ...(form.value.ruleGroupId ? { query: { groupId: form.value.ruleGroupId } } : {})
    })
  } catch (e) {
    submitError.value = e?.message || '保存失败'
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await fcStore.loadCenters()
  await loadGroups()
  if (!isEdit.value) {
    const q = route.query.groupId
    const gid = typeof q === 'string' ? q : Array.isArray(q) && q[0] ? String(q[0]) : ''
    if (gid && ruleGroups.value.some((g) => g.id === gid)) {
      form.value.ruleGroupId = gid
    }
    if (fcStore.currentFaultCenterId) {
      form.value.faultCenterId = fcStore.currentFaultCenterId
    }
  }
  await loadDatasources()
  await loadExisting()
})
</script>

<style scoped>
.am-page {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 12px 40px;
  box-sizing: border-box;
}
.am-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}
.am-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
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
  text-decoration: none;
  color: inherit;
}
.am-btn.primary {
  background: #1d4ed8;
  color: #fff;
  border-color: #1d4ed8;
}
.am-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.am-err {
  color: #b91c1c;
  font-size: 13px;
}
.am-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px;
  color: #555;
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
.form-card-unified {
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 28px 32px 32px;
  background: #fff;
}
.label-pair-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.label-pair-key {
  flex: 1 1 160px;
  min-width: 140px;
}
.label-pair-val {
  flex: 1 1 160px;
  min-width: 140px;
}
.label-eq {
  flex: 0 0 auto;
  font-weight: 600;
  font-size: 15px;
  color: var(--text-muted, #64748b);
  user-select: none;
}
.am-btn.sm {
  padding: 6px 10px;
  font-size: 12px;
}
.am-btn.ghost {
  background: transparent;
  border-color: var(--border-default);
  color: var(--text-secondary, #475569);
}
.am-btn.linkish {
  background: transparent;
  border: none;
  color: var(--brand-600, #2563eb);
  padding-left: 0;
}
.add-label-btn {
  width: 100%;
  box-sizing: border-box;
  margin-top: 6px;
  justify-content: center;
  border-style: dashed;
  background: var(--bg-subtle, #f8fafc);
  color: var(--text-secondary, #475569);
  font-size: 13px;
  padding: 10px 16px;
}
.add-label-btn:hover {
  background: var(--bg-muted, #f1f5f9);
  border-color: var(--text-muted, #94a3b8);
  color: var(--text-primary, #0f172a);
}
.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
  font-size: 14px;
  color: #333;
}
.field.inline {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
.field-row {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 16px;
}
.field-inline {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 120px;
}
.field-inline.grow {
  flex: 1;
  min-width: 160px;
}
.inline-num {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.time-row .field-inline {
  min-width: 140px;
}
.am-input,
.am-textarea {
  padding: 10px 12px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
}
.am-input.sm {
  max-width: 220px;
}
.am-textarea.mono {
  font-family: ui-monospace, monospace;
  font-size: 13px;
}
.am-hint {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-muted, #64748b);
  line-height: 1.45;
}
.am-muted {
  font-size: 13px;
  color: var(--text-muted, #64748b);
}
.am-link {
  color: var(--brand-600, #2563eb);
  margin-right: 4px;
}
.req {
  color: #b91c1c;
}
.form-actions {
  margin-top: 16px;
  padding-top: 8px;
}
.promql-field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.promql-preview-hint {
  margin: 0 0 4px;
  font-size: 13px;
}
</style>
