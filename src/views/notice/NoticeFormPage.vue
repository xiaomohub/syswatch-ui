<template>
  <div class="am-page">
    <div class="am-head">
      <h2 class="am-title">{{ isEdit ? '编辑通知对象' : '新建通知对象' }}</h2>
      <div class="am-actions">
        <button v-if="perm.canTest()" type="button" class="am-btn" @click="testOpen = true">测试发送</button>
        <RouterLink to="/alert-mgmt/notice" class="am-btn linkish">返回列表</RouterLink>
      </div>
    </div>

    <p v-if="pageError" class="am-err">{{ pageError }}</p>
    <div v-if="loading" class="am-loading"><span class="spinner" />加载中…</div>

    <form v-else class="form" @submit.prevent="onSubmit">
      <label class="field">
        <span>名称 <em class="req">*</em></span>
        <input v-model="name" class="am-input" required maxlength="200" placeholder="通知对象名称">
      </label>
      <label class="field">
        <span>值班表 dutyId（可选）</span>
        <input v-model="dutyId" class="am-input" placeholder="关联值班表 ID">
      </label>

      <div class="routes-head">
        <h3>路由</h3>
        <button v-if="isEdit ? perm.canUpdate() : perm.canCreate()" type="button" class="am-btn sm" @click="addRoute">
          添加路由
        </button>
      </div>

      <div v-for="(rt, idx) in routes" :key="idx" class="route-card">
        <div class="route-card-head">
          <span>路由 {{ idx + 1 }}</span>
          <button type="button" class="link danger" @click="removeRoute(idx)">删除本路由</button>
        </div>
        <div class="grid2">
          <label class="field">
            <span>渠道 noticeType</span>
            <select v-model="rt.noticeType" class="am-input">
              <option v-for="t in NOTICE_TYPES" :key="t" :value="t">{{ t }}</option>
            </select>
          </label>
          <label class="field">
            <span>模板 ID noticeTmplId</span>
            <input v-model="rt.noticeTmplId" class="am-input" placeholder="模板 uuid">
          </label>
        </div>
        <div class="field">
          <span>告警等级 severitys</span>
          <div class="chk-row">
            <label v-for="s in SEVERITY_OPTIONS" :key="s" class="chk">
              <input type="checkbox" :checked="rt.severitys.includes(s)" @change="toggleSev(rt, s, $event)">
              {{ s }}
            </label>
          </div>
        </div>
        <label class="field">
          <span>hook（Webhook / 飞书 / 钉钉等 URL）</span>
          <input v-model="rt.hook" class="am-input" placeholder="https://...">
        </label>
        <label class="field">
          <span>sign（钉钉等签名密钥）</span>
          <input v-model="rt.sign" class="am-input" placeholder="可选">
        </label>
        <div class="grid2">
          <label class="field">
            <span>邮件主题 subject</span>
            <input v-model="rt.subject" class="am-input" placeholder="邮件渠道使用">
          </label>
        </div>
        <label class="field">
          <span>收件人 to（逗号分隔邮箱）</span>
          <input v-model="toStr[idx]" class="am-input" placeholder="a@x.com,b@y.com" @blur="syncToCc(idx)">
        </label>
        <label class="field">
          <span>抄送 cc（逗号分隔）</span>
          <input v-model="ccStr[idx]" class="am-input" placeholder="可选" @blur="syncToCc(idx)">
        </label>
        <div class="field">
          <span>生效星期 effectiveTime.week（空 = 始终生效）</span>
          <div class="chk-row">
            <label v-for="w in WEEK_OPTIONS" :key="w" class="chk">
              <input
                type="checkbox"
                :checked="rt.effectiveTime.week.includes(w)"
                @change="toggleWeek(rt.effectiveTime, w, $event)"
              >
              {{ w }}
            </label>
          </div>
        </div>
        <div class="grid2">
          <label class="field">
            <span>开始时间（当日；与结束均为 0 表示全天）</span>
            <input v-model="startStr[idx]" type="time" class="am-input" @change="syncTime(idx, 'start')">
          </label>
          <label class="field">
            <span>结束时间</span>
            <input v-model="endStr[idx]" type="time" class="am-input" @change="syncTime(idx, 'end')">
          </label>
        </div>
      </div>

      <div class="form-actions">
        <RouterLink to="/alert-mgmt/notice" class="am-btn linkish">取消</RouterLink>
        <button
          v-if="isEdit ? perm.canUpdate() : perm.canCreate()"
          type="submit"
          class="am-btn primary"
          :disabled="saving"
        >{{ saving ? '保存中…' : '保存' }}</button>
      </div>
    </form>

    <Teleport to="body">
      <div v-if="testOpen" class="modal-overlay" @click.self="testOpen = false">
        <div class="modal-box wide">
          <h3>测试发送</h3>
          <p class="muted">不写通知记录表；用于校验 hook / 邮箱等。</p>
          <label class="field">
            <span>noticeType</span>
            <select v-model="testForm.noticeType" class="am-input">
              <option v-for="t in NOTICE_TYPES" :key="t" :value="t">{{ t }}</option>
            </select>
          </label>
          <label class="field">
            <span>hook</span>
            <input v-model="testForm.hook" class="am-input">
          </label>
          <label class="field">
            <span>sign</span>
            <input v-model="testForm.sign" class="am-input">
          </label>
          <label class="field">
            <span>邮件 subject</span>
            <input v-model="testForm.email.subject" class="am-input">
          </label>
          <label class="field">
            <span>邮件 to（逗号分隔）</span>
            <input v-model="testToStr" class="am-input">
          </label>
          <label class="field">
            <span>邮件 cc（逗号分隔）</span>
            <input v-model="testCcStr" class="am-input">
          </label>
          <p v-if="testError" class="am-err">{{ testError }}</p>
          <p v-if="testOk" class="ok">{{ testOk }}</p>
          <div class="modal-actions">
            <button type="button" class="am-btn" @click="testOpen = false">关闭</button>
            <button type="button" class="am-btn primary" :disabled="testLoading" @click="submitTest">
              {{ testLoading ? '发送中…' : '发送测试' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { noticeCreate, noticeList, noticeTest, noticeUpdate } from '@/api/notice'
import { createEmptyRoute, NOTICE_TYPES, SEVERITY_OPTIONS } from '@/utils/noticeDefaults'
import { secondsToHourMinute, toDaySeconds, WEEK_OPTIONS } from '@/utils/noticeTime'
import { useNoticePerm } from '@/composables/useNoticePerm'

const route = useRoute()
const router = useRouter()
const perm = useNoticePerm()

const isEdit = computed(() => route.name === 'NoticeEdit')
const editUuid = computed(() => (isEdit.value ? String(route.params.uuid || '') : ''))

const loading = ref(true)
const saving = ref(false)
const pageError = ref('')
const name = ref('')
const dutyId = ref('')
const routes = ref([createEmptyRoute()])
const toStr = ref([''])
const ccStr = ref([''])
const startStr = ref(['00:00'])
const endStr = ref(['00:00'])

const testOpen = ref(false)
const testLoading = ref(false)
const testError = ref('')
const testOk = ref('')
const testToStr = ref('')
const testCcStr = ref('')
const testForm = reactive({
  noticeType: 'DingDing',
  hook: '',
  sign: '',
  email: { subject: '', to: [], cc: [] }
})

function splitEmails(s) {
  return s
    .split(/[,;\s]+/)
    .map((x) => x.trim())
    .filter(Boolean)
}

function syncToCc(idx) {
  const r = routes.value[idx]
  if (!r) return
  r.to = splitEmails(toStr.value[idx] || '')
  r.cc = splitEmails(ccStr.value[idx] || '')
}

function timeStrToSeconds(s) {
  const parts = s.split(':').map((x) => parseInt(x, 10))
  const h = parts[0] ?? 0
  const m = parts[1] ?? 0
  return toDaySeconds(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0)
}

function secondsToTimeStr(sec) {
  const { hour, minute } = secondsToHourMinute(sec)
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function syncTime(idx, kind) {
  const r = routes.value[idx]
  if (!r) return
  if (kind === 'start') {
    r.effectiveTime.startTime = timeStrToSeconds(startStr.value[idx] || '00:00')
  } else {
    r.effectiveTime.endTime = timeStrToSeconds(endStr.value[idx] || '00:00')
  }
}

function toggleSev(rt, s, e) {
  const on = e.target.checked
  const set = new Set(rt.severitys)
  if (on) set.add(s)
  else set.delete(s)
  rt.severitys = [...set]
}

function toggleWeek(et, w, e) {
  const on = e.target.checked
  const set = new Set(et.week)
  if (on) set.add(w)
  else set.delete(w)
  et.week = [...set]
}

function addRoute() {
  routes.value.push(createEmptyRoute())
  toStr.value.push('')
  ccStr.value.push('')
  startStr.value.push('00:00')
  endStr.value.push('00:00')
}

function removeRoute(i) {
  if (routes.value.length <= 1) return
  routes.value.splice(i, 1)
  toStr.value.splice(i, 1)
  ccStr.value.splice(i, 1)
  startStr.value.splice(i, 1)
  endStr.value.splice(i, 1)
}

function bindRouteStrings() {
  toStr.value = routes.value.map((r) => r.to.join(','))
  ccStr.value = routes.value.map((r) => r.cc.join(','))
  startStr.value = routes.value.map((r) => secondsToTimeStr(r.effectiveTime.startTime))
  endStr.value = routes.value.map((r) => secondsToTimeStr(r.effectiveTime.endTime))
}

async function loadEdit() {
  if (!isEdit.value || !editUuid.value) return
  if (!perm.canList()) {
    pageError.value = '无列表权限，无法加载详情'
    return
  }
  const list = await noticeList()
  const row = (Array.isArray(list) ? list : []).find((x) => x.uuid === editUuid.value)
  if (!row) {
    pageError.value = '未找到该通知对象，请从列表进入'
    return
  }
  name.value = row.name
  dutyId.value = row.dutyId || ''
  routes.value = JSON.parse(JSON.stringify(row.routes?.length ? row.routes : [createEmptyRoute()]))
  bindRouteStrings()
}

async function initForm() {
  loading.value = true
  pageError.value = ''
  try {
    if (route.name === 'NoticeEdit') {
      await loadEdit()
    } else if (route.name === 'NoticeCreate') {
      if (!perm.canCreate()) pageError.value = '无创建权限'
      name.value = ''
      dutyId.value = ''
      routes.value = [createEmptyRoute()]
      bindRouteStrings()
    }
  } catch (e) {
    pageError.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

watch(() => route.fullPath, initForm, { immediate: true })

async function onSubmit() {
  pageError.value = ''
  const payloadRoutes = routes.value.map((r, i) => ({
    ...r,
    to: splitEmails(toStr.value[i] || ''),
    cc: splitEmails(ccStr.value[i] || ''),
    effectiveTime: {
      week: [...r.effectiveTime.week],
      startTime: timeStrToSeconds(startStr.value[i] || '00:00'),
      endTime: timeStrToSeconds(endStr.value[i] || '00:00')
    }
  }))

  if (!name.value.trim()) {
    pageError.value = '请填写名称'
    return
  }
  saving.value = true
  try {
    const duty = dutyId.value.trim() || null
    if (isEdit.value) {
      await noticeUpdate({
        uuid: editUuid.value,
        name: name.value.trim(),
        dutyId: duty,
        routes: payloadRoutes
      })
    } else {
      await noticeCreate({
        name: name.value.trim(),
        dutyId: duty,
        routes: payloadRoutes
      })
    }
    router.push('/alert-mgmt/notice')
  } catch (e) {
    const msg = e instanceof Error ? e.message : '保存失败'
    pageError.value = msg
    if (/配额|noticeNumber/i.test(msg)) {
      pageError.value = `${msg}（可联系管理员提升租户 noticeNumber）`
    }
  } finally {
    saving.value = false
  }
}

async function submitTest() {
  testError.value = ''
  testOk.value = ''
  testForm.email.to = splitEmails(testToStr.value)
  testForm.email.cc = splitEmails(testCcStr.value)
  testLoading.value = true
  try {
    await noticeTest({ ...testForm })
    testOk.value = '发送成功（code=200）'
  } catch (e) {
    let msg = e instanceof Error ? e.message : '失败'
    const raw = e?.raw?.data
    if (typeof raw === 'string') {
      try {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          msg = arr.map((x) => `${x.hook || ''}: ${x.error || ''}`).join('; ') || msg
        }
      } catch {
        msg = raw || msg
      }
    }
    testError.value = msg
  } finally {
    testLoading.value = false
  }
}
</script>

<style scoped>
.am-page {
  padding: 8px 0 32px;
  max-width: 900px;
}
.am-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.am-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
.am-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.am-input {
  padding: 8px 10px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  font-size: 13px;
  width: 100%;
  box-sizing: border-box;
}
.am-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-default);
  background: #fff;
  font-size: 13px;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
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
.ok {
  color: #166534;
  font-size: 13px;
}
.am-loading {
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #555;
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
.form {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
  font-size: 13px;
}
.req {
  color: #b91c1c;
}
.routes-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 8px 0 12px;
}
.routes-head h3 {
  margin: 0;
  font-size: 16px;
}
.route-card {
  border: 1px solid var(--border-default);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
  background: #fafafa;
}
.route-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
}
.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 700px) {
  .grid2 {
    grid-template-columns: 1fr;
  }
}
.chk-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
}
.chk {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}
.link {
  background: none;
  border: none;
  color: #2563eb;
  cursor: pointer;
  font-size: 13px;
}
.link.danger {
  color: #b91c1c;
}
.muted {
  color: #666;
  font-size: 13px;
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
  max-width: 100%;
}
.modal-box.wide {
  min-width: 440px;
}
.modal-box h3 {
  margin: 0 0 12px;
  font-size: 17px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
</style>
