<template>
  <div class="fn-tab">
    <p v-if="tabError" class="fc-page-error">{{ tabError }}</p>
    <p v-if="!detail?.id" class="muted">暂无详情数据</p>
    <template v-else>
      <div class="fn-toolbar">
        <button v-if="!editing" type="button" class="btn btn-secondary" :disabled="!perm.canUpdate()" @click="startEdit">
          编辑
        </button>
        <template v-else>
          <button type="button" class="btn btn-primary" :disabled="saving" @click="save">保存</button>
          <button type="button" class="btn btn-secondary" :disabled="saving" @click="cancel">取消</button>
        </template>
      </div>

      <h4 class="fn-h">基本配置</h4>
      <div class="fn-grid">
        <label class="field">
          <span>默认通知对象 *</span>
          <select
            v-model="form.noticeIds"
            class="fc-input fn-default-notice-select"
            multiple
            size="4"
            :disabled="!editing"
          >
            <option v-for="n in notices" :key="n.uuid" :value="n.uuid">{{ n.name }} ({{ n.uuid }})</option>
          </select>
        </label>
        <div class="fn-row3">
          <label class="field">
            <span>重复通知 P0（分钟）*</span>
            <input v-model.number="form.r0" class="fc-input" type="number" min="1" :disabled="!editing" />
          </label>
          <label class="field">
            <span>重复通知 P1（分钟）*</span>
            <input v-model.number="form.r1" class="fc-input" type="number" min="1" :disabled="!editing" />
          </label>
          <label class="field">
            <span>重复通知 P2（分钟）*</span>
            <input v-model.number="form.r2" class="fc-input" type="number" min="1" :disabled="!editing" />
          </label>
        </div>
        <label class="field">
          <span>恢复等待 recoverWaitTime（秒）*</span>
          <input v-model.number="form.recoverWaitTime" class="fc-input" type="number" min="1" :disabled="!editing" />
        </label>
        <label class="field inline">
          <input v-model="form.recoverNotify" type="checkbox" :disabled="!editing" />
          恢复时通知 recoverNotify
        </label>
      </div>

      <h4 class="fn-h">告警路由</h4>
      <p class="muted small">每条路由至少一个 label（key/value 非空）且 noticeIds 非空。</p>
      <div v-for="(rt, ri) in routeRows" :key="ri" class="fn-route">
        <div class="fn-route-h">
          <span>路由 #{{ ri + 1 }}</span>
          <button v-if="editing" type="button" class="btn btn-text sm" @click="removeRoute(ri)">删除</button>
        </div>
        <label class="field">
          <span>通知对象 uuid（逗号分隔）</span>
          <input
            v-model="rt.noticeIdsStr"
            class="fc-input fn-route-notice-input"
            type="text"
            :disabled="!editing"
          />
        </label>
        <div v-for="(lb, li) in rt.labels" :key="li" class="fn-labels">
          <input v-model="lb.key" class="fc-input" placeholder="key" :disabled="!editing" />
          <select v-model="lb.operator" class="fc-input" :disabled="!editing">
            <option value="=">=</option>
            <option value="=~">=~</option>
            <option value="!=">!=</option>
            <option value="!~">!~</option>
          </select>
          <input v-model="lb.value" class="fc-input" placeholder="value" :disabled="!editing" />
          <button v-if="editing" type="button" class="btn btn-text sm" @click="removeLabel(ri, li)">删条件</button>
        </div>
        <button v-if="editing" type="button" class="btn btn-text sm" @click="addLabel(ri)">添加条件</button>
      </div>
      <button v-if="editing" type="button" class="btn btn-secondary sm" @click="addRoute">添加路由</button>
    </template>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { noticeList } from '@/api/notice'
import { faultCenterUpdate } from '@/api/faultcenter'
import { useFaultCenterPerm } from '@/composables/useFaultCenterPerm'

const props = defineProps({
  centerId: { type: String, required: true },
  detail: { type: Object, default: null }
})

const emit = defineEmits(['updated'])

const perm = useFaultCenterPerm()
const tabError = ref('')
const editing = ref(false)
const saving = ref(false)
const notices = ref([])

/** @type {import('vue').Ref<{ uuid: string, name: string }[]>} */

const form = ref({
  noticeIds: /** @type {string[]} */ ([]),
  r0: 60,
  r1: 120,
  r2: 360,
  recoverWaitTime: 30,
  recoverNotify: true
})

/** @type {import('vue').Ref<{ noticeIdsStr: string, labels: { key: string, operator: string, value: string }[] }[]>} */
const routeRows = ref([])

function normalizeRepeat(raw) {
  if (raw == null) return { 0: 60, 1: 120, 2: 360 }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return { 0: raw, 1: raw, 2: raw }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return {
      0: Number(raw['0'] ?? raw.P0 ?? 60) || 60,
      1: Number(raw['1'] ?? raw.P1 ?? 120) || 120,
      2: Number(raw['2'] ?? raw.P2 ?? 360) || 360
    }
  }
  return { 0: 60, 1: 120, 2: 360 }
}

function normalizeRoutesFromDetail(nr) {
  const list = Array.isArray(nr) ? nr : []
  return list.map((item) => {
    let labels = []
    if (Array.isArray(item.labels) && item.labels.length) {
      labels = item.labels.map((l) => ({
        key: String(l.key ?? ''),
        operator: String(l.operator ?? '='),
        value: String(l.value ?? '')
      }))
    } else if (item.key != null || item.value != null) {
      labels = [
        {
          key: String(item.key ?? ''),
          operator: String(item.operator ?? '='),
          value: String(item.value ?? '')
        }
      ]
    }
    if (labels.length === 0) labels = [{ key: '', operator: '=', value: '' }]
    const ids = Array.isArray(item.noticeIds) ? item.noticeIds : []
    return {
      noticeIdsStr: ids.join(', '),
      labels
    }
  })
}

function hydrate() {
  const d = props.detail
  if (!d) return
  const r = normalizeRepeat(d.repeatNoticeInterval)
  form.value = {
    noticeIds: Array.isArray(d.noticeIds) ? [...d.noticeIds] : [],
    r0: r[0],
    r1: r[1],
    r2: r[2],
    recoverWaitTime: Number(d.recoverWaitTime) > 0 ? Number(d.recoverWaitTime) : 1,
    recoverNotify: d.recoverNotify !== false
  }
  const rows = normalizeRoutesFromDetail(d.noticeRoutes)
  routeRows.value = rows.length ? rows : []
}

watch(
  () => props.detail,
  () => {
    if (!editing.value) hydrate()
  },
  { deep: true }
)

async function loadNotices() {
  try {
    const data = await noticeList({})
    notices.value = Array.isArray(data) ? data : []
  } catch {
    notices.value = []
  }
}

function startEdit() {
  hydrate()
  editing.value = true
  tabError.value = ''
}

function cancel() {
  editing.value = false
  hydrate()
}

function addRoute() {
  routeRows.value.push({
    noticeIdsStr: '',
    labels: [{ key: '', operator: '=', value: '' }]
  })
}

function removeRoute(i) {
  routeRows.value.splice(i, 1)
}

function addLabel(ri) {
  routeRows.value[ri].labels.push({ key: '', operator: '=', value: '' })
}

function removeLabel(ri, li) {
  routeRows.value[ri].labels.splice(li, 1)
}

function parseIds(str) {
  return String(str || '')
    .split(/[,，\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function buildNoticeRoutes() {
  return routeRows.value.map((r) => ({
    noticeIds: parseIds(r.noticeIdsStr),
    labels: (r.labels || [])
      .map((l) => ({
        key: String(l.key || '').trim(),
        operator: String(l.operator || '=').trim(),
        value: String(l.value || '').trim()
      }))
      .filter((l) => l.key && l.value)
  }))
}

/** 未填写的占位行：无通知 id 且无有效 label，保存时丢弃且不参与校验 */
function isBuiltRouteEmpty(rt) {
  return !rt.noticeIds.length && !rt.labels.length
}

function validate() {
  if (!form.value.noticeIds?.length) {
    tabError.value = '请选择默认通知对象'
    return false
  }
  const routes = buildNoticeRoutes()
  for (const rt of routes) {
    if (isBuiltRouteEmpty(rt)) continue
    if (!rt.labels.length || !rt.noticeIds.length) {
      tabError.value = '告警路由配置不完整：每条需至少一个有效 label 与通知对象'
      return false
    }
  }
  tabError.value = ''
  return true
}

async function save() {
  if (!props.detail?.id || !validate()) return
  saving.value = true
  tabError.value = ''
  try {
    const noticeRoutes = buildNoticeRoutes()
      .filter((r) => !isBuiltRouteEmpty(r))
      .map((r) => ({
        noticeIds: r.noticeIds,
        labels: r.labels
      }))
    const body = {
      ...props.detail,
      id: props.centerId,
      noticeIds: [...form.value.noticeIds],
      repeatNoticeInterval: {
        '0': Number(form.value.r0) || 60,
        '1': Number(form.value.r1) || 120,
        '2': Number(form.value.r2) || 360
      },
      recoverWaitTime: Number(form.value.recoverWaitTime) || 1,
      recoverNotify: !!form.value.recoverNotify,
      noticeRoutes,
      alarmAggregation: props.detail.alarmAggregation
    }
    await faultCenterUpdate(body)
    editing.value = false
    emit('updated')
  } catch (e) {
    tabError.value = e?.message || '保存失败'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadNotices()
  hydrate()
})
</script>

<style scoped>
.fn-tab {
  padding: 4px 0 16px;
}
.fn-toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}
.fn-h {
  margin: 16px 0 10px;
  font-size: 15px;
}
.fn-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 720px;
}
.fn-row3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
@media (max-width: 700px) {
  .fn-row3 {
    grid-template-columns: 1fr;
  }
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
}
.field.inline {
  flex-direction: row;
  align-items: center;
}
.fn-default-notice-select,
.fn-route-notice-input {
  max-width: 380px;
  width: 100%;
  align-self: flex-start;
}
.fn-route {
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  background: var(--bg-secondary, #fafafa);
}
.fn-route-h {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-weight: 600;
}
.fn-labels {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}
.btn.sm {
  padding: 6px 12px;
  font-size: 12px;
}
.muted.small {
  font-size: 12px;
}
</style>
