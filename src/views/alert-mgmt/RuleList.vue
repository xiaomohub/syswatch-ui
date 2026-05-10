<template>
  <div class="am-page am-rules-page">
    <h2 class="am-page-title">告警规则</h2>

    <div class="am-rules-shell">
      <aside class="am-groups-panel" aria-label="规则组">
        <div class="am-sidenav-head">
          <span class="am-sidenav-title">规则组</span>
          <div class="am-sidenav-tools">
            <button
              type="button"
              class="am-icon-btn"
              :disabled="groupsLoading"
              title="刷新"
              aria-label="刷新规则组"
              @click="onRefreshSidebarGroups"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
            </button>
            <button type="button" class="am-icon-btn" title="新建规则组" aria-label="新建规则组" @click="openGroupCreate">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="am-groups-toolbar">
          <input
            v-model="groupSearchInput"
            type="search"
            class="am-input sm am-groups-search"
            placeholder="搜索规则组…"
            @keyup.enter="applyGroupSearch"
          >
        </div>
        <p v-if="groupPageError" class="am-err">{{ groupPageError }}</p>
        <div class="am-groups-list-wrap">
          <div v-if="groupsLoading" class="am-groups-loading muted">加载规则组…</div>
          <ul v-else class="am-sidenav-list" role="list">
            <li v-for="g in ruleGroups" :key="g.id">
              <div
                class="am-sidenav-row"
                :class="{ active: filterGroupId === g.id }"
                role="button"
                tabindex="0"
                @click="selectGroup(g.id)"
                @keydown.enter.prevent="selectGroup(g.id)"
                @keydown.space.prevent="selectGroup(g.id)"
              >
                <span class="am-sidenav-name">{{ g.name || g.id }}</span>
                <span class="am-sidenav-meta mono">{{ g.id }}</span>
                <span class="am-sidenav-tools-inline" @click.stop>
                  <button type="button" class="am-icon-btn sm" title="编辑" aria-label="编辑" @click="openGroupEdit(g)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button type="button" class="am-icon-btn sm danger" title="删除" aria-label="删除" @click="askDeleteGroup(g)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </span>
              </div>
            </li>
          </ul>
          <p v-if="!groupsLoading && ruleGroups.length === 0" class="am-groups-empty muted">暂无规则组，请先新建。</p>
        </div>
      </aside>

      <div class="am-rules-main">
        <div class="am-main-toolbar">
          <div class="am-toolbar-left">
            <div class="am-status-tabs" role="tablist" aria-label="规则状态">
              <button
                type="button"
                role="tab"
                class="am-status-tab"
                :class="{ active: filterStatus === 'all' }"
                :aria-selected="filterStatus === 'all'"
                @click="setStatusFilter('all')"
              >全部</button>
              <button
                type="button"
                role="tab"
                class="am-status-tab"
                :class="{ active: filterStatus === 'enabled' }"
                :aria-selected="filterStatus === 'enabled'"
                @click="setStatusFilter('enabled')"
              >开启</button>
              <button
                type="button"
                role="tab"
                class="am-status-tab"
                :class="{ active: filterStatus === 'disabled' }"
                :aria-selected="filterStatus === 'disabled'"
                @click="setStatusFilter('disabled')"
              >禁用</button>
            </div>
            <select v-model="filterDs" class="am-input sm am-toolbar-ds" @change="resetPage">
              <option value="">全部数据源</option>
              <option v-for="t in alertDatasourceTypes" :key="t" :value="t">{{ t }}</option>
            </select>
            <label v-if="fcStore.currentFaultCenterId" class="chk am-toolbar-chk">
              <input v-model="onlyCurrentFc" type="checkbox" @change="resetPage"> 当前故障中心
            </label>
          </div>
          <div class="am-toolbar-center">
            <div class="am-search-field">
              <svg class="am-search-ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                v-model="filterQuery"
                type="search"
                class="am-search-input"
                placeholder="搜索规则名称…"
                @keyup.enter="resetPage"
              >
            </div>
          </div>
          <div class="am-toolbar-right">
            <div ref="batchDropdownRef" class="am-batch-dropdown">
              <button
                type="button"
                class="am-btn-toolbar"
                :disabled="!selectedIds.length || !filterGroupId"
                @click.stop="toggleBatchMenu"
              >
                批量操作
                <svg class="am-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              <ul v-if="batchMenuOpen" class="am-batch-menu" role="menu">
                <li role="none">
                  <button type="button" role="menuitem" class="am-batch-menu-item" @click="openBatchFromMenu">批量变更</button>
                </li>
                <li role="none">
                  <button type="button" role="menuitem" class="am-batch-menu-item" @click="clearSelAndCloseMenu">清除选择</button>
                </li>
              </ul>
            </div>
            <RouterLink
              to="/alert-mgmt/rules/import"
              class="am-btn-toolbar am-btn-toolbar-dark linkish"
            >导入</RouterLink>
            <RouterLink
              v-if="filterGroupId"
              :to="createRuleTo"
              class="am-btn-toolbar am-btn-toolbar-dark linkish"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              创建
            </RouterLink>
            <button
              v-else
              type="button"
              class="am-btn-toolbar am-btn-toolbar-dark"
              disabled
              title="请先选择规则组"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              创建
            </button>
          </div>
        </div>

        <p v-if="pageError" class="am-err">{{ pageError }}</p>

        <div class="am-table-wrap">
          <div v-if="!filterGroupId" class="am-loading am-placeholder">请先创建并选择左侧规则组</div>
          <div v-else-if="loading" class="am-loading"><span class="spinner" />加载中…</div>
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
            <td colspan="8" class="am-empty">该规则组下暂无规则</td>
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
              <RouterLink
                v-if="row.faultCenterId && row.ruleName"
                class="link"
                :to="{
                  name: 'FaultCenterDetail',
                  params: { id: row.faultCenterId },
                  query: { query: row.ruleName, tab: '1' }
                }"
              >故障中心</RouterLink>
              <button type="button" class="link" @click="toggleRule(row)">{{ row.enabled ? '停用' : '启用' }}</button>
              <button type="button" class="link danger" @click="delRule(row)">删除</button>
            </td>
          </tr>
          </tbody>
          </table>
        </div>

        <div v-if="filterGroupId && !loading && total > 0" class="am-pager-bar">
          <div class="am-pager-inner">
            <span class="am-pager-info muted">{{ pagerRangeText }}</span>
            <label class="am-pager-size">
              <span class="muted">每页</span>
              <select v-model.number="size" class="am-input sm am-pager-size-select" @change="onPageSizeChange">
                <option :value="10">10 条</option>
                <option :value="20">20 条</option>
                <option :value="50">50 条</option>
              </select>
            </label>
            <div v-if="totalPages > 1" class="am-pager-controls">
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
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="groupModalOpen" class="modal-overlay" @click.self="groupModalOpen = false">
        <div class="modal-box">
          <h3>{{ groupModalMode === 'create' ? '新建规则组' : '编辑规则组' }}</h3>
          <label class="field"><span>名称</span><input v-model="groupForm.name" class="am-input" type="text"></label>
          <p v-if="groupFormError" class="am-err">{{ groupFormError }}</p>
          <div class="modal-actions">
            <button type="button" class="am-btn" @click="groupModalOpen = false">取消</button>
            <button type="button" class="am-btn primary" :disabled="groupSubmitting" @click="submitGroupForm">保存</button>
          </div>
        </div>
      </div>
    </Teleport>

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
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { normalizeListPayload, buildPageList } from '@/utils/w8tPage'
import {
  ruleList,
  ruleGroupList,
  ruleGroupCreate,
  ruleGroupUpdate,
  ruleGroupDelete,
  ruleDelete,
  ruleChangeStatus,
  ruleBatchChange
} from '@/api/w8tAlert'
import { useFaultCenterContextStore } from '@/store/faultCenterContext'
import { ALERT_DATASOURCE_TYPES } from '@/constants/alertDatasourceTypes'

const alertDatasourceTypes = ALERT_DATASOURCE_TYPES

const PAGE_SIZE_OPTIONS = [10, 20, 50]

const fcStore = useFaultCenterContextStore()
const route = useRoute()
const router = useRouter()

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

const groupsLoading = ref(false)
const groupPageError = ref('')
const groupSearchQuery = ref('')
const groupSearchInput = ref('')

const groupModalOpen = ref(false)
const groupModalMode = ref('create')
const groupForm = ref({ id: '', name: '' })
const groupFormError = ref('')
const groupSubmitting = ref(false)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / size.value)))
const pageNums = computed(() => buildPageList(index.value, totalPages.value))

const pagerRangeText = computed(() => {
  if (!total.value) return ''
  const start = (index.value - 1) * size.value + 1
  const end = Math.min(index.value * size.value, total.value)
  return `第 ${start}-${end} 条，共 ${total.value} 条`
})

const batchDropdownRef = ref(null)
const batchMenuOpen = ref(false)

const createRuleTo = computed(() => ({
  path: '/alert-mgmt/rules/create',
  query: { groupId: filterGroupId.value }
}))

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

function setStatusFilter(v) {
  if (filterStatus.value === v) return
  filterStatus.value = v
  resetPage()
}

function toggleBatchMenu() {
  if (!selectedIds.value.length || !filterGroupId.value) return
  batchMenuOpen.value = !batchMenuOpen.value
}

function openBatchFromMenu() {
  batchMenuOpen.value = false
  openBatch()
}

function clearSelAndCloseMenu() {
  batchMenuOpen.value = false
  clearSel()
}

function onDocumentClick(e) {
  const root = batchDropdownRef.value
  if (root && !root.contains(e.target)) batchMenuOpen.value = false
}

function selectGroup(id) {
  if (!id) return
  router.replace({ path: '/alert-mgmt/rules', query: { groupId: id } })
}

/** URL 与列表同步当前选中的规则组；无合法 groupId 时选第一个或清空 */
function resolveSelectionFromRoute() {
  const gid = queryGroupId()
  if (gid && ruleGroups.value.some((g) => g.id === gid)) {
    filterGroupId.value = gid
    return
  }
  if (ruleGroups.value.length > 0) {
    const pick = ruleGroups.value[0].id
    filterGroupId.value = pick
    if (gid !== pick) {
      router.replace({ path: '/alert-mgmt/rules', query: { groupId: pick } })
    }
    return
  }
  filterGroupId.value = ''
}

async function applyGroupSearch() {
  groupSearchQuery.value = groupSearchInput.value?.trim() || ''
  await loadSidebarGroups()
  resolveSelectionFromRoute()
  index.value = 1
  await load()
}

async function onRefreshSidebarGroups() {
  await loadSidebarGroups()
  resolveSelectionFromRoute()
  index.value = 1
  await load()
}

async function loadSidebarGroups() {
  groupPageError.value = ''
  groupsLoading.value = true
  try {
    const data = await ruleGroupList({
      query: groupSearchQuery.value || undefined,
      index: 1,
      size: 500
    })
    const n = normalizeListPayload(data)
    ruleGroups.value = n.list
  } catch (e) {
    ruleGroups.value = []
    groupPageError.value = e?.message || '加载规则组失败'
  } finally {
    groupsLoading.value = false
  }
}

function openGroupCreate() {
  groupModalMode.value = 'create'
  groupForm.value = { id: '', name: '' }
  groupFormError.value = ''
  groupModalOpen.value = true
}

function openGroupEdit(row) {
  groupModalMode.value = 'edit'
  groupForm.value = { id: row.id, name: row.name || '' }
  groupFormError.value = ''
  groupModalOpen.value = true
}

async function submitGroupForm() {
  groupFormError.value = ''
  if (!groupForm.value.name?.trim()) {
    groupFormError.value = '请填写名称'
    return
  }
  groupSubmitting.value = true
  try {
    if (groupModalMode.value === 'create') {
      await ruleGroupCreate({ name: groupForm.value.name.trim() })
    } else {
      await ruleGroupUpdate({ id: groupForm.value.id, name: groupForm.value.name.trim() })
    }
    groupModalOpen.value = false
    await loadSidebarGroups()
    resolveSelectionFromRoute()
    index.value = 1
    await load()
  } catch (e) {
    groupFormError.value = e?.message || '保存失败'
  } finally {
    groupSubmitting.value = false
  }
}

function askDeleteGroup(row) {
  if (!confirm(`删除规则组「${row.name || row.id}」？`)) return
  ruleGroupDelete({ id: row.id })
    .then(async () => {
      await loadSidebarGroups()
      resolveSelectionFromRoute()
      index.value = 1
      await load()
    })
    .catch((e) => {
      groupPageError.value = e?.message || '删除失败'
    })
}

function resetPage() {
  index.value = 1
  load()
}

function queryGroupId() {
  const g = route.query.groupId
  if (typeof g === 'string') return g
  if (Array.isArray(g) && g[0]) return String(g[0])
  return ''
}

watch(
  () => route.query.groupId,
  async () => {
    if (groupsLoading.value) return
    resolveSelectionFromRoute()
    index.value = 1
    await load()
  }
)

async function load() {
  pageError.value = ''
  if (!filterGroupId.value) {
    rawList.value = []
    total.value = 0
    loading.value = false
    return
  }
  loading.value = true
  try {
    const data = await ruleList({
      ruleGroupId: filterGroupId.value,
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
    size.value = normalizeRulePageSize(n.size)
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

function normalizeRulePageSize(n) {
  const v = Number(n)
  return PAGE_SIZE_OPTIONS.includes(v) ? v : 20
}

function onPageSizeChange() {
  size.value = normalizeRulePageSize(size.value)
  index.value = 1
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
  document.addEventListener('click', onDocumentClick)
  groupSearchInput.value = ''
  await loadSidebarGroups()
  const before = queryGroupId()
  resolveSelectionFromRoute()
  await nextTick()
  const after = queryGroupId()
  if (before === after) {
    index.value = 1
    await load()
  }
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>

<style scoped>
/* 占满主区域纵向空间：视口高度 − 顶栏 − 页面与标题占位 */
.am-page.am-rules-page {
  display: flex;
  flex-direction: column;
  min-height: max(480px, calc(100vh - 168px));
  padding: 8px 0 32px;
  box-sizing: border-box;
}
.am-page-title {
  margin: 0 0 16px;
  font-size: 20px;
  font-weight: 600;
  flex-shrink: 0;
}
.am-rules-shell {
  display: flex;
  align-items: stretch;
  flex-wrap: wrap;
  flex: 1 1 auto;
  min-height: max(480px, calc(100vh - 168px));
  border: 1px solid var(--border-default);
  border-radius: 10px;
  background: var(--bg-card, #fff);
  overflow: hidden;
  box-sizing: border-box;
}
.am-groups-panel {
  flex: 0 0 280px;
  max-width: 100%;
  border-right: 1px solid var(--border-default);
  background: var(--bg-subtle, #f8fafc);
  padding: 14px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  align-self: stretch;
  box-sizing: border-box;
}
.am-sidenav-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}
.am-sidenav-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary, #1a1a1a);
}
.am-sidenav-tools {
  display: flex;
  align-items: center;
  gap: 4px;
}
.am-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #475569;
  cursor: pointer;
}
.am-icon-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.06);
  color: #0f172a;
}
.am-icon-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.am-icon-btn.sm {
  width: 28px;
  height: 28px;
}
.am-icon-btn.danger:hover:not(:disabled) {
  color: #b91c1c;
  background: #fef2f2;
}
.am-groups-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.am-groups-search { flex: 1; min-width: 0; }
.am-groups-list-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.am-groups-loading { padding: 12px 4px; font-size: 13px; }
.am-sidenav-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.am-sidenav-row {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  align-items: center;
  column-gap: 8px;
  row-gap: 2px;
  padding: 10px 8px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.am-sidenav-row:hover {
  background: rgba(255, 255, 255, 0.7);
}
.am-sidenav-row.active {
  background: #fff7ed;
  border-color: #fed7aa;
}
.am-sidenav-row.active .am-sidenav-name {
  color: #c2410c;
  font-weight: 600;
}
.am-sidenav-name {
  font-size: 13px;
  color: #334155;
  grid-column: 1;
  grid-row: 1;
}
.am-sidenav-meta {
  font-size: 11px;
  color: #94a3b8;
  grid-column: 1;
  grid-row: 2;
  word-break: break-all;
}
.am-sidenav-tools-inline {
  grid-column: 2;
  grid-row: 1 / span 2;
  display: flex;
  align-items: center;
  gap: 2px;
}
.am-groups-empty { margin: 8px 0 0; font-size: 12px; }
.am-rules-main {
  flex: 1 1 400px;
  min-width: 280px;
  min-height: 0;
  padding: 16px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  align-self: stretch;
}
.mono { font-family: ui-monospace, monospace; }

.am-main-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
  margin-bottom: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-default);
}
.am-toolbar-left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.am-status-tabs {
  display: inline-flex;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.am-status-tab {
  padding: 8px 14px;
  font-size: 13px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #64748b;
  border-right: 1px solid var(--border-default);
}
.am-status-tab:last-child {
  border-right: none;
}
.am-status-tab:hover {
  color: #0f172a;
  background: #f8fafc;
}
.am-status-tab.active {
  color: #1d4ed8;
  font-weight: 600;
  background: #eff6ff;
  box-shadow: inset 0 0 0 1px #bfdbfe;
}
.am-toolbar-ds {
  min-width: 130px;
}
.am-toolbar-chk {
  margin: 0;
  white-space: nowrap;
}
.am-toolbar-center {
  flex: 1;
  min-width: 200px;
}
.am-search-field {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 420px;
  padding: 0 12px;
  height: 38px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: #fff;
}
.am-search-ic {
  flex-shrink: 0;
  color: #94a3b8;
}
.am-search-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  font-size: 13px;
  background: transparent;
}
.am-toolbar-right {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}
.am-btn-toolbar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 38px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  border: 1px solid var(--border-default);
  background: #fff;
  color: #334155;
  cursor: pointer;
  font-family: inherit;
}
.am-btn-toolbar:hover:not(:disabled) {
  border-color: #cbd5e1;
  background: #f8fafc;
}
.am-btn-toolbar:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.am-btn-toolbar-dark,
a.am-btn-toolbar-dark {
  background: #18181b;
  border-color: #18181b;
  color: #fff;
}
.am-btn-toolbar-dark:hover:not(:disabled) {
  background: #27272a;
  border-color: #27272a;
  color: #fff;
}
.am-chevron {
  flex-shrink: 0;
  opacity: 0.7;
}
.am-batch-dropdown {
  position: relative;
}
.am-batch-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  z-index: 50;
  min-width: 140px;
  margin: 0;
  padding: 6px;
  list-style: none;
  background: #fff;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
}
.am-batch-menu-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  font-size: 13px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  color: #334155;
}
.am-batch-menu-item:hover {
  background: #f1f5f9;
}
.am-title { margin: 0; font-size: 20px; font-weight: 600; }
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
a.am-btn-toolbar.linkish {
  text-decoration: none;
  box-sizing: border-box;
}
.am-err { color: #b91c1c; font-size: 13px; }
.am-table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: transparent;
}
.am-loading { padding: 24px; display: flex; align-items: center; gap: 10px; color: #555; }
.am-placeholder { justify-content: center; color: #64748b; font-size: 14px; }
.am-btn.primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
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
.am-pager-bar {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding-top: 12px;
  margin-top: auto;
  border-top: 1px solid var(--border-default);
}
.am-pager-inner {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px 16px;
  max-width: 100%;
}
.am-pager-info {
  font-size: 13px;
  white-space: nowrap;
}
.am-pager-size {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  white-space: nowrap;
}
.am-pager-size-select {
  min-width: 88px;
  padding: 6px 10px;
}
.am-pager-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
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
