<template>
  <Teleport to="body">
    <div v-if="open" class="nod-mask" @click.self="emitClose">
      <aside class="nod-panel" role="dialog" aria-modal="true" @click.stop>
        <header class="nod-head">
          <h2 class="nod-title">{{ variant === 'update' ? '编辑通知对象' : '创建通知对象' }}</h2>
          <button type="button" class="nod-x" aria-label="关闭" @click="emitClose">×</button>
        </header>

        <div class="nod-body">
          <p v-if="loadError" class="nod-err">{{ loadError }}</p>
          <div v-if="loading" class="nod-loading"><span class="spinner" />加载中…</div>

          <form v-else class="nod-form" @submit.prevent="handleSubmit">
            <label class="nod-field">
              <span>名称 <em class="req">*</em></span>
              <input
                :value="name"
                class="nod-input"
                maxlength="200"
                placeholder="通知对象名称"
                @keydown="onNameKeydown"
                @input="onNameInput"
              >
            </label>

            <label class="nod-field">
              <span>值班表</span>
              <select v-model="dutyId" class="nod-input" :disabled="!dutyList.length">
                <option value="">（可选）</option>
                <option v-for="d in dutyList" :key="d.id" :value="d.id">{{ d.name }}</option>
              </select>
            </label>

            <div class="nod-routes-head">
              <h3>通知路由</h3>
            </div>

            <div v-for="(rt, idx) in routes" :key="idx" class="nod-route-card">
              <button
                v-if="routes.length > 1"
                type="button"
                class="nod-route-remove"
                title="删除本条"
                aria-label="删除本条路由"
                @click="removeRoute(idx)"
              >
                −
              </button>

              <div class="nod-type-row">
                <span class="nod-label">通知类型 <em class="req">*</em></span>
                <div class="nod-type-cards">
                  <button
                    v-for="t in NOTICE_TYPE_ORDER"
                    :key="t"
                    type="button"
                    class="nod-type-card"
                    :class="{ active: rt.noticeType === t }"
                    @click="onPickType(idx, t)"
                  >
                    <span class="nod-type-name">{{ NOTICE_TYPE_LABELS[t] }}</span>
                  </button>
                </div>
              </div>

              <template v-if="rt.noticeType === 'Email'">
                <label class="nod-field">
                  <span>邮件主题 subject <em class="req">*</em></span>
                  <input v-model="rt.subject" class="nod-input" placeholder="主题">
                </label>
                <label class="nod-field">
                  <span>收件人 to <em class="req">*</em></span>
                  <input v-model="userQuery" class="nod-input sm-mb" placeholder="筛选用户（可选）">
                  <select
                    multiple
                    class="nod-multi"
                    :size="6"
                    :value="rt.to"
                    @change="onMultiChange(idx, 'to', $event)"
                  >
                    <option v-for="u in filteredUsers" :key="u.userEmail" :value="u.userEmail">
                      {{ u.userName }} · {{ u.userEmail }}
                    </option>
                  </select>
                </label>
                <label class="nod-field">
                  <span>抄送 cc（可选）</span>
                  <select
                    multiple
                    class="nod-multi"
                    :size="5"
                    :value="rt.cc"
                    @change="onMultiChange(idx, 'cc', $event)"
                  >
                    <option v-for="u in filteredUsers" :key="'c-' + u.userEmail" :value="u.userEmail">
                      {{ u.userName }} · {{ u.userEmail }}
                    </option>
                  </select>
                </label>
              </template>

              <template v-else>
                <label class="nod-field">
                  <span>hook <em class="req">*</em></span>
                  <input v-model="rt.hook" class="nod-input" placeholder="https://...">
                </label>
                <label v-if="rt.noticeType === 'FeiShu' || rt.noticeType === 'DingDing'" class="nod-field">
                  <span>签名 sign（可选）</span>
                  <input v-model="rt.sign" class="nod-input" placeholder="签名密钥">
                </label>
              </template>

              <label v-if="rt.noticeType !== 'WebHook'" class="nod-field">
                <span>通知模板 <em class="req">*</em></span>
                <select
                  v-model="rt.noticeTmplId"
                  class="nod-input"
                  @focus="onTmplFocus(rt)"
                >
                  <option value="" disabled>请选择模板</option>
                  <option v-for="opt in tmplOptions(rt.noticeType)" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </label>

              <div class="nod-field">
                <span>适用级别 severitys <em class="req">*</em>（至少选一个）</span>
                <div class="nod-chk-row">
                  <label v-for="s in SEVERITY_OPTIONS" :key="s" class="nod-chk">
                    <input type="checkbox" :checked="rt.severitys.includes(s)" @change="toggleSev(rt, s, $event)">
                    {{ s === 'P0' ? 'P0 紧急' : s === 'P1' ? 'P1 重要' : 'P2 一般' }}
                  </label>
                </div>
              </div>

              <div class="nod-field">
                <span>生效时间（星期全不选表示全天候；开始/结束为当日从 0 点起的时刻）</span>
                <div class="nod-chk-row nod-week-row">
                  <label v-for="w in WEEK_OPTIONS" :key="w" class="nod-chk">
                    <input
                      type="checkbox"
                      :checked="rt.effectiveTime.week.includes(w)"
                      @change="toggleWeek(rt.effectiveTime, w, $event)"
                    >
                    {{ WEEK_LABELS[w] }}
                  </label>
                </div>
                <div class="nod-time-row">
                  <span class="nod-time-block">
                    <span class="nod-time-caption">开始</span>
                    <select
                      class="nod-input nod-time-select"
                      :value="secondsToHourMinute(rt.effectiveTime.startTime).hour"
                      @change="setStartHour(idx, +$event.target.value)"
                    >
                      <option v-for="h in HOUR_OPTS" :key="'sh-' + h" :value="h">{{ String(h).padStart(2, '0') }} 时</option>
                    </select>
                    <select
                      class="nod-input nod-time-select"
                      :value="secondsToHourMinute(rt.effectiveTime.startTime).minute"
                      @change="setStartMinute(idx, +$event.target.value)"
                    >
                      <option v-for="m in MINUTE_OPTS" :key="'sm-' + m" :value="m">{{ String(m).padStart(2, '0') }} 分</option>
                    </select>
                  </span>
                  <span class="nod-time-sep">至</span>
                  <span class="nod-time-block">
                    <span class="nod-time-caption">结束</span>
                    <select
                      class="nod-input nod-time-select"
                      :value="secondsToHourMinute(rt.effectiveTime.endTime).hour"
                      @change="setEndHour(idx, +$event.target.value)"
                    >
                      <option v-for="h in HOUR_OPTS" :key="'eh-' + h" :value="h">{{ String(h).padStart(2, '0') }} 时</option>
                    </select>
                    <select
                      class="nod-input nod-time-select"
                      :value="secondsToHourMinute(rt.effectiveTime.endTime).minute"
                      @change="setEndMinute(idx, +$event.target.value)"
                    >
                      <option v-for="m in MINUTE_OPTS" :key="'em-' + m" :value="m">{{ String(m).padStart(2, '0') }} 分</option>
                    </select>
                  </span>
                </div>
              </div>

              <div class="nod-test-row">
                <button type="button" class="nod-btn" :disabled="testLoadingIdx === idx" @click="runTest(idx)">
                  {{ testLoadingIdx === idx ? '发送中…' : '通知测试' }}
                </button>
              </div>
            </div>

            <button type="button" class="nod-add dashed" @click="addRoute">+ 添加策略</button>

            <p v-if="formError" class="nod-err">{{ formError }}</p>
          </form>
        </div>

        <footer class="nod-foot">
          <button type="button" class="nod-btn primary" :disabled="submitLoading || loading" @click="handleSubmit">
            {{ submitLoading ? '提交中…' : '提交' }}
          </button>
        </footer>
      </aside>
    </div>
  </Teleport>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { getDutyManagerList } from '@/api/duty'
import { getNoticeTmplList } from '@/api/noticeTmpl'
import { getUserList } from '@/api/user'
import { noticeCreate, noticeTest, noticeUpdate } from '@/api/notice'
import { NOTICE_TYPE_LABELS, NOTICE_TYPE_ORDER } from './noticeTypes.js'
import { WEEK_LABELS, WEEK_OPTIONS, defaultRoute, rowToRoutes } from './noticeObjectFormUtils'
import { secondsToHourMinute, toDaySeconds } from '@/utils/noticeTime'
import { SEVERITY_OPTIONS } from '@/utils/noticeDefaults'

const HOUR_OPTS = Array.from({ length: 24 }, (_, i) => i)
const MINUTE_OPTS = Array.from({ length: 60 }, (_, i) => i)

const props = defineProps({
  open: { type: Boolean, default: false },
  /** 'create' | 'update' */
  variant: { type: String, default: 'create' },
  /** 编辑时的行；创建时若传入则为复制源 */
  record: { type: Object, default: null }
})

const emit = defineEmits(['close', 'success', 'toast'])

const loading = ref(false)
const loadError = ref('')
const submitLoading = ref(false)
const formError = ref('')
const testLoadingIdx = ref(-1)

const name = ref('')
const dutyId = ref('')
const dutyList = ref([])
const userList = ref([])
const userQuery = ref('')
const routes = ref([])

const templateCache = reactive({})

function tmplOptions(noticeType) {
  const key = noticeType || '__all__'
  return templateCache[key] || []
}

async function ensureTemplates(noticeType) {
  const key = noticeType === undefined || noticeType === null || noticeType === '' ? '__all__' : String(noticeType)
  if (templateCache[key]?.length) return
  const params = key === '__all__' ? {} : { noticeType }
  const list = await getNoticeTmplList(params)
  templateCache[key] = (list || []).map((t) => ({
    label: t.name ?? t.templateName ?? String(t.id ?? t.uuid ?? ''),
    value: t.id ?? t.uuid ?? ''
  }))
}

function emitClose() {
  emit('close')
}

function reset() {
  loadError.value = ''
  formError.value = ''
  name.value = ''
  dutyId.value = ''
  routes.value = []
  Object.keys(templateCache).forEach((k) => delete templateCache[k])
}

const filteredUsers = ref([])

watch(
  [userList, userQuery],
  () => {
    const q = userQuery.value.trim().toLowerCase()
    filteredUsers.value = userList.value.filter((u) => {
      const name = String(u.userName || '').toLowerCase()
      const mail = String(u.userEmail || '').toLowerCase()
      return !q || name.includes(q) || mail.includes(q)
    })
  },
  { immediate: true }
)

async function loadWhenOpen() {
  if (!props.open) return
  Object.keys(templateCache).forEach((k) => delete templateCache[k])
  loading.value = true
  loadError.value = ''
  try {
    const [duties, users] = await Promise.all([
      getDutyManagerList(),
      getUserList({ joinDuty: 'true' })
    ])
    dutyList.value = duties
    userList.value = users

    if (props.variant === 'update' && props.record) {
      name.value = props.record.name || ''
      dutyId.value = props.record.dutyId ? String(props.record.dutyId) : ''
      routes.value = rowToRoutes(props.record)
    } else if (props.variant === 'create' && props.record) {
      const copy = JSON.parse(JSON.stringify(props.record))
      name.value = copy.name || ''
      dutyId.value = copy.dutyId ? String(copy.dutyId) : ''
      routes.value = rowToRoutes(copy)
    } else {
      name.value = ''
      dutyId.value = ''
      routes.value = [defaultRoute()]
    }
    const types = new Set(routes.value.map((r) => r.noticeType))
    await Promise.all([ensureTemplates(undefined), ...[...types].map((t) => ensureTemplates(t))])
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.open, props.variant, props.record],
  () => {
    if (!props.open) {
      reset()
      return
    }
    loadWhenOpen()
  },
  { flush: 'post' }
)

function onNameKeydown(e) {
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault()
  }
}

function onNameInput(e) {
  name.value = e.target.value.replace(/\s/g, '')
}

function onPickType(idx, t) {
  const rt = routes.value[idx]
  if (!rt) return
  rt.noticeType = t
  rt.noticeTmplId = ''
  ensureTemplates(t)
}

async function onTmplFocus(rt) {
  await ensureTemplates(rt.noticeType)
}

function toggleSev(rt, s, e) {
  const on = e.target.checked
  const set = new Set(rt.severitys)
  if (on) set.add(s)
  else set.delete(s)
  rt.severitys = [...set]
}

function onMultiChange(idx, field, e) {
  const rt = routes.value[idx]
  if (!rt) return
  const vals = [...e.target.selectedOptions].map((o) => o.value)
  rt[field] = vals
}

function toggleWeek(et, w, e) {
  const on = e.target.checked
  const set = new Set(et.week)
  if (on) set.add(w)
  else set.delete(w)
  et.week = WEEK_OPTIONS.filter((d) => set.has(d))
}

function setStartHour(idx, h) {
  const rt = routes.value[idx]
  if (!rt) return
  const { minute } = secondsToHourMinute(rt.effectiveTime.startTime)
  rt.effectiveTime.startTime = toDaySeconds(h, minute)
}

function setStartMinute(idx, m) {
  const rt = routes.value[idx]
  if (!rt) return
  const { hour } = secondsToHourMinute(rt.effectiveTime.startTime)
  rt.effectiveTime.startTime = toDaySeconds(hour, m)
}

function setEndHour(idx, h) {
  const rt = routes.value[idx]
  if (!rt) return
  const { minute } = secondsToHourMinute(rt.effectiveTime.endTime)
  rt.effectiveTime.endTime = toDaySeconds(h, minute)
}

function setEndMinute(idx, m) {
  const rt = routes.value[idx]
  if (!rt) return
  const { hour } = secondsToHourMinute(rt.effectiveTime.endTime)
  rt.effectiveTime.endTime = toDaySeconds(hour, m)
}

function addRoute() {
  routes.value.push(defaultRoute())
  ensureTemplates('FeiShu')
}

function removeRoute(i) {
  if (routes.value.length <= 1) return
  routes.value.splice(i, 1)
}

const HOOK_RE = /^(http|https):\/\//

function validate() {
  formError.value = ''
  if (!name.value.trim()) {
    formError.value = '请填写名称'
    return false
  }
  for (let i = 0; i < routes.value.length; i++) {
    const r = routes.value[i]
    if (!r.severitys?.length) {
      formError.value = `路由 ${i + 1}：请至少选择一个适用级别`
      return false
    }
    if (r.noticeType === 'Email') {
      if (!String(r.subject || '').trim()) {
        formError.value = `路由 ${i + 1}：请填写邮件主题`
        return false
      }
      if (!r.to?.length) {
        formError.value = `路由 ${i + 1}：请选择收件人`
        return false
      }
    } else if (r.noticeType !== 'WebHook') {
      if (!String(r.hook || '').trim() || !HOOK_RE.test(String(r.hook || '').trim())) {
        formError.value = `路由 ${i + 1}：hook 必须以 http:// 或 https:// 开头`
        return false
      }
      if (!String(r.noticeTmplId || '').trim()) {
        formError.value = `路由 ${i + 1}：请选择通知模板`
        return false
      }
    } else {
      if (!String(r.hook || '').trim() || !HOOK_RE.test(String(r.hook || '').trim())) {
        formError.value = `路由 ${i + 1}：hook 必须以 http:// 或 https:// 开头`
        return false
      }
    }
  }
  return true
}

function buildRoutesPayload() {
  return routes.value.map((r) => {
    const base = {
      noticeType: r.noticeType,
      severitys: [...r.severitys],
      hook: r.hook,
      sign: r.sign || '',
      subject: r.subject,
      to: [...(r.to || [])],
      cc: [...(r.cc || [])],
      effectiveTime: {
        week: [...r.effectiveTime.week],
        startTime: r.effectiveTime.startTime,
        endTime: r.effectiveTime.endTime
      }
    }
    if (r.noticeType !== 'WebHook') {
      base.noticeTmplId = r.noticeTmplId
    }
    return base
  })
}

async function handleSubmit() {
  if (!validate()) return
  submitLoading.value = true
  formError.value = ''
  try {
    const bodyRoutes = buildRoutesPayload()
    const duty = dutyId.value.trim() || null
    if (props.variant === 'update' && props.record?.uuid) {
      await noticeUpdate({
        uuid: props.record.uuid,
        tenantId: props.record.tenantId || 'default',
        updateBy: 'current_user',
        name: name.value.trim(),
        dutyId: duty,
        routes: bodyRoutes
      })
      emit('toast', { message: '通知对象更新成功', type: 'success' })
    } else {
      await noticeCreate({
        tenantId: 'default',
        name: name.value.trim(),
        dutyId: duty,
        routes: bodyRoutes
      })
      emit('toast', { message: '通知对象创建成功', type: 'success' })
    }
    emit('success')
    emitClose()
  } catch (e) {
    formError.value = e instanceof Error ? e.message : '提交失败'
  } finally {
    submitLoading.value = false
  }
}

async function runTest(idx) {
  const rt = routes.value[idx]
  if (!rt) return
  testLoadingIdx.value = idx
  formError.value = ''
  try {
    await noticeTest({
      noticeType: rt.noticeType,
      hook: rt.hook || '',
      sign: rt.sign || '',
      email: {
        subject: rt.subject || '',
        to: rt.to || [],
        cc: rt.cc || []
      }
    })
    emit('toast', { message: '测试消息发送成功!', type: 'success' })
  } catch (e) {
    formError.value = e instanceof Error ? e.message : '测试失败'
  } finally {
    testLoadingIdx.value = -1
  }
}
</script>

<style scoped>
.nod-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  z-index: 1100;
  display: flex;
  justify-content: flex-end;
}
.nod-panel {
  width: min(1080px, 100vw);
  max-width: 100vw;
  height: 100%;
  background: var(--bg-surface, #fff);
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
}
.nod-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 28px;
  border-bottom: 1px solid var(--border-default, #e5e7eb);
}
.nod-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text-primary, #0f172a);
}
.nod-x {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  border: none;
  background: none;
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.18s ease,
    color 0.18s ease,
    transform 0.12s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.nod-x:hover {
  background: #f1f5f9;
  color: #0f172a;
}
.nod-x:active {
  transform: scale(0.94);
}
.nod-body {
  flex: 1;
  overflow: auto;
  padding: 20px 28px 24px;
}
.nod-foot {
  padding: 20px 28px 22px;
  border-top: 1px solid var(--border-default, #e5e7eb);
  display: flex;
  justify-content: flex-end;
  background: linear-gradient(180deg, #fafbfc 0%, #f4f6f8 100%);
}
.nod-loading {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 0;
  color: #64748b;
  font-size: 15px;
}
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e7eb;
  border-top-color: #334155;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.nod-form {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.nod-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 18px;
  font-size: 15px;
  color: var(--text-primary, #334155);
}
.nod-label {
  display: block;
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #334155;
}
.req {
  color: #b91c1c;
}
.nod-input {
  padding: 12px 16px;
  border: 1px solid var(--border-default, #e5e7eb);
  border-radius: 14px;
  font-size: 15px;
  line-height: 1.45;
  width: 100%;
  box-sizing: border-box;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}
.nod-input:hover:not(:disabled) {
  border-color: #cbd5e1;
}
.nod-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}
select.nod-input {
  cursor: pointer;
}
.sm-mb {
  margin-bottom: 8px;
}
.nod-multi {
  width: 100%;
  min-height: 140px;
  border: 1px solid var(--border-default, #e5e7eb);
  border-radius: 14px;
  padding: 10px 12px;
  font-size: 14px;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}
.nod-multi:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}
.nod-routes-head h3 {
  margin: 12px 0 14px;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #0f172a;
}
.nod-route-card {
  position: relative;
  border: 1px solid var(--border-default, #e5e7eb);
  border-radius: 16px;
  padding: 22px 20px 18px;
  margin-bottom: 18px;
  background: linear-gradient(180deg, #fafbfc 0%, #f8fafc 100%);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}
.nod-route-remove {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease,
    transform 0.12s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.nod-route-remove:hover {
  background: #fef2f2;
  border-color: #fecaca;
  color: #b91c1c;
}
.nod-route-remove:active {
  transform: scale(0.94);
}
.nod-type-row {
  margin-bottom: 14px;
}
.nod-type-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}
.nod-type-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 10px 16px;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #475569;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    transform 0.12s ease,
    box-shadow 0.18s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.nod-type-card:hover:not(.active) {
  border-color: #93c5fd;
  background: #f8fafc;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
}
.nod-type-card:active:not(.active) {
  transform: scale(0.98);
}
.nod-type-card.active {
  border-color: #1d4ed8;
  background: #eff6ff;
  color: #1e40af;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(29, 78, 216, 0.15);
}
.nod-type-name {
  pointer-events: none;
}
.nod-chk-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 22px;
}
.nod-chk {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  cursor: pointer;
}
.nod-chk input[type='checkbox'] {
  width: 18px;
  height: 18px;
  accent-color: #1d4ed8;
  cursor: pointer;
}
.nod-week-row {
  margin-top: 6px;
}
.nod-time-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 18px;
  margin-top: 12px;
  align-items: flex-end;
}
.nod-time-block {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.nod-time-caption {
  font-size: 15px;
  color: #475569;
  min-width: 2em;
  font-weight: 500;
}
.nod-time-sep {
  font-size: 15px;
  color: #64748b;
  padding: 0 4px 10px;
  align-self: flex-end;
}
.nod-time-select {
  width: auto;
  min-width: 5.5rem;
}
.nod-test-row {
  margin-top: 12px;
}
.nod-add.dashed {
  width: 100%;
  margin: 8px 0 18px;
  padding: 14px 16px;
  border: 2px dashed #cbd5e1;
  border-radius: 14px;
  background: #fff;
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
  color: #475569;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    transform 0.12s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.nod-add.dashed:hover {
  border-color: #93c5fd;
  background: #f8fafc;
  color: #1d4ed8;
}
.nod-add.dashed:active {
  transform: scale(0.995);
}
.nod-btn {
  padding: 11px 20px;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  color: #475569;
  transition:
    transform 0.14s ease,
    box-shadow 0.18s ease,
    background 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.nod-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.35);
}
.nod-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.1);
  border-color: #cbd5e1;
  background: #f1f5f9;
  color: #334155;
}
.nod-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
}
.nod-btn.primary {
  background: #1d4ed8;
  color: #fff;
  border-color: #1d4ed8;
}
.nod-btn.primary:hover:not(:disabled) {
  background: #1e40af;
  border-color: #1e40af;
  box-shadow: 0 8px 20px rgba(29, 78, 216, 0.35);
  color: #fff;
}
.nod-btn.primary:active:not(:disabled) {
  background: #1e3a8a;
  border-color: #1e3a8a;
}
.nod-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
.nod-err {
  color: #b91c1c;
  font-size: 14px;
  margin: 10px 0 0;
  padding: 10px 14px;
  border-radius: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
}
</style>
