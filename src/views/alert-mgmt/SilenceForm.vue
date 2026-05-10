<template>
  <div class="silence-form">
    <p class="silence-hint">
      多条标签条件为 <strong>且</strong> 关系；告警 labels 中对应键的值需为字符串，否则可能无法匹配。
    </p>

    <label class="field">
      <span>名称 <span class="req">*</span></span>
      <input v-model="form.name" class="am-input" type="text" placeholder="如：维护窗口屏蔽" />
    </label>

    <div class="field">
      <span>标签匹配 <span class="req">*</span></span>
      <div v-for="(row, i) in form.labels" :key="i" class="label-matcher-row">
        <input v-model="row.key" class="am-input sm key" type="text" placeholder="键，如 alertname" aria-label="标签键" />
        <select v-model="row.operator" class="am-input sm op" aria-label="运算符">
          <option v-for="op in SILENCE_OPERATORS" :key="op" :value="op">{{ op }}</option>
        </select>
        <input v-model="row.value" class="am-input sm val" type="text" placeholder="值" aria-label="标签值" />
        <button type="button" class="am-btn sm ghost" @click="removeLabelRow(i)">删除</button>
      </div>
      <button type="button" class="am-btn sm" @click="addLabelRow">添加条件</button>
    </div>

    <label class="field">
      <span>开始时间 <span class="req">*</span></span>
      <input v-model="form.startsAtLocal" class="am-input" type="datetime-local" />
      <span class="muted small">提交为 Unix 秒（与后端一致）</span>
    </label>
    <label class="field">
      <span>结束时间 <span class="req">*</span></span>
      <input v-model="form.endsAtLocal" class="am-input" type="datetime-local" />
    </label>

    <label class="field">
      <span>备注</span>
      <textarea v-model="form.comment" class="am-textarea" rows="2" placeholder="可选"></textarea>
    </label>

    <p v-if="formErrorMsg" class="am-err">{{ formErrorMsg }}</p>
    <div class="form-actions">
      <slot name="actions" :disabled="saving" :submit="emitSave">
        <button type="button" class="am-btn primary" :disabled="saving" @click="emitSave">保存</button>
      </slot>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import {
  SILENCE_OPERATORS,
  datetimeLocalToUnix,
  unixToDatetimeLocal,
  normalizeLabelsInput,
  labelsForApi,
  emptySilenceLabel
} from './silenceUtils'

const props = defineProps({
  mode: { type: String, required: true }, // 'create' | 'edit'
  faultCenterId: { type: String, required: true },
  /** 编辑时由父组件拉取后传入 */
  initialSilence: { type: Object, default: null },
  saving: { type: Boolean, default: false }
})

const emit = defineEmits(['save'])

const form = reactive({
  name: '',
  labels: [emptySilenceLabel()],
  startsAtLocal: '',
  endsAtLocal: '',
  comment: ''
})

const formErrorMsg = ref('')

function resetForCreate() {
  const now = Math.floor(Date.now() / 1000)
  form.name = ''
  form.labels = [emptySilenceLabel()]
  form.startsAtLocal = unixToDatetimeLocal(now)
  form.endsAtLocal = unixToDatetimeLocal(now + 3600)
  form.comment = ''
}

function resetFromInitial(row) {
  if (!row) return
  form.name = row.name || ''
  form.labels = normalizeLabelsInput(row.labels)
  const s = typeof row.startsAt === 'number' ? row.startsAt : Number(row.startsAt)
  const e = typeof row.endsAt === 'number' ? row.endsAt : Number(row.endsAt)
  form.startsAtLocal = Number.isFinite(s) ? unixToDatetimeLocal(s) : ''
  form.endsAtLocal = Number.isFinite(e) ? unixToDatetimeLocal(e) : ''
  form.comment = row.comment || ''
}

watch(
  () => [props.mode, props.initialSilence],
  () => {
    formErrorMsg.value = ''
    if (props.mode === 'edit' && props.initialSilence) {
      resetFromInitial(props.initialSilence)
    } else {
      resetForCreate()
    }
  },
  { immediate: true }
)

function addLabelRow() {
  form.labels.push(emptySilenceLabel())
}

function removeLabelRow(i) {
  if (form.labels.length <= 1) {
    form.labels = [emptySilenceLabel()]
    return
  }
  form.labels.splice(i, 1)
}

function emitSave() {
  formErrorMsg.value = ''
  const name = form.name?.trim()
  if (!name) {
    formErrorMsg.value = '请填写名称'
    return
  }
  const labels = labelsForApi(form.labels)
  if (!labels.length) {
    formErrorMsg.value = '请至少填写一条有效的标签条件（键不能为空）'
    return
  }
  const startsAt = datetimeLocalToUnix(form.startsAtLocal)
  const endsAt = datetimeLocalToUnix(form.endsAtLocal)
  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt)) {
    formErrorMsg.value = '请填写有效的开始、结束时间'
    return
  }
  if (endsAt <= startsAt) {
    formErrorMsg.value = '结束时间必须晚于开始时间'
    return
  }
  const fc = props.faultCenterId?.trim()
  if (!fc) {
    formErrorMsg.value = '缺少故障中心'
    return
  }

  const body = {
    name,
    labels,
    startsAt,
    endsAt,
    faultCenterId: fc,
    comment: form.comment?.trim() || ''
  }
  if (props.mode === 'edit' && props.initialSilence?.id) {
    body.id = props.initialSilence.id
  }
  emit('save', body)
}
defineOptions({ name: 'SilenceForm' })
</script>

<style scoped>
.silence-form { max-width: 720px; }
.silence-hint {
  margin: 0 0 14px;
  font-size: 13px;
  color: var(--text-muted, #64748b);
  line-height: 1.5;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
  font-size: 13px;
}
.req { color: #b91c1c; }
.am-input {
  padding: 8px 10px;
  border: 1px solid var(--border-default, #e2e8f0);
  border-radius: 8px;
  font-size: 13px;
}
.am-input.sm { min-width: 0; }
.am-textarea {
  padding: 8px 10px;
  border: 1px solid var(--border-default, #e2e8f0);
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
}
.label-matcher-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.label-matcher-row .key { flex: 1 1 120px; min-width: 100px; }
.label-matcher-row .op { flex: 0 0 72px; }
.label-matcher-row .val { flex: 1 1 140px; min-width: 100px; }
.am-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-default, #e2e8f0);
  background: #fff;
  font-size: 13px;
  cursor: pointer;
}
.am-btn.sm { padding: 6px 10px; font-size: 12px; }
.am-btn.primary { background: #1d4ed8; color: #fff; border-color: #1d4ed8; }
.am-btn.ghost { background: #f8fafc; }
.am-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.am-err { color: #b91c1c; font-size: 13px; margin: 8px 0 0; }
.muted { color: #64748b; }
.small { font-size: 12px; }
.form-actions { margin-top: 16px; display: flex; gap: 8px; flex-wrap: wrap; }
</style>
