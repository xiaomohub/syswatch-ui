<template>
  <div class="am-page">
    <div class="am-head">
      <h2 class="am-title">告警静默</h2>
      <button type="button" class="am-btn primary" :disabled="!effectiveFc" @click="openModalCreate">新建静默</button>
      <button type="button" class="am-btn" :disabled="loading || !effectiveFc" @click="load">刷新</button>
    </div>

    <p v-if="!effectiveFc" class="am-warn">{{ embedHint }}</p>

    <div v-if="showAggregationBar && effectiveFc" class="agg-bar">
      <span class="agg-label">聚合模式</span>
      <label class="agg-opt">
        <input
          v-model="localAgg"
          type="radio"
          value="Rule"
          :disabled="aggSaving || !perm.canReset()"
          @change="onAggChange"
        />
        相同规则聚合（Rule）
      </label>
      <label class="agg-opt">
        <input
          v-model="localAgg"
          type="radio"
          value="None"
          :disabled="aggSaving || !perm.canReset()"
          @change="onAggChange"
        />
        不聚合（None）
      </label>
      <span v-if="aggSaving" class="muted small">保存中…</span>
    </div>

    <div class="am-filters">
      <input v-model="query" class="am-input sm" placeholder="搜索 id / 备注" @keyup.enter="resetPage">
      <select v-model="filterStatus" class="am-input sm" @change="resetPage">
        <option value="all">全部状态</option>
        <option value="0">未生效</option>
        <option value="1">进行中</option>
        <option value="2">已失效</option>
      </select>
    </div>

    <p v-if="pageError" class="am-err">{{ pageError }}</p>

    <div class="am-table-card">
      <div v-if="loading" class="am-loading"><span class="spinner" />加载中…</div>
      <table v-else class="am-table">
        <thead>
          <tr>
            <th>名称</th>
            <th>状态</th>
            <th>标签条件</th>
            <th>开始</th>
            <th>结束</th>
            <th>更新人</th>
            <th>备注</th>
            <th class="tc">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0">
            <td colspan="8" class="am-empty">{{ effectiveFc ? '暂无静默' : '—' }}</td>
          </tr>
          <tr v-for="row in rows" :key="row.id || row.name">
            <td>{{ row.name || row.id || '—' }}</td>
            <td><span class="status-badge" :class="`st-${row.status}`">{{ statusLabel(row.status) }}</span></td>
            <td class="small mono">{{ silenceLabelsSummary(buildLabelsSummary(row.labels || [])) }}</td>
            <td class="small">{{ formatSilenceDateTime(row.startsAt) }}</td>
            <td class="small">{{ formatSilenceDateTime(row.endsAt) }}</td>
            <td class="small">{{ row.updateBy || '—' }}</td>
            <td>{{ row.comment || '—' }}</td>
            <td class="tc">
              <button type="button" class="link" @click="openModalEdit(row)">编辑</button>
              <button type="button" class="link danger" @click="del(row)">删除</button>
            </td>
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

    <Teleport to="body">
      <div v-if="modalOpen" class="modal-overlay" @click.self="closeModal">
        <div class="modal-box wide">
          <h3>{{ modalMode === 'create' ? '新建静默' : '编辑静默' }}</h3>
          <SilenceForm
            v-if="effectiveFc"
            :key="modalFormKey"
            :mode="modalMode"
            :fault-center-id="effectiveFc"
            :initial-silence="modalInitialSilence"
            :saving="modalSaving"
            @save="onModalSave"
          >
            <template #actions="{ disabled, submit }">
              <button type="button" class="am-btn" :disabled="disabled" @click="closeModal">取消</button>
              <button type="button" class="am-btn primary" :disabled="disabled" @click="submit">保存</button>
            </template>
          </SilenceForm>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { normalizeListPayload } from '@/utils/w8tPage'
import { silenceList, silenceCreate, silenceUpdate, silenceDelete } from '@/api/w8tAlert'
import { faultCenterReset } from '@/api/faultcenter'
import { useFaultCenterContextStore } from '@/store/faultCenterContext'
import { useFaultCenterPerm } from '@/composables/useFaultCenterPerm'
import SilenceForm from './SilenceForm.vue'
import {
  formatSilenceDateTime,
  buildLabelsSummary,
  silenceLabelsSummary
} from './silenceUtils'

defineOptions({ name: 'SilenceList' })

const props = defineProps({
  faultCenterId: { type: String, default: '' },
  /** 故障中心详情「告警静默」Tab：展示聚合方式并调用 faultCenterReset */
  showAggregationBar: { type: Boolean, default: false },
  aggregationType: { type: String, default: 'Rule' }
})

const emit = defineEmits(['detail-updated'])

const route = useRoute()
const fcStore = useFaultCenterContextStore()
const perm = useFaultCenterPerm()

const effectiveFc = computed(() => {
  const q = route.query.faultCenterId
  if (typeof q === 'string' && q.trim()) return q.trim()
  return (props.faultCenterId || '').trim() || fcStore.currentFaultCenterId
})

const embedHint = computed(() =>
  props.faultCenterId ? '缺少故障中心 ID。' : '请先在顶部选择故障中心。'
)

const localAgg = ref(normalizeAgg(props.aggregationType))
const aggSaving = ref(false)

function normalizeAgg(v) {
  return v === 'None' ? 'None' : 'Rule'
}

watch(
  () => props.aggregationType,
  (v) => {
    localAgg.value = normalizeAgg(v)
  }
)

async function onAggChange() {
  const fc = effectiveFc.value
  if (!fc || !perm.canReset()) return
  aggSaving.value = true
  pageError.value = ''
  try {
    await faultCenterReset({ id: fc, aggregationType: localAgg.value })
    emit('detail-updated')
  } catch (e) {
    pageError.value = e?.message || '更新聚合方式失败'
    localAgg.value = normalizeAgg(props.aggregationType)
  } finally {
    aggSaving.value = false
  }
}

const loading = ref(false)
const pageError = ref('')
const rows = ref([])
const total = ref(0)
const index = ref(1)
const size = ref(20)
const query = ref('')
/** @type {import('vue').Ref<'all'|'0'|'1'|'2'>} */
const filterStatus = ref('all')

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / size.value)))

function statusLabel(s) {
  if (s === 0) return '未生效'
  if (s === 1) return '进行中'
  if (s === 2) return '已失效'
  return String(s ?? '—')
}

function resetPage() {
  index.value = 1
  load()
}

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

async function load() {
  const fc = effectiveFc.value
  if (!fc) return
  pageError.value = ''
  loading.value = true
  try {
    const params = {
      faultCenterId: fc,
      query: query.value?.trim() || undefined,
      index: index.value,
      size: Math.max(1, size.value),
      status: filterStatus.value === 'all' ? 'all' : filterStatus.value
    }
    const data = await silenceList(params)
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

const modalOpen = ref(false)
const modalMode = ref('create')
const modalInitialSilence = ref(null)
const modalSaving = ref(false)
const modalFormKey = ref(0)

function openModalCreate() {
  modalMode.value = 'create'
  modalInitialSilence.value = null
  modalFormKey.value += 1
  modalOpen.value = true
}

function openModalEdit(row) {
  modalMode.value = 'edit'
  modalInitialSilence.value = row
  modalFormKey.value += 1
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

async function onModalSave(body) {
  modalSaving.value = true
  pageError.value = ''
  try {
    if (modalMode.value === 'create') {
      await silenceCreate(body)
    } else {
      await silenceUpdate(body)
    }
    closeModal()
    await load()
  } catch (e) {
    pageError.value = e?.message || '保存失败'
  } finally {
    modalSaving.value = false
  }
}

function del(row) {
  const extra =
    row.status === 1
      ? '\n该规则当前进行中；删除后将不再抑制匹配告警的通知。'
      : '\n删除后将不再抑制匹配告警的通知。'
  if (!confirm(`确定删除静默「${row.name || row.id}」？${extra}`)) return
  const id = row.id
  if (!id) {
    pageError.value = '缺少 id'
    return
  }
  const fc = effectiveFc.value
  if (!fc) {
    pageError.value = '缺少故障中心 ID'
    return
  }
  silenceDelete({ id, faultCenterId: fc })
    .then(() => load())
    .catch((e) => {
      pageError.value = e?.message || '删除失败'
    })
}
</script>

<style scoped>
.am-page {
  padding: 8px 0 32px;
}
.am-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.am-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  flex: 1;
  min-width: 120px;
}
.am-warn {
  color: #b45309;
  font-size: 13px;
}
.am-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.am-input {
  padding: 8px 10px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  font-size: 13px;
}
.am-input.sm {
  min-width: 140px;
}
.am-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-default);
  background: #fff;
  font-size: 13px;
  cursor: pointer;
}
.am-btn.primary {
  background: #1d4ed8;
  color: #fff;
  border-color: #1d4ed8;
}
.am-btn.sm {
  padding: 4px 10px;
  font-size: 12px;
}
.am-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.am-err {
  color: #b91c1c;
  font-size: 13px;
}
.am-table-card {
  border: 1px solid var(--border-default);
  border-radius: 10px;
  overflow: auto;
  background: #fff;
}
.am-loading {
  padding: 16px;
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
.am-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.am-table th,
.am-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--border-default);
  text-align: left;
}
.am-table th {
  background: #fafafa;
  font-weight: 600;
}
.small {
  font-size: 12px;
  color: #444;
}
.mono {
  font-family: ui-monospace, monospace;
}
.tc {
  text-align: center;
}
.am-empty {
  text-align: center;
  color: #888;
  padding: 24px;
}
.link {
  background: none;
  border: none;
  color: #2563eb;
  cursor: pointer;
  margin: 0 6px;
  font-size: 13px;
  text-decoration: none;
}
.link.danger {
  color: #b91c1c;
}
.am-pager {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-top: 1px solid var(--border-default);
}
.muted {
  color: #666;
  font-size: 13px;
}
.linkish {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}
.status-badge.st-0 {
  background: #e0e7ff;
  color: #3730a3;
}
.status-badge.st-1 {
  background: #dcfce7;
  color: #166534;
}
.status-badge.st-2 {
  background: #f1f5f9;
  color: #64748b;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.modal-box {
  background: #fff;
  border-radius: 12px;
  padding: 20px 22px;
  min-width: 360px;
  max-width: 640px;
  width: 100%;
  max-height: 90vh;
  overflow: auto;
}
.modal-box.wide {
  max-width: 640px;
}
.modal-box h3 {
  margin: 0 0 12px;
  font-size: 17px;
}
.agg-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
  margin-bottom: 12px;
  padding: 12px 14px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: #fafafa;
  font-size: 13px;
}
.agg-label {
  font-weight: 600;
  color: #444;
}
.agg-opt {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
</style>
