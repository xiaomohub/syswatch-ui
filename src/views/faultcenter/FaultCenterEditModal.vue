<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-overlay"
      role="presentation"
      @click.self="emitClose"
    >
      <div
        class="modal detail-modal fc-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fc-edit-modal-title"
        @click.stop
      >
        <div class="modal-hd">
          <h3 id="fc-edit-modal-title">编辑故障中心</h3>
          <button type="button" class="icon-close" aria-label="关闭" @click="emitClose">×</button>
        </div>

        <div class="modal-bd">
          <div v-if="loading" class="fc-loading"><div class="spinner"></div>加载中…</div>
          <template v-else>
            <p v-if="formError" class="fc-page-error" style="margin-top: 0">{{ formError }}</p>
            <p class="muted small fc-edit-id">
              <span class="fc-edit-id-label">ID</span>
              <code>{{ centerId || '—' }}</code>
              <span class="muted">（不可修改）</span>
            </p>
            <label class="field">
              <span>名称 *（不可含空格）</span>
              <input v-model="form.name" class="fc-input" type="text" @keydown="onNameKeydown" />
            </label>
            <label class="field">
              <span>描述</span>
              <textarea v-model="form.description" class="fc-textarea" rows="3" placeholder="可选" />
            </label>
            <div class="fc-edit-modal-actions">
              <button type="button" class="btn btn-secondary" :disabled="saving" @click="emitClose">取消</button>
              <button type="button" class="btn btn-primary" :disabled="saving" @click="submit">保存</button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { unwrapW8t, faultCenterSearch, faultCenterReset } from '@/api/faultcenter'
import './faultCenterCommon.css'

const props = defineProps({
  open: { type: Boolean, default: false },
  /** 要编辑的故障中心 id */
  centerId: { type: String, default: '' }
})

const emit = defineEmits(['close', 'saved'])

const loading = ref(false)
const saving = ref(false)
const formError = ref('')
const form = reactive({
  name: '',
  description: ''
})

function emitClose() {
  emit('close')
}

function onNameKeydown(e) {
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault()
  }
}

async function loadForm() {
  const id = (props.centerId || '').trim()
  if (!id) return
  formError.value = ''
  loading.value = true
  try {
    const res = await faultCenterSearch({ id })
    const d = unwrapW8t(res) || {}
    form.name = String(d.name ?? '')
    form.description = String(d.description ?? '')
  } catch (e) {
    formError.value = e?.message || '加载失败'
    form.name = ''
    form.description = ''
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.open, props.centerId],
  ([isOpen]) => {
    if (isOpen && (props.centerId || '').trim()) {
      void loadForm()
    } else if (!isOpen) {
      formError.value = ''
      form.name = ''
      form.description = ''
    }
  },
  { flush: 'post' }
)

async function submit() {
  const id = (props.centerId || '').trim()
  const name = form.name.trim()
  if (!id) return
  if (!name) {
    formError.value = '请填写名称'
    return
  }
  if (/\s/.test(name)) {
    formError.value = '名称不可含空格'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    await faultCenterReset({ id, name, description: form.description })
    emit('saved')
    emitClose()
  } catch (e) {
    formError.value = e?.message || '保存失败'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.fc-edit-modal .modal-bd {
  min-width: min(420px, 92vw);
}
.fc-edit-id {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg-secondary, #f8fafc);
  border: 1px solid var(--border-default);
}
.fc-edit-id-label {
  font-weight: 600;
  color: var(--text-muted);
  font-size: 12px;
}
.fc-edit-id code {
  font-size: 13px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}
.field span {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}
.fc-edit-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-default);
}
</style>
