<template>
  <div class="am-page">
    <div class="am-head">
      <h2 class="am-title">{{ isEdit ? '编辑静默' : '新建静默' }}</h2>
      <RouterLink :to="backTo" class="am-btn linkish">返回列表</RouterLink>
    </div>

    <p v-if="!effectiveFc" class="am-warn">请先在顶部选择故障中心，或通过列表进入并带上故障中心上下文。</p>
    <p v-if="pageError" class="am-err">{{ pageError }}</p>
    <div v-if="loadSilence" class="am-loading"><span class="spinner" />加载静默…</div>

    <div v-else-if="effectiveFc" class="form-card">
      <SilenceForm
        v-if="!isEdit || loadedSilence"
        :mode="isEdit ? 'edit' : 'create'"
        :fault-center-id="effectiveFc"
        :initial-silence="loadedSilence"
        :saving="saving"
        @save="onSave"
      >
        <template #actions="{ disabled, submit }">
          <button type="button" class="am-btn" :disabled="disabled" @click="goBack">取消</button>
          <button type="button" class="am-btn primary" :disabled="disabled" @click="submit">保存</button>
        </template>
      </SilenceForm>
      <p v-else-if="isEdit && !loadSilence" class="am-err">无法加载该静默，请返回列表重试。</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { normalizeListPayload } from '@/utils/w8tPage'
import { silenceList, silenceCreate, silenceUpdate } from '@/api/w8tAlert'
import { useFaultCenterContextStore } from '@/store/faultCenterContext'
import SilenceForm from './SilenceForm.vue'

defineOptions({ name: 'SilenceFormPage' })

const route = useRoute()
const router = useRouter()
const fcStore = useFaultCenterContextStore()

const isEdit = computed(() => route.name === 'AlertMgmtSilenceEdit')

const effectiveFc = computed(() => {
  const q = route.query.faultCenterId
  if (typeof q === 'string' && q.trim()) return q.trim()
  return fcStore.currentFaultCenterId || ''
})

const backTo = computed(() => ({
  path: '/alert-mgmt/silences',
  query: effectiveFc.value ? { faultCenterId: effectiveFc.value } : {}
}))

const pageError = ref('')
const loadSilence = ref(false)
const loadedSilence = ref(null)
const saving = ref(false)

function goBack() {
  router.push(backTo.value)
}

async function fetchSilenceForEdit() {
  const id = typeof route.query.id === 'string' ? route.query.id : ''
  const fc = effectiveFc.value
  if (!id || !fc) {
    loadedSilence.value = null
    return
  }
  loadSilence.value = true
  pageError.value = ''
  try {
    const data = await silenceList({
      faultCenterId: fc,
      query: id,
      status: 'all',
      index: 1,
      size: 100
    })
    const n = normalizeListPayload(data)
    const row = n.list.find((x) => x.id === id)
    if (!row) {
      pageError.value = '未找到该静默规则'
      loadedSilence.value = null
    } else {
      loadedSilence.value = row
    }
  } catch (e) {
    pageError.value = e?.message || '加载失败'
    loadedSilence.value = null
  } finally {
    loadSilence.value = false
  }
}

watch(
  () => [isEdit.value, route.query.id, effectiveFc.value],
  () => {
    if (isEdit.value) fetchSilenceForEdit()
    else {
      loadedSilence.value = null
      pageError.value = ''
    }
  },
  { immediate: true }
)

async function onSave(body) {
  saving.value = true
  pageError.value = ''
  try {
    if (isEdit.value) {
      await silenceUpdate(body)
    } else {
      await silenceCreate(body)
    }
    await router.push(backTo.value)
  } catch (e) {
    pageError.value = e?.message || '保存失败'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.am-page {
  padding: 8px 0 32px;
}
.am-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.am-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  flex: 1;
  min-width: 120px;
}
.am-warn {
  color: #b45309;
  font-size: 13px;
}
.am-err {
  color: #b91c1c;
  font-size: 13px;
}
.am-loading {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
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
.form-card {
  border: 1px solid var(--border-default, #e2e8f0);
  border-radius: 10px;
  padding: 20px;
  background: #fff;
  max-width: 800px;
}
.am-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-default, #e2e8f0);
  background: #fff;
  font-size: 13px;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  display: inline-flex;
  align-items: center;
}
.am-btn.primary {
  background: #1d4ed8;
  color: #fff;
  border-color: #1d4ed8;
}
.am-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.linkish {
  color: #2563eb;
}
</style>
