<template>
  <div class="fc-page fc-detail-full">
    <div class="fc-page-head fc-detail-head fc-head-unified">
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
        <div class="fc-head-titles">
          <p class="fc-crumb muted small">
            <a href="#" class="fc-crumb-link" @click.prevent="goList">故障中心</a>
            <span aria-hidden="true"> / </span>
            <span>详情</span>
          </p>
          <h2>故障中心详情</h2>
        </div>
      </div>
      <div class="fc-head-end">
        <button type="button" class="btn btn-secondary" @click="goList">返回列表</button>
      </div>
    </div>

    <p v-if="pageError" class="fc-page-error">{{ pageError }}</p>

    <div v-if="loading" class="fc-loading"><div class="spinner"></div>加载中…</div>

    <template v-else-if="detail">
      <section class="fc-desc-block fc-table-card fc-basic-info-card">
        <div class="fc-basic-info-head">
          <h3 class="fc-sec-title">基本信息</h3>
          <button
            v-if="perm.canReset()"
            type="button"
            class="btn btn-secondary fc-edit-basic-btn"
            @click="basicEditOpen = true"
          >
            编辑基本信息
          </button>
        </div>
        <dl class="fc-desc-grid">
          <div class="fc-desc-row">
            <dt>ID</dt>
            <dd>
              <div class="fc-desc-value-box fc-desc-value-mono">
                <code>{{ detail.id }}</code>
              </div>
            </dd>
          </div>
          <div class="fc-desc-row">
            <dt>名称</dt>
            <dd>
              <div class="fc-desc-value-box">{{ detail.name || '—' }}</div>
            </dd>
          </div>
          <div class="fc-desc-row fc-desc-row-last">
            <dt>描述</dt>
            <dd>
              <div class="fc-desc-value-box fc-desc-value-multiline">{{ detail.description || '—' }}</div>
            </dd>
          </div>
        </dl>
      </section>

      <FaultCenterEditModal
        :open="basicEditOpen"
        :center-id="centerId"
        @close="basicEditOpen = false"
        @saved="onBasicEditSaved"
      />

      <div class="fc-tabs fc-tabs-unset">
        <div class="fc-tab-nav" role="tablist">
          <button
            v-for="t in tabs"
            :key="t.key"
            type="button"
            role="tab"
            class="fc-tab-btn"
            :class="{ active: activeTab === t.key }"
            @click="setTab(t.key)"
          >
            {{ t.label }}
          </button>
        </div>
        <div class="fc-tab-panels">
          <div v-show="activeTab === '1'" class="fc-tab-panel" role="tabpanel">
            <EventCurrent :fault-center-id="centerId" :sync-detail-route-query="true" />
          </div>
          <div v-show="activeTab === '2'" class="fc-tab-panel" role="tabpanel">
            <EventHistory :fault-center-id="centerId" :sync-detail-route-query="true" />
          </div>
          <div v-show="activeTab === '3'" class="fc-tab-panel" role="tabpanel">
            <SilenceList
              :fault-center-id="centerId"
              show-aggregation-bar
              :aggregation-type="detail.aggregationType || 'Rule'"
              @detail-updated="reloadDetailOnly"
            />
          </div>
          <div v-show="activeTab === '4'" class="fc-tab-panel" role="tabpanel">
            <FaultCenterNotifyTab :center-id="centerId" :detail="detail" @updated="reloadDetailOnly" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { unwrapW8t, faultCenterSearch } from '@/api/faultcenter'
import { useFaultCenterPerm } from '@/composables/useFaultCenterPerm'
import EventCurrent from '@/views/alert-mgmt/EventCurrent.vue'
import EventHistory from '@/views/alert-mgmt/EventHistory.vue'
import SilenceList from '@/views/alert-mgmt/SilenceList.vue'
import FaultCenterNotifyTab from './FaultCenterNotifyTab.vue'
import FaultCenterEditModal from './FaultCenterEditModal.vue'
import './faultCenterCommon.css'

const route = useRoute()
const router = useRouter()
const perm = useFaultCenterPerm()

const tabs = [
  { key: '1', label: '活跃告警' },
  { key: '2', label: '历史告警' },
  { key: '3', label: '告警静默' },
  { key: '4', label: '通知配置' }
]

const pageError = ref('')
const loading = ref(false)
const detail = ref(/** @type {Record<string, unknown>|null} */ (null))

const activeTab = ref('1')
const basicEditOpen = ref(false)

const centerId = computed(() => {
  const raw = route.params.id
  if (raw == null) return ''
  try {
    return decodeURIComponent(String(raw))
  } catch {
    return String(raw)
  }
})

function goList() {
  router.push({ name: 'FaultCenterList' })
}

function goDashboard() {
  router.push({ name: 'Dashboard' })
}

function readTabFromRoute() {
  const t = route.query.tab
  const s = t == null || Array.isArray(t) ? '' : String(t)
  if (s && /^[1-4]$/.test(s)) activeTab.value = s
  else activeTab.value = '1'
}

function setTab(key) {
  activeTab.value = key
  router.replace({
    path: route.path,
    query: { ...route.query, tab: key }
  })
}

async function loadDetailCore() {
  const id = centerId.value
  if (!id) {
    pageError.value = '缺少故障中心 id'
    return
  }
  if (!perm.canSearch()) {
    pageError.value = '当前角色未授权查询接口（GET /api/w8t/faultCenter/faultCenterSearch）'
    return
  }
  const res = await faultCenterSearch({ id })
  detail.value = unwrapW8t(res)
}

async function load() {
  pageError.value = ''
  detail.value = null
  const id = centerId.value
  if (!id) {
    pageError.value = '缺少故障中心 id'
    return
  }
  loading.value = true
  try {
    await loadDetailCore()
  } catch (e) {
    pageError.value = e?.message || '加载详情失败'
  } finally {
    loading.value = false
  }
}

async function reloadDetailOnly() {
  try {
    await loadDetailCore()
  } catch {
    /* 子 Tab 保存后刷新失败时保留旧 detail */
  }
}

async function onBasicEditSaved() {
  await reloadDetailOnly()
}

onMounted(() => {
  readTabFromRoute()
  load()
})

watch(
  () => route.params.id,
  () => load()
)

watch(
  () => route.query.tab,
  () => readTabFromRoute()
)
</script>

<style scoped>
.fc-detail-full {
  max-width: 1200px;
}
.fc-crumb {
  margin: 0 0 6px;
}
.fc-crumb-link {
  color: var(--brand-600, #2563eb);
  text-decoration: none;
}
.fc-crumb-link:hover {
  text-decoration: underline;
}
.fc-basic-info-card {
  box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.08));
}
.fc-basic-info-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-default);
}
.fc-basic-info-head .fc-sec-title {
  margin: 0;
}
.fc-edit-basic-btn {
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 10px;
}
.fc-sec-title {
  margin: 0 0 12px;
  font-size: 16px;
}
.fc-desc-block {
  padding: 18px 22px;
  margin-bottom: 16px;
}
.fc-desc-grid {
  margin: 0;
}
.fc-desc-row {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 16px 20px;
  padding: 14px 0;
  border-bottom: 1px solid var(--border-default);
  font-size: 14px;
  align-items: start;
}
.fc-desc-row-last {
  border-bottom: none;
  padding-bottom: 4px;
}
.fc-desc-row dt {
  margin: 0;
  padding-top: 10px;
  color: var(--text-muted);
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.fc-desc-row dd {
  margin: 0;
  min-width: 0;
}
.fc-desc-value-box {
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--bg-secondary, #f8fafc);
  border: 1px solid var(--border-default);
  color: var(--text-primary);
  line-height: 1.5;
  word-break: break-word;
}
.fc-desc-value-mono code {
  font-size: 13px;
  background: transparent;
  padding: 0;
}
.fc-desc-value-multiline {
  white-space: pre-wrap;
  min-height: 2.75rem;
}
.fc-tabs {
  border: 1px solid var(--border-default);
  border-radius: 10px;
  background: var(--bg-card, #fff);
  overflow: hidden;
}
.fc-tabs-unset .fc-tab-nav {
  position: static;
}
.fc-tab-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  border-bottom: 1px solid var(--border-default);
  background: var(--bg-secondary, #fafafa);
}
.fc-tab-btn {
  padding: 12px 18px;
  border: none;
  background: transparent;
  font-size: 14px;
  cursor: pointer;
  font-family: inherit;
  color: var(--text-secondary);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.fc-tab-btn:hover {
  color: var(--text-primary);
  background: rgba(0, 0, 0, 0.03);
}
.fc-tab-btn.active {
  color: var(--brand-700, #1d4ed8);
  font-weight: 600;
  border-bottom-color: var(--brand-600, #2563eb);
}
.fc-tab-panels {
  padding: 12px 16px 20px;
}
.fc-tab-panel :deep(.am-page) {
  padding-top: 0;
}
.btn.sm {
  padding: 6px 12px;
  font-size: 12px;
}
</style>
