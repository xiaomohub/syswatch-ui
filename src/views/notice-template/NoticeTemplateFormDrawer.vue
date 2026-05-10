<template>
  <Teleport to="body">
    <div v-if="open" class="nod-mask" @click.self="emitClose">
      <aside class="ntd-panel" role="dialog" aria-modal="true" @click.stop>
        <header class="nod-head">
          <h2 class="nod-title">{{ variant === 'update' ? '更新通知模版' : '创建通知模版' }}</h2>
          <button type="button" class="nod-x" aria-label="关闭" @click="emitClose">×</button>
        </header>

        <div class="nod-body">
          <p v-if="formError" class="nod-err">{{ formError }}</p>

          <form class="nod-form" @submit.prevent="handleSubmit">
            <label class="nod-field">
              <span>名称 <em class="req">*</em></span>
              <input
                :value="name"
                class="nod-input"
                maxlength="200"
                placeholder="模版名称"
                :disabled="variant === 'update'"
                @keydown="onNameKeydown"
                @input="onNameInput"
              >
            </label>

            <label class="nod-field">
              <span>描述</span>
              <input v-model="description" class="nod-input" maxlength="500" placeholder="可选">
            </label>

            <div class="nod-type-row">
              <span class="nod-label">模版类型</span>
              <div
                class="nod-type-cards"
                :class="{ 'is-locked': variant === 'update' }"
              >
                <button
                  v-for="t in TMPL_TYPES"
                  :key="t"
                  type="button"
                  class="nod-type-card"
                  :class="{ active: notifyType === t }"
                  :disabled="variant === 'update'"
                  @click="pickType(t)"
                >
                  <span class="nod-type-name">{{ NOTICE_TYPE_LABELS[t] }}</span>
                </button>
              </div>
            </div>

            <div v-if="notifyType === 'FeiShu'" class="nod-field nod-chk-row">
              <label class="nod-chk">
                <input v-model="enableFeiShuJsonCard" type="checkbox">
                <span>应用飞书高级消息卡片</span>
              </label>
              <span
                class="ntd-hint"
                title="开启后为告警与恢复分别配置 JSON 卡片内容"
              >?</span>
            </div>

            <template v-if="showSingleTemplate">
              <label class="nod-field">
                <span>告警模版 <em class="req">*</em></span>
                <textarea
                  v-model="template"
                  class="nod-tmpl"
                  rows="18"
                  spellcheck="false"
                  placeholder="模版内容"
                />
              </label>
            </template>
            <template v-else>
              <label class="nod-field">
                <span>告警模版 <em class="req">*</em>（firing）</span>
                <textarea
                  v-model="templateFiring"
                  class="nod-tmpl nod-tmpl-sm"
                  rows="12"
                  spellcheck="false"
                  placeholder="告警触发时卡片 JSON"
                />
              </label>
              <label class="nod-field">
                <span>恢复模版 <em class="req">*</em>（recover）</span>
                <textarea
                  v-model="templateRecover"
                  class="nod-tmpl nod-tmpl-sm"
                  rows="12"
                  spellcheck="false"
                  placeholder="恢复时卡片 JSON"
                />
              </label>
            </template>
          </form>
        </div>

        <footer class="nod-foot">
          <button
            type="button"
            class="nod-btn primary"
            :disabled="submitLoading"
            @click="handleSubmit"
          >
            {{ submitLoading ? '提交中…' : '提交' }}
          </button>
        </footer>
      </aside>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { NOTICE_TYPE_LABELS } from '@/views/notice-objects/noticeTypes.js'
import { createNoticeTmpl, updateNoticeTmpl } from '@/api/noticeTmpl'

const TMPL_TYPES = ['FeiShu', 'Email', 'DingDing', 'WeChat', 'Slack']

const props = defineProps({
  open: { type: Boolean, default: false },
  /** 'create' | 'update' */
  variant: { type: String, default: 'create' },
  /** 编辑行；创建时若传入则为复制源 */
  record: { type: Object, default: null }
})

const emit = defineEmits(['close', 'success', 'toast'])

const submitLoading = ref(false)
const formError = ref('')

const name = ref('')
const description = ref('')
const notifyType = ref('FeiShu')
const enableFeiShuJsonCard = ref(false)
const template = ref('')
const templateFiring = ref('')
const templateRecover = ref('')

const showSingleTemplate = computed(
  () => notifyType.value !== 'FeiShu' || !enableFeiShuJsonCard.value
)

function emitClose() {
  emit('close')
}

function resetForm() {
  formError.value = ''
  name.value = ''
  description.value = ''
  notifyType.value = 'FeiShu'
  enableFeiShuJsonCard.value = false
  template.value = ''
  templateFiring.value = ''
  templateRecover.value = ''
}

function syncFromRow(r) {
  formError.value = ''
  name.value = String(r.name ?? '').replace(/\s/g, '')
  description.value = String(r.description ?? '')
  const nt = String(r.noticeType ?? '')
  notifyType.value = TMPL_TYPES.includes(nt) ? nt : 'FeiShu'
  enableFeiShuJsonCard.value = !!r.enableFeiShuJsonCard
  template.value = String(r.template ?? '')
  templateFiring.value = String(r.templateFiring ?? '')
  templateRecover.value = String(r.templateRecover ?? '')
}

function pickType(t) {
  if (props.variant === 'update') return
  notifyType.value = t
  if (t !== 'FeiShu') {
    enableFeiShuJsonCard.value = false
  }
}

function onNameKeydown(e) {
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault()
  }
}

function onNameInput(e) {
  name.value = e.target.value.replace(/\s/g, '')
}

watch(
  () => [props.open, props.variant, props.record],
  () => {
    if (!props.open) {
      resetForm()
      return
    }
    if (props.variant === 'update' && props.record) {
      syncFromRow(props.record)
    } else if (props.variant === 'create' && props.record) {
      syncFromRow(props.record)
    } else {
      resetForm()
    }
  },
  { flush: 'post' }
)

function validate() {
  const n = name.value.trim()
  if (!n) {
    formError.value = '请填写名称'
    return null
  }
  const feishuCard = notifyType.value === 'FeiShu' && enableFeiShuJsonCard.value
  if (feishuCard) {
    if (!templateFiring.value.trim()) {
      formError.value = '请填写告警模版（firing）'
      return null
    }
    if (!templateRecover.value.trim()) {
      formError.value = '请填写恢复模版（recover）'
      return null
    }
  } else if (!template.value.trim()) {
    formError.value = '请填写告警模版'
    return null
  }
  formError.value = ''
  return true
}

function buildBody() {
  const feishuCard = notifyType.value === 'FeiShu' && enableFeiShuJsonCard.value
  /** @type {Record<string, unknown>} */
  const body = {
    name: name.value.trim(),
    description: description.value.trim(),
    noticeType: notifyType.value,
    enableFeiShuJsonCard: feishuCard
  }
  if (feishuCard) {
    body.templateFiring = templateFiring.value
    body.templateRecover = templateRecover.value
  } else {
    body.template = template.value
  }
  return body
}

async function handleSubmit() {
  if (!validate()) return
  submitLoading.value = true
  try {
    if (props.variant === 'create') {
      await createNoticeTmpl(buildBody())
      emit('toast', { message: '通知模版创建成功', type: 'success' })
    } else {
      const id = props.record?.id ?? props.record?.uuid
      if (id == null || id === '') {
        formError.value = '缺少模版 id'
        return
      }
      await updateNoticeTmpl({ ...buildBody(), id })
      emit('toast', { message: '通知模版更新成功', type: 'success' })
    }
    emit('success')
    emitClose()
  } catch (e) {
    formError.value = e instanceof Error ? e.message : '提交失败'
  } finally {
    submitLoading.value = false
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
.ntd-panel {
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
.nod-input:disabled {
  background: #f1f5f9;
  color: #64748b;
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
.nod-type-cards.is-locked {
  cursor: not-allowed;
  opacity: 0.88;
}
.nod-type-cards.is-locked .nod-type-card {
  pointer-events: none;
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
.nod-type-card:disabled {
  cursor: not-allowed;
  opacity: 0.75;
}
.nod-type-card:hover:not(:disabled):not(.active) {
  border-color: #93c5fd;
  background: #f8fafc;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
}
.nod-type-card:active:not(:disabled):not(.active) {
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
  flex-direction: row;
  align-items: center;
  gap: 12px;
}
.nod-chk {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  cursor: pointer;
}
.nod-chk input[type='checkbox'] {
  width: 18px;
  height: 18px;
  accent-color: #1d4ed8;
  cursor: pointer;
}
.ntd-hint {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  cursor: help;
  user-select: none;
  transition:
    background 0.18s ease,
    transform 0.12s ease;
}
.ntd-hint:hover {
  background: #cbd5e1;
}
.ntd-hint:active {
  transform: scale(0.92);
}
.nod-tmpl {
  width: 100%;
  box-sizing: border-box;
  padding: 14px 16px;
  border: 1px solid var(--border-default, #e5e7eb);
  border-radius: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
  min-height: 340px;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}
.nod-tmpl:hover {
  border-color: #cbd5e1;
}
.nod-tmpl:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}
.nod-tmpl-sm {
  min-height: 220px;
}
.nod-btn {
  padding: 11px 20px;
  border-radius: 14px;
  border: 1px solid #1d4ed8;
  background: #1d4ed8;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  color: #fff;
  transition:
    transform 0.14s ease,
    box-shadow 0.18s ease,
    background 0.18s ease,
    border-color 0.18s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.nod-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.35);
}
.nod-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #1e40af;
  border-color: #1e40af;
  box-shadow: 0 8px 20px rgba(29, 78, 216, 0.35);
}
.nod-btn:active:not(:disabled) {
  transform: translateY(0);
  background: #1e3a8a;
  border-color: #1e3a8a;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
}
.nod-btn.primary {
  background: #1d4ed8;
  color: #fff;
  border-color: #1d4ed8;
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
  margin: 0 0 14px;
  padding: 10px 14px;
  border-radius: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
}
</style>
