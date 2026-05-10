<template>
  <Teleport to="body">
    <div v-if="open" class="ppm-overlay" role="presentation" @click.self="emitClose">
      <div class="ppm-modal" role="dialog" aria-modal="true" aria-labelledby="ppm-title" @click.stop>
        <div class="ppm-hd">
          <h3 id="ppm-title">数据预览 · {{ typeLabel || 'Prometheus' }}</h3>
          <button type="button" class="ppm-close" aria-label="关闭" @click="emitClose">×</button>
        </div>

        <div class="ppm-toolbar">
          <label class="ppm-range">
            <span class="ppm-label">时间范围</span>
            <select v-model="rangePreset" class="ppm-select" @change="onPresetChange">
              <option value="5m">最近 5 分钟</option>
              <option value="15m">最近 15 分钟</option>
              <option value="1h">最近 1 小时</option>
            </select>
          </label>
          <label class="ppm-step">
            <span class="ppm-label">step（秒）</span>
            <input v-model.number="stepSeconds" class="ppm-input-num" type="number" min="1" max="3600" step="1">
          </label>
          <button type="button" class="ppm-btn" :disabled="previewLoading" @click="runQueries">刷新</button>
        </div>

        <p v-if="gateError" class="ppm-err">{{ gateError }}</p>

        <div class="ppm-bd">
          <section class="ppm-section">
            <h4 class="ppm-sh">即时查询</h4>
            <div v-if="instantLoading" class="ppm-muted">加载中…</div>
            <p v-else-if="instantError" class="ppm-err">{{ instantError }}</p>
            <p v-else-if="!instantRows.length" class="ppm-muted">当前查询条件下没有即时结果。</p>
            <div v-else class="ppm-table-wrap">
              <table class="ppm-table">
                <thead>
                  <tr>
                    <th>指标标签</th>
                    <th class="nw">值</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, i) in instantRows" :key="i">
                    <td class="mono sm">{{ row.metricText }}</td>
                    <td class="nw mono sm">{{ row.valueText }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="ppm-section">
            <h4 class="ppm-sh">趋势（范围查询）</h4>
            <div v-if="rangeLoading" class="ppm-muted">加载中…</div>
            <p v-else-if="rangeError" class="ppm-err">{{ rangeError }}</p>
            <p v-else-if="!chartSeries.length" class="ppm-muted">当前查询条件下没有可用于作图的序列。</p>
            <div v-show="chartSeries.length && !rangeLoading" ref="chartEl" class="ppm-chart" />
          </section>
        </div>

        <div class="ppm-ft">
          <button type="button" class="ppm-btn primary" @click="emitClose">关闭</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { promQuery, promQueryRange } from '@/api/datasource'

echarts.use([
  LineChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  DataZoomComponent,
  CanvasRenderer
])

const props = defineProps({
  open: { type: Boolean, default: false },
  /** @type {import('vue').PropType<string[]>} */
  datasourceIds: { type: Array, default: () => [] },
  promql: { type: String, default: '' },
  typeLabel: { type: String, default: '' }
})

const emit = defineEmits(['close'])

const rangePreset = ref('5m')
const stepSeconds = ref(10)
const gateError = ref('')
const instantLoading = ref(false)
const rangeLoading = ref(false)
const previewLoading = computed(() => instantLoading.value || rangeLoading.value)
const instantError = ref('')
const rangeError = ref('')
/** @type {import('vue').Ref<{ metricText: string, valueText: string }[]>} */
const instantRows = ref([])
/** @type {import('vue').Ref<{ name: string, type: 'line', data: [number, number][] }[]>} */
const chartSeries = ref([])

const chartEl = ref(null)
/** @type {import('echarts/core').EChartsType | null} */
let chart = null
/** @type {ResizeObserver | null} */
let ro = null

function emitClose() {
  emit('close')
}

/** @param {unknown} raw */
function normalizeBatches(raw) {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw.filter((x) => x != null)
  return [raw]
}

/** @param {unknown} item */
function extractInstantResultArray(item) {
  if (!item || typeof item !== 'object') return []
  const o = /** @type {Record<string, unknown>} */ (item)
  const data = o.data
  if (data && typeof data === 'object' && 'result' in data) {
    const r = /** @type {{ result?: unknown }} */ (data).result
    return Array.isArray(r) ? r : []
  }
  if ('result' in o && Array.isArray(o.result)) {
    return o.result
  }
  return []
}

/** @param {unknown} metric */
function metricToText(metric) {
  if (!metric || typeof metric !== 'object') return '{}'
  const entries = Object.entries(/** @type {Record<string, unknown>} */ (metric))
  const sorted = [...entries].sort(([a], [b]) => a.localeCompare(b))
  return sorted.map(([k, v]) => `${k}=${v}`).join(', ') || '{}'
}

/** @param {unknown} raw */
function parseInstantRows(raw) {
  const batches = normalizeBatches(raw)
  /** @type {{ metricText: string, valueText: string }[]} */
  const out = []
  for (const batch of batches) {
    const results = extractInstantResultArray(batch)
    for (const row of results) {
      if (!row || typeof row !== 'object') continue
      const r = /** @type {Record<string, unknown>} */ (row)
      const metric = r.metric
      let valueText = '—'
      if (Array.isArray(r.value) && r.value.length >= 2) {
        valueText = String(r.value[1])
      } else if (Array.isArray(r.values) && r.values.length) {
        const last = r.values[r.values.length - 1]
        if (Array.isArray(last) && last.length >= 2) valueText = String(last[1])
      } else if (r.value != null && typeof r.value !== 'object') {
        valueText = String(r.value)
      }
      out.push({ metricText: metricToText(metric), valueText })
    }
  }
  return out
}

/** @param {unknown} item */
function extractRangeResultArray(item) {
  return extractInstantResultArray(item)
}

/** @param {unknown} raw */
function parseRangeSeries(raw) {
  const batches = normalizeBatches(raw)
  /** @type {{ name: string, type: 'line', data: [number, number][] }[]} */
  const series = []
  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi]
    const results = extractRangeResultArray(batch)
    for (const row of results) {
      if (!row || typeof row !== 'object') continue
      const r = /** @type {Record<string, unknown>} */ (row)
      const metric = r.metric
      const baseName = metricToText(metric)
      const name = batches.length > 1 ? `[ds${bi + 1}] ${baseName}` : baseName
      const values = Array.isArray(r.values) ? r.values : []
      const pts = []
      for (const pair of values) {
        if (!Array.isArray(pair) || pair.length < 2) continue
        const t = Number(pair[0])
        const v = parseFloat(String(pair[1]))
        if (!Number.isFinite(t) || !Number.isFinite(v)) continue
        pts.push(/** @type {[number, number]} */ ([t * 1000, v]))
      }
      if (pts.length) {
        series.push({
          name: name.length > 120 ? `${name.slice(0, 117)}…` : name,
          type: 'line',
          data: pts,
          showSymbol: pts.length < 48,
          smooth: true
        })
      }
    }
  }
  return series
}

function presetSeconds() {
  switch (rangePreset.value) {
    case '15m':
      return 900
    case '1h':
      return 3600
    default:
      return 300
  }
}

function rangeParams() {
  const end = Math.floor(Date.now() / 1000)
  const start = end - presetSeconds()
  return { startTime: start, endTime: end, step: stepSeconds.value || 10 }
}

async function runQueries() {
  gateError.value = ''
  instantError.value = ''
  rangeError.value = ''
  const ids = (props.datasourceIds || []).map(String).filter(Boolean)
  const q = String(props.promql || '').trim()
  if (!ids.length) {
    gateError.value = '未选择数据源，无法预览。'
    return
  }
  if (!q) {
    gateError.value = 'PromQL 为空，无法预览。'
    return
  }
  const datasourceIds = ids.join(',')

  instantLoading.value = true
  rangeLoading.value = true
  instantRows.value = []
  chartSeries.value = []

  const instantP = promQuery({ datasourceIds, query: q }).catch((e) => {
    instantError.value = e?.message || '即时查询失败'
    return null
  })
  const { startTime, endTime, step } = rangeParams()
  const rangeP = promQueryRange({
    datasourceIds,
    query: q,
    startTime,
    endTime,
    step
  }).catch((e) => {
    rangeError.value = e?.message || '范围查询失败'
    return null
  })

  const [instantData, rangeData] = await Promise.all([instantP, rangeP])
  instantLoading.value = false
  rangeLoading.value = false

  if (instantData != null && !instantError.value) {
    instantRows.value = parseInstantRows(instantData)
  }
  if (rangeData != null && !rangeError.value) {
    chartSeries.value = parseRangeSeries(rangeData)
  }

  await nextTick()
  renderChart()
}

function onPresetChange() {
  if (props.open) runQueries()
}

function renderChart() {
  if (!chartEl.value) return
  if (!chartSeries.value.length) {
    chart?.clear()
    return
  }
  if (!chart) {
    chart = echarts.init(chartEl.value)
  }
  chart.setOption(
    {
      tooltip: { trigger: 'axis' },
      legend: {
        type: 'scroll',
        top: 0,
        left: 'center',
        textStyle: { fontSize: 11 }
      },
      grid: { left: 56, right: 24, top: chartSeries.value.length > 1 ? 52 : 28, bottom: 72 },
      xAxis: { type: 'time' },
      yAxis: { type: 'value', scale: true },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0 },
        { type: 'slider', xAxisIndex: 0, height: 22, bottom: 8 }
      ],
      series: chartSeries.value
    },
    true
  )
  ro?.disconnect()
  if (typeof ResizeObserver !== 'undefined' && chartEl.value) {
    ro = new ResizeObserver(() => chart?.resize())
    ro.observe(chartEl.value)
  }
}

function disposeChart() {
  ro?.disconnect()
  ro = null
  chart?.dispose()
  chart = null
}

watch(
  () => props.open,
  async (on) => {
    if (!on) {
      disposeChart()
      return
    }
    gateError.value = ''
    await runQueries()
  }
)

onUnmounted(() => {
  disposeChart()
})
</script>

<style scoped>
.ppm-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
}
.ppm-modal {
  width: min(920px, 100%);
  max-height: min(90vh, 800px);
  display: flex;
  flex-direction: column;
  background: var(--bg-card, #fff);
  border-radius: 12px;
  border: 1px solid var(--border-default, #e5e7eb);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.12);
}
.ppm-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border-default, #e5e7eb);
}
.ppm-hd h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
}
.ppm-close {
  border: none;
  background: none;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  color: var(--text-muted, #64748b);
  padding: 4px 8px;
}
.ppm-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 14px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--border-default, #e5e7eb);
}
.ppm-range,
.ppm-step {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary, #475569);
}
.ppm-label {
  font-weight: 500;
}
.ppm-select {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-default, #e5e7eb);
  font-size: 13px;
  min-width: 160px;
  background: var(--bg-card, #fff);
  color: inherit;
}
.ppm-input-num {
  width: 88px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-default, #e5e7eb);
  font-size: 13px;
}
.ppm-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-default, #e5e7eb);
  background: var(--bg-card, #fff);
  font-size: 13px;
  cursor: pointer;
  color: inherit;
}
.ppm-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.ppm-btn.primary {
  background: #1d4ed8;
  border-color: #1d4ed8;
  color: #fff;
}
.ppm-bd {
  padding: 14px 18px;
  overflow: auto;
  flex: 1;
  min-height: 0;
}
.ppm-section {
  margin-bottom: 20px;
}
.ppm-section:last-child {
  margin-bottom: 0;
}
.ppm-sh {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #334155);
}
.ppm-muted {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted, #64748b);
}
.ppm-err {
  margin: 0 18px;
  padding: 0 0 8px;
  font-size: 13px;
  color: #b91c1c;
}
.ppm-table-wrap {
  overflow: auto;
  max-height: 220px;
  border: 1px solid var(--border-default, #e5e7eb);
  border-radius: 8px;
}
.ppm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.ppm-table th,
.ppm-table td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid var(--border-default, #e5e7eb);
  vertical-align: top;
}
.ppm-table th {
  background: #f8fafc;
  font-weight: 600;
  position: sticky;
  top: 0;
}
.ppm-table tr:last-child td {
  border-bottom: none;
}
.nw {
  white-space: nowrap;
}
.mono {
  font-family: ui-monospace, 'Cascadia Code', monospace;
}
.sm {
  font-size: 12px;
}
.ppm-chart {
  width: 100%;
  height: 320px;
}
.ppm-ft {
  padding: 12px 18px 16px;
  border-top: 1px solid var(--border-default, #e5e7eb);
  display: flex;
  justify-content: flex-end;
}
</style>
