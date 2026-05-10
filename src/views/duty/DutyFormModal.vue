<template>
  <Teleport to="body">
    <div v-if="open" class="modal-overlay" role="presentation" @click.self="emitClose">
      <div class="modal form-modal" role="dialog" aria-modal="true" :aria-labelledby="titleId" @click.stop>
        <div class="modal-hd">
          <h3 :id="titleId">{{ mode === 'update' ? '编辑值班表' : '创建值班表' }}</h3>
          <button type="button" class="icon-close" aria-label="关闭" @click="emitClose">×</button>
        </div>
        <div class="modal-bd">
          <label class="field">
            <span>名称 <span class="req">*</span></span>
            <input
              v-model.trim="name"
              type="text"
              class="fc-input"
              maxlength="128"
              placeholder="值班表名称"
              autocomplete="off"
              @keydown.space.prevent
            />
          </label>
          <label class="field">
            <span>描述</span>
            <textarea v-model="description" class="fc-textarea" rows="3" placeholder="可选" />
          </label>
          <label class="field">
            <span>负责人 <span class="req">*</span></span>
            <select
              v-model="managerKey"
              class="fc-input"
              @focus="ensureDutyUsersLoaded"
            >
              <option value="" disabled>选择负责人</option>
              <option v-for="u in dutyUsers" :key="userRowKey(u)" :value="userRowKey(u)">
                {{ u.username || u.userName || u.userid || '—' }}
              </option>
            </select>
          </label>
          <p v-if="formError" class="fc-page-error" style="margin-top: 0">{{ formError }}</p>
        </div>
        <div class="modal-ft">
          <button type="button" class="btn btn-secondary" :disabled="submitting" @click="emitClose">取消</button>
          <button type="button" class="btn btn-primary" :disabled="submitting" @click="submit">
            {{ submitting ? '提交中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { getUserList } from '@/api/user'
import { createDutyManager, updateDutyManager } from '@/api/duty'

const props = defineProps({
  open: { type: Boolean, default: false },
  /** @type {'create' | 'update'} */
  mode: { type: String, default: 'create' },
  duty: { type: Object, default: null }
})

const emit = defineEmits(['close', 'saved'])

const titleId = 'duty-form-modal-title'
const name = ref('')
const description = ref('')
/** select 的 value：优先 userid，否则 username */
const managerKey = ref('')
const dutyUsers = ref([])
const formError = ref('')
const submitting = ref(false)

function userRowKey(u) {
  return String(u.userid || u.username || u.userName || '')
}

const selectedManagerPayload = computed(() => {
  const u = dutyUsers.value.find((x) => userRowKey(x) === String(managerKey.value))
  if (!u) return null
  const userid = String(u.userid || u.username || u.userName || managerKey.value || '')
  const username = u.username || u.userName || userid
  return { userid, username }
})

function resetForCreate() {
  name.value = ''
  description.value = ''
  managerKey.value = ''
  formError.value = ''
}

function hydrateFromDuty() {
  const d = props.duty
  if (!d) {
    resetForCreate()
    return
  }
  name.value = (d.name || '').trim()
  description.value = d.description || ''
  const uid = d.manager?.userid != null && d.manager.userid !== '' ? String(d.manager.userid) : ''
  const un = d.manager?.username || ''
  managerKey.value = uid || un
  formError.value = ''
}

async function ensureDutyUsersLoaded() {
  if (dutyUsers.value.length) return
  try {
    dutyUsers.value = await getUserList({ joinDuty: 'true' })
  } catch {
    dutyUsers.value = []
  }
}

function syncManagerFromUsername() {
  if (!props.duty?.manager || managerKey.value) return
  const un = props.duty.manager.username
  if (!un) return
  const hit = dutyUsers.value.find((u) => (u.username || u.userName) === un)
  if (hit) managerKey.value = userRowKey(hit)
}

watch(
  () => props.open,
  async (on) => {
    if (!on) return
    formError.value = ''
    await ensureDutyUsersLoaded()
    if (props.mode === 'update' && props.duty) {
      hydrateFromDuty()
      syncManagerFromUsername()
    } else resetForCreate()
  }
)

function emitClose() {
  if (submitting.value) return
  emit('close')
}

async function submit() {
  formError.value = ''
  const n = name.value.replace(/\s+/g, '')
  if (!n) {
    formError.value = '请填写名称。'
    return
  }
  const mgr = selectedManagerPayload.value
  if (!mgr || !String(mgr.userid || '').trim()) {
    formError.value = '请选择负责人。'
    return
  }
  submitting.value = true
  try {
    const body = {
      name: n,
      description: description.value.trim() || undefined,
      manager: { username: mgr.username, userid: mgr.userid }
    }
    if (props.mode === 'update' && props.duty) {
      await updateDutyManager({
        ...body,
        id: props.duty.id,
        tenantId: props.duty.tenantId || undefined
      })
    } else {
      await createDutyManager(body)
    }
    emit('saved')
    emit('close')
  } catch (e) {
    formError.value = e?.message || '保存失败'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.req {
  color: var(--danger-600);
}
</style>
