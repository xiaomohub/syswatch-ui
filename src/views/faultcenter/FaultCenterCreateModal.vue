<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-overlay"
      role="presentation"
      @click.self="emitClose"
    >
      <div
        class="modal detail-modal fc-create-modal"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @click.stop
      >
        <div class="modal-hd">
          <h3 :id="titleId">新建故障中心</h3>
          <button type="button" class="icon-close" aria-label="关闭" @click="emitClose">×</button>
        </div>

        <div class="modal-bd fc-create-modal-bd">
          <p v-if="formError" class="fc-page-error" style="margin-top: 0">{{ formError }}</p>

          <p class="muted small" style="margin: 0 0 12px">
            提交 <code>faultCenterCreate</code>；<code>tenantId</code> 由服务端注入。默认通知对象与标签路由至少配置一种。
          </p>

          <div class="fc-form-section">
            <h4 class="fc-form-h">基础配置</h4>
            <label class="field">
              <span>名称 *（不可含空格）</span>
              <input v-model="form.name" class="fc-input" type="text" @keydown="onNameKeydown" />
            </label>
            <label class="field"><span>描述</span><textarea v-model="form.description" class="fc-textarea" rows="2" /></label>
          </div>

          <div class="fc-form-section">
            <h4 class="fc-form-h">通知策略</h4>
            <p class="muted small" style="margin: 0 0 10px">
              创建时固定：<code>aggregationType: Rule</code>，<code>recoverNotify: true</code>。
            </p>
            <div class="field">
              <span>默认通知对象 *（多选，从通知列表选择）</span>
              <div class="fc-notice-dd">
                <details class="fc-notice-dd-details">
                  <summary class="fc-notice-dd-summary fc-input">
                    <span class="fc-notice-dd-summary-text">{{ noticeSelectionSummary }}</span>
                    <span class="fc-notice-dd-caret" aria-hidden="true">▾</span>
                  </summary>
                  <div class="fc-notice-dd-panel" @click.stop>
                    <input
                      v-model="noticeFilter"
                      class="fc-input fc-notice-dd-filter"
                      type="search"
                      placeholder="筛选名称或 UUID…"
                      autocomplete="off"
                    />
                    <p v-if="noticesLoading" class="muted small fc-notice-dd-hint">加载通知列表中…</p>
                    <p v-else-if="!notices.length" class="muted small fc-notice-dd-hint">暂无通知对象，请先在通知管理中创建。</p>
                    <ul v-else class="fc-notice-dd-list">
                      <li v-for="n in filteredNotices" :key="n.uuid" class="fc-notice-dd-item">
                        <label class="fc-notice-dd-label">
                          <input
                            type="checkbox"
                            :checked="isNoticeSelected(n.uuid)"
                            @change="onNoticeCheckboxChange(n.uuid, $event)"
                          />
                          <span class="fc-notice-dd-name">{{ n.name }}</span>
                          <span class="fc-notice-dd-uuid muted small">{{ n.uuid }}</span>
                        </label>
                      </li>
                      <li v-if="filteredNotices.length === 0 && notices.length" class="muted small fc-notice-dd-hint">无匹配项</li>
                    </ul>
                  </div>
                </details>
              </div>
            </div>
          </div>

          <div class="fc-form-section">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px">
              <h4 class="fc-form-h" style="margin: 0">标签通知路由 noticeRoutes</h4>
              <button type="button" class="btn btn-secondary" style="padding: 8px 12px" @click="addNoticeRoute">添加标签路由</button>
            </div>
            <p class="muted small">每项含 <code>labels</code>（key / value / operator）与 <code>noticeIds</code>。</p>

            <div v-for="(nr, ri) in noticeRouteRows" :key="ri" class="fc-route-card">
              <div class="fc-route-card-h">
                <span>路由 #{{ ri + 1 }}</span>
                <button type="button" class="btn btn-text" style="font-size: 12px" @click="removeNoticeRoute(ri)">删除本条</button>
              </div>
              <label class="field">
                <span>本路由通知 ID</span>
                <input v-model="nr.noticeIdsStr" class="fc-input" type="text" placeholder="notice-pay, notice-sre" />
              </label>
              <div style="margin-top: 8px">
                <button type="button" class="btn btn-text" style="font-size: 12px; margin-bottom: 8px" @click="addLabelRow(ri)">
                  添加 label 条件
                </button>
                <div v-for="(lb, li) in nr.labels" :key="li" class="fc-label-row">
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

          <div class="fc-form-section fc-form-row2">
            <label class="field">
              <span>重复通知 P0（分钟）*</span>
              <input v-model.number="form.repeatP0" class="fc-input" type="number" min="1" />
            </label>
            <label class="field">
              <span>重复通知 P1（分钟）*</span>
              <input v-model.number="form.repeatP1" class="fc-input" type="number" min="1" />
            </label>
            <label class="field">
              <span>重复通知 P2（分钟）*</span>
              <input v-model.number="form.repeatP2" class="fc-input" type="number" min="1" />
            </label>
            <label class="field">
              <span>恢复等待 recoverWaitTime（秒）*</span>
              <input v-model.number="form.recoverWaitTime" class="fc-input" type="number" min="0" />
            </label>
          </div>
        </div>

        <div class="modal-ft">
          <button type="button" class="btn btn-secondary" :disabled="formSubmitting" @click="emitClose">取消</button>
          <button type="button" class="btn btn-primary" :disabled="formSubmitting || !perm.canCreate()" @click="submitForm">
            {{ formSubmitting ? '提交中…' : '创建' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { unwrapW8t, faultCenterCreate } from '@/api/faultcenter'
import { noticeList } from '@/api/notice'
import { useFaultCenterPerm } from '@/composables/useFaultCenterPerm'
import { useFaultCenterContextStore } from '@/store/faultCenterContext'
import './faultCenterCommon.css'

const props = defineProps({
  open: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'created'])

const perm = useFaultCenterPerm()
const fcContext = useFaultCenterContextStore()

const titleId = 'fc-create-modal-title'
const formError = ref('')
const formSubmitting = ref(false)
const notices = ref(/** @type {{ uuid: string, name: string }[]} */ ([]))
const noticesLoading = ref(false)
const noticeFilter = ref('')

const form = ref({
  name: '',
  description: '',
  noticeIds: /** @type {string[]} */ ([]),
  repeatP0: 60,
  repeatP1: 60,
  repeatP2: 60,
  recoverWaitTime: 30
})

const filteredNotices = computed(() => {
  const q = String(noticeFilter.value || '')
    .trim()
    .toLowerCase()
  if (!q) return notices.value
  return notices.value.filter((n) => {
    const name = String(n.name || '').toLowerCase()
    const id = String(n.uuid || '').toLowerCase()
    return name.includes(q) || id.includes(q)
  })
})

const noticeSelectionSummary = computed(() => {
  const ids = form.value.noticeIds || []
  if (ids.length === 0) return '点击展开，从通知列表多选…'
  const labels = ids.map((id) => notices.value.find((n) => n.uuid === id)?.name || id)
  if (labels.length <= 2) return labels.join('、')
  return `已选 ${ids.length} 个通知对象`
})

function isNoticeSelected(uuid) {
  return (form.value.noticeIds || []).includes(uuid)
}

/** @param {string} uuid @param {Event} ev */
function onNoticeCheckboxChange(uuid, ev) {
  const t = ev.target
  const checked = t instanceof HTMLInputElement ? t.checked : false
  const cur = new Set(form.value.noticeIds || [])
  if (checked) cur.add(uuid)
  else cur.delete(uuid)
  form.value.noticeIds = [...cur]
}

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

function onNameKeydown(e) {
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault()
  }
}

async function loadNotices() {
  noticesLoading.value = true
  try {
    const data = await noticeList({})
    notices.value = Array.isArray(data) ? data : []
  } catch {
    notices.value = []
  } finally {
    noticesLoading.value = false
  }
}

function resetFormForCreate() {
  form.value = {
    name: '',
    description: '',
    noticeIds: [],
    repeatP0: 60,
    repeatP1: 60,
    repeatP2: 60,
    recoverWaitTime: 30
  }
  noticeRouteRows.value = []
  noticeFilter.value = ''
}

function buildBodyFromForm() {
  const f = form.value
  const repeatNoticeInterval = {
    '0': Number(f.repeatP0) || 60,
    '1': Number(f.repeatP1) || 60,
    '2': Number(f.repeatP2) || 60
  }
  const noticeRoutes = rowsToNoticeRoutes()
  return {
    name: f.name.trim(),
    description: f.description || '',
    noticeIds: Array.isArray(f.noticeIds) ? [...f.noticeIds] : [],
    noticeRoutes,
    repeatNoticeInterval,
    recoverNotify: true,
    aggregationType: 'Rule',
    recoverWaitTime: Number(f.recoverWaitTime) || 0,
    isUpgradeEnabled: false,
    upgradableSeverity: [],
    upgradeStrategy: {
      enabled: false,
      timeout: 0,
      repeatInterval: 0,
      noticeId: ''
    }
  }
}

/** @param {unknown} data */
function extractCreatedId(data) {
  if (data == null) return ''
  if (typeof data === 'string') return data.trim()
  if (typeof data === 'object' && data && 'id' in data && data.id != null) return String(data.id).trim()
  return ''
}

async function submitForm() {
  formError.value = ''
  if (!form.value.name?.trim()) {
    formError.value = '名称不能为空'
    return
  }
  const ids = form.value.noticeIds || []
  const routes = rowsToNoticeRoutes()
  if (ids.length === 0 && routes.length === 0) {
    formError.value = '请至少配置默认通知对象或一条标签路由'
    return
  }
  if (!perm.canCreate()) {
    formError.value = '未授权创建接口'
    return
  }
  formSubmitting.value = true
  try {
    const body = buildBodyFromForm()
    const raw = unwrapW8t(await faultCenterCreate(body))
    const newId = extractCreatedId(raw)
    try {
      await fcContext.loadCenters()
    } catch {
      /* 列表刷新失败不阻断 */
    }
    emit('created', { id: newId })
    emit('close')
  } catch (e) {
    formError.value = e?.message || '保存失败'
  } finally {
    formSubmitting.value = false
  }
}

function emitClose() {
  if (formSubmitting.value) return
  emit('close')
}

watch(
  () => props.open,
  async (on) => {
    if (!on) return
    formError.value = ''
    resetFormForCreate()
    await loadNotices()
  }
)
</script>

<style scoped>
.fc-create-modal-bd {
  max-height: min(72vh, 640px);
}
.fc-notice-dd {
  max-width: 420px;
  width: 100%;
  align-self: flex-start;
}
.fc-notice-dd-details {
  position: relative;
}
.fc-notice-dd-summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 42px;
  user-select: none;
}
.fc-notice-dd-summary::-webkit-details-marker {
  display: none;
}
.fc-notice-dd-summary-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}
.fc-notice-dd-caret {
  flex-shrink: 0;
  opacity: 0.65;
  font-size: 12px;
}
.fc-notice-dd-panel {
  margin-top: 6px;
  padding: 10px;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  background: var(--bg-card);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  max-height: 240px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 2;
}
.fc-notice-dd-filter {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.fc-notice-dd-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow: auto;
  flex: 1;
  min-height: 0;
}
.fc-notice-dd-item {
  margin: 0;
}
.fc-notice-dd-label {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 4px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
}
.fc-notice-dd-label:hover {
  background: var(--bg-subtle);
}
.fc-notice-dd-label input {
  margin-top: 3px;
  flex-shrink: 0;
}
.fc-notice-dd-name {
  font-weight: 500;
  color: var(--text-primary);
}
.fc-notice-dd-uuid {
  margin-left: auto;
  max-width: 46%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fc-notice-dd-hint {
  margin: 4px 0;
}
</style>
