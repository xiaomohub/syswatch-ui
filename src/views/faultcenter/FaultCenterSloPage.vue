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
        <h2>SLO 看板</h2>
      </div>
      <div class="fc-head-end">
        <button type="button" class="btn btn-secondary" :disabled="loading" @click="load">刷新</button>
        <button type="button" class="btn btn-secondary" @click="goList">返回列表</button>
      </div>
    </div>

    <p class="muted small">
      <code>GET /api/w8t/faultCenter/slo?id=</code> 近 7 天 MTTA / MTTR（秒）；下图为换算为<strong>分钟</strong>后的相对折线，与 Go 窗口一致（旧 → 新）。
    </p>

    <p v-if="error" class="fc-page-error">{{ error }}</p>

    <div v-if="loading" class="fc-loading"><div class="spinner"></div>加载中…</div>
    <div v-else class="fc-table-card" style="padding: 20px">
      <p style="margin: 0 0 8px; font-size: 13px; color: var(--text-secondary)">
        故障中心 <code>{{ centerId }}</code>
      </p>
      <div class="slo-charts">
        <div class="slo-block">
          <h4>MTTA（分钟）</h4>
          <div class="slo-labels">
            <span v-for="(lb, i) in sloLabels" :key="'mtta-' + i">{{ lb }}</span>
          </div>
          <div class="slo-svg-wrap" v-html="sloSvgMtta"></div>
        </div>
        <div class="slo-block">
          <h4>MTTR（分钟）</h4>
          <div class="slo-labels">
            <span v-for="(lb, i) in sloLabels" :key="'mttr-' + i">{{ lb }}</span>
          </div>
          <div class="slo-svg-wrap" v-html="sloSvgMttr"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { unwrapW8t, faultCenterSlo } from '@/api/faultcenter'
import './faultCenterCommon.css'

const route = useRoute()
const router = useRouter()

const centerId = computed(() => {
  const raw = route.params.id
  if (raw == null) return ''
  try {
    return decodeURIComponent(String(raw))
  } catch {
    return String(raw)
  }
})

const loading = ref(false)
const error = ref('')
/** @type {import('vue').Ref<{ mtta?: number[], mttr?: number[] }>} */
const sloSeries = ref({ mtta: [], mttr: [] })

/** 与后端一致：从 6 天前 00:00 起共 7 个自然日标签（本地时区） */
const sloLabels = computed(() => {
  const out = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    out.push(
      d.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        weekday: 'short'
      })
    )
  }
  return out
})

function secToMin(s) {
  const n = Number(s)
  if (!Number.isFinite(n) || n <= 0) return 0
  return n / 60
}

function sloPolyline(values, height, width) {
  const arr = Array.isArray(values) ? values.map((x) => secToMin(x)) : []
  while (arr.length < 7) arr.push(0)
  const slice = arr.slice(0, 7)
  const max = Math.max(1, ...slice)
  const w = width
  const h = height
  const step = w / (slice.length - 1 || 1)
  const pts = slice.map((v, i) => {
    const x = i * step
    const y = h - (v / max) * (h - 8) - 4
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return pts.join(' ')
}

const sloSvgMtta = computed(() => {
  const pts = sloPolyline(sloSeries.value.mtta, 120, 320)
  return `<svg width="100%" height="120" viewBox="0 0 320 120" xmlns="http://www.w3.org/2000/svg" aria-label="MTTA"><polyline fill="none" stroke="#2563eb" stroke-width="2" points="${pts}"/></svg>`
})

const sloSvgMttr = computed(() => {
  const pts = sloPolyline(sloSeries.value.mttr, 120, 320)
  return `<svg width="100%" height="120" viewBox="0 0 320 120" xmlns="http://www.w3.org/2000/svg" aria-label="MTTR"><polyline fill="none" stroke="#7c3aed" stroke-width="2" points="${pts}"/></svg>`
})

async function load() {
  const id = centerId.value
  if (!id) {
    error.value = '缺少故障中心 id'
    return
  }
  error.value = ''
  loading.value = true
  sloSeries.value = { mtta: [], mttr: [] }
  try {
    const tid = localStorage.getItem('tenantId') || localStorage.getItem('TenantID') || undefined
    const res = await faultCenterSlo({ id, ...(tid ? { tenantId: tid } : {}) })
    const data = unwrapW8t(res) || {}
    sloSeries.value = {
      mtta: Array.isArray(data.mtta) ? data.mtta : [],
      mttr: Array.isArray(data.mttr) ? data.mttr : []
    }
  } catch (e) {
    error.value = e?.message || '加载 SLO 失败'
  } finally {
    loading.value = false
  }
}

function goList() {
  router.push({ name: 'FaultCenterList' })
}

function goDashboard() {
  router.push({ name: 'Dashboard' })
}

watch(
  () => centerId.value,
  (id) => {
    if (id) load()
  },
  { immediate: true }
)
</script>
