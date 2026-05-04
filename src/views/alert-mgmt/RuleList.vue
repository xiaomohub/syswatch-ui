<template>
  <div class="am-page">
    <div class="am-head">
      <h2 class="am-title">告警规则</h2>
      <div class="am-actions">
        <RouterLink to="/alert-mgmt/rules/create" class="am-btn primary linkish">新建规则</RouterLink>
        <RouterLink to="/alert-mgmt/rules/import" class="am-btn linkish">导入</RouterLink>
        <button type="button" class="am-btn" :disabled="loading" @click="load">刷新</button>
      </div>
    </div>

    <div class="am-filters">
      <select v-model="filterGroupId" class="am-input sm" @change="resetPage">
        <option value="">全部规则组</option>
        <option v-for="g in ruleGroups" :key="g.id" :value="g.id">{{ g.name || g.id }}</option>
      </select>
      <input v-model="filterQuery" class="am-input sm" placeholder="query" @keyup.enter="resetPage">
      <select v-model="filterDs" class="am-input sm" @change="resetPage">
        <option value="">全部数据源类型</option>
        <option value="Prometheus">Prometheus</option>
        <option value="Loki">Loki</option>
        <option value="Kubernetes">Kubernetes</option>
      </select>
      <select v-model="filterStatus" class="am-input sm" @change="resetPage">
        <option value="all">全部状态</option>
        <option value="enabled">已启用</option>
        <option value="disabled">已禁用</option>
      </select>
      <label class="chk" v-if="fcStore.currentFaultCenterId">
        <input v-model="onlyCurrentFc" type="checkbox"> 仅当前故障中心
      </label>
    </div>

    <p v-if="pageError" class="am-err">{{ pageError }}</p>

    <div v-if="selectedIds.length" class="am-batch">
      <span>已选 {{ selectedIds.length }} 条</span>
      <button type="button" class="am-btn sm" @click="openBatch">批量变更</button>
      <button type="button" class="am-btn sm" @click="clearSel">清除选择</button>
    </div>

    <div class="am-table-card">
      <div v-if="loading" class="am-loading"><span class="spinner" />加载中…</div>
      <table v-else class="am-table">
        <thead>
          <tr>
            <th class="nw"><input type="checkbox" :checked="allVisibleSelected" @change="toggleAll"></th>
            <th>规则名</th>
            <th>规则组</th>
            <th>数据源</th>
            <th>故障中心</th>
            <th>级别</th>
            <th>状态</th>
            <th class="tc">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="displayRows.length === 0">
            <td colspan="8" class="am-empty">暂无规则</td>
          </tr>
          <tr v-for="row in displayRows" :key="row.ruleId">
            <td class="nw">
              <input v-model="selectedIds" type="checkbox" :value="row.ruleId">
            </td>
            <td>
              <div class="strong">{{ row.ruleName || row.ruleId }}</div>
              <div class="sub">{{ row.description || '' }}</div>
            </td>
            <td><code>{{ row.ruleGroupId }}</code></td>
            <td>{{ row.datasourceType || '—' }}</td>
            <td><code>{{ row.faultCenterId || '—' }}</code></td>
            <td>{{ row.severity || '—' }}</td>
            <td>
              <span :class="['pill', row.enabled ? 'on' : 'off']">{{ row.enabled ? '启用' : '停用' }}</span>
            </td>
            <td class="tc">
              <RouterLink
                class="link"
                :to="`/alert-mgmt/rules/${encodeURIComponent(row.ruleGroupId)}/${encodeURIComponent(row.ruleId)}/edit`"
              >编辑</RouterLink>
              <button type="button" class="link" @click="toggleRule(row)">{{ row.enabled ? '停用' : '启用' }}</button>
              <button type="button" class="link danger" @click="delRule(row)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="total > size" class="am-pager">
        <span class="muted">共 {{ total }} 条</span>
        <button type="button" class="am-btn sm" :disabled="index <= 1" @click="goPage(index - 1)">上一页</button>
        <template v-for="p in pageNums" :key="'p-' + p">
          <span v-if="p === '...'" class="ellipsis">…</span>
          <button
            v-else
            type="button"
            class="am-btn sm"
            :class="{ active: p === index }"
            @click="goPage(p)"
          >{{ p }}</button>
        </template>
        <button type="button" class="am-btn sm" :disabled="index >= totalPages" @click="goPage(index + 1)">下一页</button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="batchOpen" class="modal-overlay" @click.self="batchOpen = false">
        <div class="modal-box wide">
          <h3>批量变更</h3>
          <p class="muted">仅填写需要修改的项；数据源 ID 多个用英文逗号分隔。</p>
          <label class="field"><span>规则组 ID</span><input v-model="batch.rule_group_id" class="am-input" placeholder="可选"></label>
          <label class="field"><span>故障中心 ID</span><input v-model="batch.fault_center_id" class="am-input" placeholder="可选"></label>
          <label class="field"><span>数据源 ID 列表</span><input v-model="batch.datasource_ids_str" class="am-input" placeholder="id1,id2"></label>
          <label class="field"><span>启用</span>
            <select v-model="batch.enabled_mode" class="am-input">
              <option value="">不修改</option>
              <option value="true">启用</option>
              <option value="false">停用</option>
            </select>
          </label>
          <p v-if="batchError" class="am-err">{{ batchError }}</p>
          <div class="modal-actions">
            <button type="button" class="am-btn" @click="batchOpen = false">取消</button>
            <button type="button" class="am-btn primary" :disabled="batchSaving" @click="submitBatch">提交</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { normalizeListPayload, buildPageList } from '@/utils/w8tPage'
import {
  ruleList,
  ruleGroupList,
  ruleDelete,
  ruleChangeStatus,
  ruleBatchChange
} from '@/api/w8tAlert'
import { useFaultCenterContextStore } from '@/store/faultCenterContext'

const fcStore = useFaultCenterContextStore()

const loading = ref(false)
const pageError = ref('')
const rawList = ref([])
const total = ref(0)
const index = ref(1)
const size = ref(20)

const filterGroupId = ref('')
const filterQuery = ref('')
const filterDs = ref('')
const filterStatus = ref('all')
const onlyCurrentFc = ref(true)

const ruleGroups = ref([])
const selectedIds = ref([])

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / size.value)))
const pageNums = computed(() => buildPageList(index.value, totalPages.value))

const displayRows = computed(() => {
  const fc = fcStore.currentFaultCenterId
  if (!onlyCurrentFc.value || !fc) return rawList.value
  return rawList.value.filter((r) => !r.faultCenterId || r.faultCenterId === fc)
})

const allVisibleSelected = computed(() => {
  if (!displayRows.value.length) return false
  const set = new Set(selectedIds.value)
  return displayRows.value.every((r) => set.has(r.ruleId))
})

function toggleAll(e) {
  const on = e.target.checked
  const ids = displayRows.value.map((r) => r.ruleId)
  if (on) {
    selectedIds.value = [...new Set([...selectedIds.value, ...ids])]
  } else {
    const drop = new Set(ids)
    selectedIds.value = selectedIds.value.filter((id) => !drop.has(id))
  }
}

function clearSel() {
  selectedIds.value = []
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

function resetPage() {
  index.value = 1
  load()
}

async function load() {
  pageError.value = ''
  loading.value = true
  try {
    const data = await ruleList({
      ruleGroupId: filterGroupId.value || undefined,
      datasourceType: filterDs.value || undefined,
      query: filterQuery.value?.trim() || undefined,
      status: filterStatus.value,
      index: index.value,
      size: size.value
    })
    const n = normalizeListPayload(data)
    rawList.value = n.list
    total.value = n.total
    index.value = n.index
    size.value = n.size
  } catch (e) {
    rawList.value = []
    pageError.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function goPage(p) {
  index.value = Math.max(1, Math.min(p, totalPages.value))
  load()
}

async function toggleRule(row) {
  const next = !row.enabled
  if (!confirm(`确定要${next ? '启用' : '停用'}规则「${row.ruleName}」？`)) return
  try {
    await ruleChangeStatus({
      ruleId: row.ruleId,
      ruleGroupId: row.ruleGroupId,
      faultCenterId: row.faultCenterId,
      enabled: next
    })
    await load()
  } catch (e) {
    pageError.value = e?.message || '操作失败'
  }
}

function delRule(row) {
  if (!confirm(`删除规则「${row.ruleName}」？将清理 Redis 中相关事件。`)) return
  ruleDelete({ ruleId: row.ruleId })
    .then(() => load())
    .catch((e) => {
      pageError.value = e?.message || '删除失败'
    })
}

const batchOpen = ref(false)
const batchError = ref('')
const batchSaving = ref(false)
const batch = ref({
  rule_group_id: '',
  fault_center_id: '',
  datasource_ids_str: '',
  enabled_mode: ''
})

function openBatch() {
  if (!selectedIds.value.length) return
  batch.value = {
    rule_group_id: '',
    fault_center_id: '',
    datasource_ids_str: '',
    enabled_mode: ''
  }
  batchError.value = ''
  batchOpen.value = true
}

async function submitBatch() {
  batchError.value = ''
  const change = {}
  if (batch.value.rule_group_id?.trim()) change.rule_group_id = batch.value.rule_group_id.trim()
  if (batch.value.fault_center_id?.trim()) change.fault_center_id = batch.value.fault_center_id.trim()
  if (batch.value.datasource_ids_str?.trim()) {
    change.datasource_ids = batch.value.datasource_ids_str.split(',').map((s) => s.trim()).filter(Boolean)
  }
  if (batch.value.enabled_mode === 'true') change.enabled = true
  if (batch.value.enabled_mode === 'false') change.enabled = false
  if (Object.keys(change).length === 0) {
    batchError.value = '请至少填写一项变更'
    return
  }
  batchSaving.value = true
  try {
    await ruleBatchChange({ rule_ids: [...selectedIds.value], change })
    batchOpen.value = false
    selectedIds.value = []
    await load()
  } catch (e) {
    batchError.value = e?.message || '批量变更失败'
  } finally {
    batchSaving.value = false
  }
}

onMounted(async () => {
  await loadGroups()
  await load()
})
</script>

<style scoped>
.am-page { padding: 8px 0 32px; }
.am-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.am-title { margin: 0; font-size: 20px; font-weight: 600; }
.am-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.am-filters { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
.am-input {
  padding: 8px 10px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  font-size: 13px;
}
.am-input.sm { min-width: 120px; }
.am-btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-default);
  background: #fff;
  font-size: 13px;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
}
.am-btn.primary { background: #1d4ed8; color: #fff; border-color: #1d4ed8; }
.am-btn.linkish { text-decoration: none; }
.am-btn.sm { padding: 4px 10px; font-size: 12px; }
.am-btn.active { font-weight: 700; border-color: #1d4ed8; }
.am-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.chk { font-size: 13px; color: #444; display: flex; align-items: center; gap: 6px; }
.am-batch {
  display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
  padding: 10px 12px; background: #f8fafc; border-radius: 8px; font-size: 13px;
}
.am-err { color: #b91c1c; font-size: 13px; }
.am-table-card {
  border: 1px solid var(--border-default);
  border-radius: 10px;
  overflow: auto;
  background: #fff;
}
.am-loading { padding: 24px; display: flex; align-items: center; gap: 10px; color: #555; }
.spinner {
  width: 18px; height: 18px;
  border: 2px solid #ddd;
  border-top-color: #333;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.am-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 800px; }
.am-table th, .am-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--border-default); vertical-align: top; }
.am-table th { background: #fafafa; font-weight: 600; }
.nw { white-space: nowrap; width: 36px; }
.tc { text-align: center; }
.am-empty { text-align: center; color: #888; padding: 28px; }
.strong { font-weight: 600; color: #1a1a1a; }
.sub { font-size: 12px; color: #666; margin-top: 2px; }
.pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; }
.pill.on { background: #dcfce7; color: #166534; }
.pill.off { background: #f3f4f6; color: #4b5563; }
.link { background: none; border: none; color: #2563eb; cursor: pointer; margin: 0 6px; font-size: 13px; text-decoration: none; }
.link.danger { color: #b91c1c; }
.am-pager { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; padding: 12px; border-top: 1px solid var(--border-default); }
.muted { color: #666; font-size: 13px; }
.ellipsis { padding: 0 4px; color: #999; }
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000;
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.modal-box {
  background: #fff; border-radius: 12px; padding: 20px 22px; min-width: 360px; max-width: 100%;
}
.modal-box.wide { min-width: 440px; }
.modal-box h3 { margin: 0 0 12px; font-size: 17px; }
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; font-size: 13px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
</style>
