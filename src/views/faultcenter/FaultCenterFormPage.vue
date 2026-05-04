<template>
  <div class="fc-page">
    <div class="fc-page-head">
      <h2>{{ isCreate ? '新建故障中心' : '编辑故障中心' }}</h2>
      <div style="display: flex; gap: 10px; flex-wrap: wrap">
        <button type="button" class="btn btn-secondary" @click="goBack">返回列表</button>
        <button v-if="!isCreate && perm.canSlo()" type="button" class="btn btn-secondary" @click="goSlo">SLO</button>
      </div>
    </div>

    <p v-if="pageError" class="fc-page-error">{{ pageError }}</p>

    <div v-if="loadError" class="fc-page-error">{{ loadError }}</div>

    <div v-else class="fc-table-card" style="padding: 20px">
      <p v-if="isCreate" class="muted small">提交 <code>faultCenterCreate</code>；<code>tenantId</code> 由服务端注入。通知对象与标签路由至少配置一种（按产品策略）。</p>

      <div class="fc-form-section">
        <h4 class="fc-form-h">基础配置</h4>
        <label class="field"><span>名称 *</span><input v-model="form.name" class="fc-input" type="text" /></label>
        <label class="field"><span>描述</span><textarea v-model="form.description" class="fc-textarea" rows="2" /></label>
      </div>

      <div class="fc-form-section">
        <h4 class="fc-form-h">通知策略</h4>
        <label class="field inline"><input v-model="form.recoverNotify" type="checkbox" /> 恢复时发送通知</label>
        <label class="field">
          <span>事件聚合 aggregationType</span>
          <select v-model="form.aggregationType" class="fc-input">
            <option value="">默认（按严重度分组）</option>
            <option value="Rule">Rule（按规则名聚合）</option>
          </select>
        </label>
      </div>

      <div class="fc-form-section">
        <h4 class="fc-form-h">默认通知对象 noticeIds</h4>
        <label class="field">
          <span>通知渠道 ID（逗号 / 空格分隔）</span>
          <input v-model="form.noticeIdsStr" class="fc-input" type="text" placeholder="例如：notice-abc, notice-def" />
        </label>
      </div>

      <div class="fc-form-section">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px">
          <h4 class="fc-form-h" style="margin: 0">标签通知路由 noticeRoutes</h4>
          <button type="button" class="btn btn-secondary" style="padding: 8px 12px" @click="addNoticeRoute">添加标签路由</button>
        </div>
        <p class="muted small">每项含 <code>labels</code>（key / value / operator）与 <code>noticeIds</code>，与 WatchAlert 模型一致。</p>

        <div v-for="(route, ri) in noticeRouteRows" :key="ri" class="fc-route-card">
          <div class="fc-route-card-h">
            <span>路由 #{{ ri + 1 }}</span>
            <button type="button" class="btn btn-text" style="font-size: 12px" @click="removeNoticeRoute(ri)">删除本条</button>
          </div>
          <label class="field">
            <span>本路由通知 ID</span>
            <input v-model="route.noticeIdsStr" class="fc-input" type="text" placeholder="notice-pay, notice-sre" />
          </label>
          <div style="margin-top: 8px">
            <button type="button" class="btn btn-text" style="font-size: 12px; margin-bottom: 8px" @click="addLabelRow(ri)">
              添加 label 条件
            </button>
            <div v-for="(lb, li) in route.labels" :key="li" class="fc-label-row">
              <label class="field" style="margin-bottom: 0">
                <span>key</span>
                <input v-model="lb.key" class="fc-input" type="text" />
              </label>
              <label class="field" style="margin-bottom: 0">
                <span>value</span>
                <input v-model="lb.value" class="fc-input" type="text" />
              </label>
              <label class="field" style="margin-bottom: 0">
                <span>operator</span>
                <select v-model="lb.operator" class="fc-input">
                  <option value="=">=</option>
                  <option value="!=">!=</option>
                  <option value="=~">=~</option>
                  <option value="!~">!~</option>
                </select>
              </label>
              <button type="button" class="btn btn-text" @click="removeLabelRow(ri, li)">删</button>
            </div>
          </div>
        </div>
      </div>

      <template v-if="isCreate || !formShowAdvanced">
        <div class="fc-form-section fc-form-row2">
          <label class="field">
            <span>重复通知间隔（分钟，各等级相同）</span>
            <input v-model.number="form.repeatAllMinutes" class="fc-input" type="number" min="1" />
          </label>
          <label class="field">
            <span>恢复等待 recoverWaitTime（秒）</span>
            <input v-model.number="form.recoverWaitTime" class="fc-input" type="number" min="0" />
          </label>
        </div>
      </template>

      <template v-if="!isCreate && formShowAdvanced">
        <div class="fc-form-section">
          <h4 class="fc-form-h">高级：按等级重复间隔（分钟）</h4>
          <div class="field grid4">
            <label>P0 <input v-model.number="form.repeatP0" class="fc-input" type="number" min="1" /></label>
            <label>P1 <input v-model.number="form.repeatP1" class="fc-input" type="number" min="1" /></label>
            <label>P2 <input v-model.number="form.repeatP2" class="fc-input" type="number" min="1" /></label>
            <label>P3 <input v-model.number="form.repeatP3" class="fc-input" type="number" min="1" /></label>
          </div>
          <label class="field inline"><input v-model="form.recoverNotify" type="checkbox" /> 恢复是否通知</label>
          <label class="field">
            <span>聚合类型</span>
            <select v-model="form.aggregationType" class="fc-input">
              <option value="">默认</option>
              <option value="Rule">Rule</option>
            </select>
          </label>
          <label class="field"><span>恢复等待（秒）</span><input v-model.number="form.recoverWaitTime" class="fc-input" type="number" min="0" /></label>
          <label class="field inline"><input v-model="form.isUpgradeEnabled" type="checkbox" /> 启用告警升级</label>
          <div class="field">
            <span>可升级等级</span>
            <div class="checks">
              <label><input v-model="form.upP0" type="checkbox" /> P0</label>
              <label><input v-model="form.upP1" type="checkbox" /> P1</label>
              <label><input v-model="form.upP2" type="checkbox" /> P2</label>
              <label><input v-model="form.upP3" type="checkbox" /> P3</label>
            </div>
          </div>
          <div class="field grid2">
            <span class="span-full">升级策略 upgradeStrategy</span>
            <label class="inline"><input v-model="form.upgradeStrategyEnabled" type="checkbox" /> enabled</label>
            <label>timeout（秒）<input v-model.number="form.upgradeTimeout" class="fc-input" type="number" min="0" /></label>
            <label>repeatInterval<input v-model.number="form.upgradeRepeatInterval" class="fc-input" type="number" min="0" /></label>
            <label class="span-full">noticeId<input v-model="form.upgradeNoticeId" class="fc-input" type="text" /></label>
          </div>
        </div>
      </template>

      <div v-if="!isCreate" class="fc-form-section" style="border: none">
        <button type="button" class="btn btn-text" @click="toggleFormAdvanced">
          {{ formShowAdvanced ? '收起高级选项' : '展开高级选项（按等级重复间隔、告警升级）' }}
        </button>
      </div>

      <footer style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-default)">
        <button type="button" class="btn btn-secondary" @click="goBack">取消</button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="formSubmitting || (!isCreate && !perm.canUpdate()) || (isCreate && !perm.canCreate())"
          @click="submitForm"
        >
          {{ formSubmitting ? '提交中…' : '保存' }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  unwrapW8t,
  faultCenterSearch,
  faultCenterCreate,
  faultCenterUpdate
} from '@/api/faultcenter'
import { useFaultCenterPerm } from '@/composables/useFaultCenterPerm'
import './faultCenterCommon.css'

const route = useRoute()
const router = useRouter()
const perm = useFaultCenterPerm()

const isCreate = computed(() => route.name === 'FaultCenterCreate')

const pageError = ref('')
const loadError = ref('')
const formSubmitting = ref(false)
const formShowAdvanced = ref(false)
/** @type {import('vue').Ref<Record<string, any> | null>} */
const editBase = ref(null)

const form = ref({
  name: '',
  description: '',
  noticeIdsStr: '',
  repeatAllMinutes: 60,
  repeatP0: 30,
  repeatP1: 30,
  repeatP2: 30,
  repeatP3: 30,
  recoverNotify: true,
  aggregationType: '',
  recoverWaitTime: 60,
  isUpgradeEnabled: false,
  upP0: false,
  upP1: false,
  upP2: false,
  upP3: false,
  upgradeStrategyEnabled: false,
  upgradeTimeout: 300,
  upgradeRepeatInterval: 60,
  upgradeNoticeId: ''
})

/** @type {import('vue').Ref<{ labels: { key: string, value: string, operator: string }[], noticeIdsStr: string }[]>} */
const noticeRouteRows = ref([])

function emptyLabel() {
  return { key: '', value: '', operator: '=' }
}

function addNoticeRoute() {
  noticeRouteRows.value.push({ labels: [emptyLabel()], noticeIdsStr: '' })
}

function removeNoticeRoute(i) {
  noticeRouteRows.value.splice(i, 1)
}

function addLabelRow(routeIndex) {
  noticeRouteRows.value[routeIndex].labels.push(emptyLabel())
}

function removeLabelRow(routeIndex, labelIndex) {
  noticeRouteRows.value[routeIndex].labels.splice(labelIndex, 1)
}

function parseNoticeIds(str) {
  return String(str || '')
    .split(/[,，\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function rowsToNoticeRoutes() {
  return noticeRouteRows.value
    .map((r) => ({
      labels: (r.labels || [])
        .map((l) => ({
          key: String(l.key || '').trim(),
          value: String(l.value || '').trim(),
          operator: String(l.operator || '=').trim() || '='
        }))
        .filter((l) => l.key || l.value),
      noticeIds: parseNoticeIds(r.noticeIdsStr)
    }))
    .filter((r) => r.noticeIds.length > 0 || r.labels.length > 0)
}

function hydrateNoticeRoutesFromServer(routes) {
  const arr = Array.isArray(routes) ? routes : []
  if (arr.length === 0) {
    noticeRouteRows.value = []
    return
  }
  noticeRouteRows.value = arr.map((r) => ({
    labels:
      Array.isArray(r.labels) && r.labels.length
        ? r.labels.map((l) => ({
            key: l.key || '',
            value: l.value || '',
            operator: l.operator || '='
          }))
        : [emptyLabel()],
    noticeIdsStr: Array.isArray(r.noticeIds) ? r.noticeIds.join(', ') : ''
  }))
}

function shouldDefaultAdvanced(row) {
  if (!row || typeof row !== 'object') return false
  const ri = row.repeatNoticeInterval && typeof row.repeatNoticeInterval === 'object' ? row.repeatNoticeInterval : {}
  const p0 = Number(ri.P0 ?? 30)
  if (p0 !== Number(ri.P1) || p0 !== Number(ri.P2) || p0 !== Number(ri.P3)) return true
  const routes = row.noticeRoutes
  if (Array.isArray(routes) && routes.length > 0) return true
  if (row.isUpgradeEnabled) return true
  const arr = row.upgradableSeverity
  if (Array.isArray(arr) && arr.length > 0) return true
  const us = row.upgradeStrategy
  if (us && typeof us === 'object' && us.enabled) return true
  return false
}

function setUpgradableChecks(arr) {
  const s = new Set(Array.isArray(arr) ? arr : [])
  form.value.upP0 = s.has('P0')
  form.value.upP1 = s.has('P1')
  form.value.upP2 = s.has('P2')
  form.value.upP3 = s.has('P3')
}

function upgradableFromForm() {
  const f = form.value
  const out = []
  if (f.upP0) out.push('P0')
  if (f.upP1) out.push('P1')
  if (f.upP2) out.push('P2')
  if (f.upP3) out.push('P3')
  return out
}

function hydrateFormFromServer(row) {
  const ri = row.repeatNoticeInterval && typeof row.repeatNoticeInterval === 'object' ? row.repeatNoticeInterval : {}
  const us = row.upgradeStrategy && typeof row.upgradeStrategy === 'object' ? row.upgradeStrategy : {}
  form.value.name = row.name || ''
  form.value.description = row.description || ''
  form.value.noticeIdsStr = Array.isArray(row.noticeIds) ? row.noticeIds.join(', ') : ''
  hydrateNoticeRoutesFromServer(row.noticeRoutes)
  form.value.repeatP0 = Number(ri.P0 ?? 30)
  form.value.repeatP1 = Number(ri.P1 ?? 30)
  form.value.repeatP2 = Number(ri.P2 ?? 30)
  form.value.repeatP3 = Number(ri.P3 ?? 30)
  const rp0 = form.value.repeatP0
  form.value.repeatAllMinutes =
    rp0 === form.value.repeatP1 && rp0 === form.value.repeatP2 && rp0 === form.value.repeatP3 ? rp0 : rp0
  form.value.recoverNotify = row.recoverNotify !== false
  form.value.aggregationType = row.aggregationType || ''
  form.value.recoverWaitTime = Number(row.recoverWaitTime ?? 60)
  form.value.isUpgradeEnabled = !!row.isUpgradeEnabled
  setUpgradableChecks(row.upgradableSeverity)
  form.value.upgradeStrategyEnabled = !!us.enabled
  form.value.upgradeTimeout = Number(us.timeout ?? 300)
  form.value.upgradeRepeatInterval = Number(us.repeatInterval ?? 60)
  form.value.upgradeNoticeId = us.noticeId || ''
}

function resetFormForCreate() {
  editBase.value = null
  formShowAdvanced.value = false
  form.value = {
    name: '',
    description: '',
    noticeIdsStr: '',
    repeatAllMinutes: 60,
    repeatP0: 30,
    repeatP1: 30,
    repeatP2: 30,
    repeatP3: 30,
    recoverNotify: true,
    aggregationType: '',
    recoverWaitTime: 60,
    isUpgradeEnabled: false,
    upP0: false,
    upP1: false,
    upP2: false,
    upP3: false,
    upgradeStrategyEnabled: false,
    upgradeTimeout: 300,
    upgradeRepeatInterval: 60,
    upgradeNoticeId: ''
  }
  noticeRouteRows.value = []
}

function buildBodyFromForm() {
  const f = form.value
  const useSimple = isCreate.value || !formShowAdvanced.value
  const repeatNoticeInterval = useSimple
    ? (() => {
        const m = Number(f.repeatAllMinutes) || 60
        return { P0: m, P1: m, P2: m, P3: m }
      })()
    : {
        P0: Number(f.repeatP0) || 30,
        P1: Number(f.repeatP1) || 30,
        P2: Number(f.repeatP2) || 30,
        P3: Number(f.repeatP3) || 30
      }
  const noticeRoutes = rowsToNoticeRoutes()
  return {
    name: f.name.trim(),
    description: f.description || '',
    noticeIds: parseNoticeIds(f.noticeIdsStr),
    noticeRoutes,
    repeatNoticeInterval,
    recoverNotify: !!f.recoverNotify,
    aggregationType: f.aggregationType || '',
    recoverWaitTime: Number(f.recoverWaitTime) || 0,
    isUpgradeEnabled: !!f.isUpgradeEnabled,
    upgradableSeverity: upgradableFromForm(),
    upgradeStrategy: {
      enabled: !!f.upgradeStrategyEnabled,
      timeout: Number(f.upgradeTimeout) || 0,
      repeatInterval: Number(f.upgradeRepeatInterval) || 0,
      noticeId: f.upgradeNoticeId || ''
    }
  }
}

function toggleFormAdvanced() {
  if (isCreate.value) return
  if (!formShowAdvanced.value) {
    const m = Number(form.value.repeatAllMinutes) || 60
    form.value.repeatP0 = m
    form.value.repeatP1 = m
    form.value.repeatP2 = m
    form.value.repeatP3 = m
  } else {
    form.value.repeatAllMinutes = Number(form.value.repeatP0) || 60
  }
  formShowAdvanced.value = !formShowAdvanced.value
}

function faultCenterIdFromRoute() {
  const raw = route.params.id
  if (raw == null) return ''
  try {
    return decodeURIComponent(String(raw))
  } catch {
    return String(raw)
  }
}

async function loadEdit() {
  loadError.value = ''
  const id = faultCenterIdFromRoute()
  if (!id) {
    loadError.value = '缺少故障中心 id'
    return
  }
  if (!perm.canSearch()) {
    loadError.value = '未授权查询接口（GET /api/w8t/faultCenter/faultCenterSearch）'
    return
  }
  try {
    const res = await faultCenterSearch({ id })
    const data = unwrapW8t(res)
    editBase.value = data && typeof data === 'object' ? { ...data } : {}
    hydrateFormFromServer(editBase.value)
    formShowAdvanced.value = shouldDefaultAdvanced(editBase.value)
  } catch (e) {
    loadError.value = e?.message || '加载故障中心失败'
  }
}

async function submitForm() {
  pageError.value = ''
  if (!form.value.name?.trim()) {
    pageError.value = '名称不能为空'
    return
  }
  const ids = parseNoticeIds(form.value.noticeIdsStr)
  const routes = rowsToNoticeRoutes()
  if (ids.length === 0 && routes.length === 0) {
    pageError.value = '请至少配置默认通知对象或一条标签路由'
    return
  }
  formSubmitting.value = true
  try {
    if (isCreate.value) {
      if (!perm.canCreate()) {
        pageError.value = '未授权创建接口'
        return
      }
      const body = buildBodyFromForm()
      unwrapW8t(await faultCenterCreate(body))
    } else {
      if (!perm.canUpdate()) {
        pageError.value = '未授权更新接口'
        return
      }
      const merged = {
        ...(editBase.value || {}),
        ...buildBodyFromForm(),
        id: editBase.value?.id
      }
      if (!merged.id) {
        pageError.value = '缺少故障中心 id'
        return
      }
      unwrapW8t(await faultCenterUpdate(merged))
    }
    router.push({ name: 'FaultCenterList' })
  } catch (e) {
    pageError.value = e?.message || '保存失败'
  } finally {
    formSubmitting.value = false
  }
}

function goBack() {
  router.push({ name: 'FaultCenterList' })
}

function goSlo() {
  const id = editBase.value?.id || faultCenterIdFromRoute()
  if (!id) return
  router.push({ name: 'FaultCenterSlo', params: { id } })
}

watch(
  () => ({ name: route.name, id: route.params.id }),
  () => {
    pageError.value = ''
    if (route.name === 'FaultCenterCreate') {
      loadError.value = ''
      resetFormForCreate()
    } else if (route.name === 'FaultCenterEdit') {
      loadEdit()
    }
  },
  { immediate: true }
)
</script>
