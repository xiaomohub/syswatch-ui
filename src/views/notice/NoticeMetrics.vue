<template>
  <div class="am-page">
    <div class="am-head">
      <h2 class="am-title">通知统计</h2>
      <button type="button" class="am-btn" :disabled="loading" @click="load">刷新</button>
    </div>
    <p class="muted">近 7 日按等级（P0/P1/P2）发送条数；登录即可查看（与 Go 一致无 Path 权限）。</p>
    <p v-if="pageError" class="am-err">{{ pageError }}</p>
    <div v-show="loading" class="am-loading"><span class="spinner" />加载中…</div>
    <div v-show="!loading && !pageError" ref="chartEl" class="chart" />
  </div>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { noticeRecordMetric } from '@/api/notice'

echarts.use([LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const loading = ref(false)
const pageError = ref('')
const data = ref(null)
const chartEl = ref(null)
let chart = null
/** @type {ResizeObserver | null} */
let ro = null

function render() {
  if (!chartEl.value || !data.value) return
  const d = data.value
  if (!chart) {
    chart = echarts.init(chartEl.value)
  }
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['P0', 'P1', 'P2'] },
    grid: { left: 48, right: 24, top: 40, bottom: 32 },
    xAxis: { type: 'category', data: d.date || [] },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      { name: 'P0', type: 'line', data: d.series?.p0 || [], smooth: true },
      { name: 'P1', type: 'line', data: d.series?.p1 || [], smooth: true },
      { name: 'P2', type: 'line', data: d.series?.p2 || [], smooth: true }
    ]
  })
}

async function load() {
  pageError.value = ''
  loading.value = true
  try {
    data.value = await noticeRecordMetric()
    render()
  } catch (e) {
    data.value = null
    pageError.value = e instanceof Error ? e.message : '加载失败'
    chart?.clear()
  } finally {
    loading.value = false
    await nextTick()
    render()
    if (chartEl.value && typeof ResizeObserver !== 'undefined') {
      ro?.disconnect()
      ro = new ResizeObserver(() => chart?.resize())
      ro.observe(chartEl.value)
    }
  }
}

onMounted(async () => {
  await load()
  window.addEventListener('resize', onWinResize)
})

function onWinResize() {
  chart?.resize()
}

onUnmounted(() => {
  window.removeEventListener('resize', onWinResize)
  ro?.disconnect()
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.am-page {
  padding: 8px 0 32px;
}
.am-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.am-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
.am-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-default);
  background: #fff;
  font-size: 13px;
  cursor: pointer;
}
.am-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.muted {
  color: #666;
  font-size: 13px;
  margin: 0 0 12px;
}
.am-err {
  color: #b91c1c;
  font-size: 13px;
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
.chart {
  width: 100%;
  height: 380px;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  background: #fff;
}
</style>
