<template>
  <div class="am-page">
    <div class="am-head">
      <h2 class="am-title">导入规则</h2>
      <RouterLink to="/alert-mgmt/rules" class="am-btn linkish">返回列表</RouterLink>
    </div>

    <p class="hint">
      <code>importType</code>：0 = Prometheus YAML（<code>groups[].rules</code>）；1 = WatchAlert JSON 数组。
      导入后规则默认<strong>未启用</strong>，请在列表中手动启用。
    </p>

    <div class="form-card">
      <label class="field"><span>规则组</span>
        <select v-model="form.ruleGroupId" class="am-input" required>
          <option value="" disabled>请选择</option>
          <option v-for="g in ruleGroups" :key="g.id" :value="g.id">{{ g.name || g.id }}</option>
        </select>
      </label>
      <label class="field"><span>故障中心 ID</span>
        <input v-model="form.faultCenterId" class="am-input" type="text" required>
      </label>
      <label class="field"><span>数据源类型</span>
        <select v-model="form.datasourceType" class="am-input">
          <option value="Prometheus">Prometheus</option>
        </select>
      </label>
      <label class="field"><span>数据源 ID 列表（逗号分隔）</span>
        <input v-model="form.datasourceIdListStr" class="am-input" type="text">
      </label>
      <label class="field"><span>导入类型</span>
        <select v-model.number="form.importType" class="am-input">
          <option :value="0">0 — Prometheus YAML</option>
          <option :value="1">1 — WatchAlert JSON 数组</option>
        </select>
      </label>
      <label class="field"><span>规则内容</span>
        <textarea v-model="form.rules" class="am-textarea mono" rows="16" placeholder="粘贴 YAML 或 JSON"></textarea>
      </label>

      <p v-if="err" class="am-err">{{ err }}</p>
      <p v-if="okMsg" class="ok">{{ okMsg }}</p>
      <div class="form-actions">
        <button type="button" class="am-btn primary" :disabled="submitting" @click="doImport">提交导入</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { normalizeListPayload } from '@/utils/w8tPage'
import { ruleGroupList, ruleImport } from '@/api/w8tAlert'
import { useFaultCenterContextStore } from '@/store/faultCenterContext'

const fcStore = useFaultCenterContextStore()

const ruleGroups = ref([])
const form = ref({
  ruleGroupId: '',
  faultCenterId: '',
  datasourceType: 'Prometheus',
  datasourceIdListStr: '',
  importType: 0,
  rules: ''
})
const err = ref('')
const okMsg = ref('')
const submitting = ref(false)

watch(
  () => fcStore.currentFaultCenterId,
  (id) => {
    if (id && !form.value.faultCenterId) form.value.faultCenterId = id
  },
  { immediate: true }
)

async function loadGroups() {
  try {
    const data = await ruleGroupList({ index: 1, size: 500 })
    const n = normalizeListPayload(data)
    ruleGroups.value = n.list
  } catch {
    ruleGroups.value = []
  }
}

async function doImport() {
  err.value = ''
  okMsg.value = ''
  if (!form.value.ruleGroupId || !form.value.faultCenterId || !form.value.rules?.trim()) {
    err.value = '请填写规则组、故障中心与规则内容'
    return
  }
  submitting.value = true
  try {
    await ruleImport({
      ruleGroupId: form.value.ruleGroupId,
      datasourceType: form.value.datasourceType,
      datasourceIdList: form.value.datasourceIdListStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      faultCenterId: form.value.faultCenterId,
      importType: form.value.importType,
      rules: form.value.rules
    })
    okMsg.value = '导入请求已提交，请到规则列表确认（默认未启用）。'
  } catch (e) {
    err.value = e?.message || '导入失败'
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await loadGroups()
  if (fcStore.currentFaultCenterId) {
    form.value.faultCenterId = fcStore.currentFaultCenterId
  }
})
</script>

<style scoped>
.am-page { padding: 8px 0 32px; max-width: 720px; }
.am-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.am-title { margin: 0; font-size: 20px; font-weight: 600; }
.am-btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-default);
  background: #fff;
  font-size: 13px;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
}
.am-btn.primary { background: #1d4ed8; color: #fff; border-color: #1d4ed8; }
.am-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.hint { font-size: 13px; color: #555; line-height: 1.5; margin-bottom: 16px; }
.form-card {
  border: 1px solid var(--border-default);
  border-radius: 10px;
  padding: 20px;
  background: #fff;
}
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; font-size: 13px; }
.am-input, .am-textarea {
  padding: 8px 10px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
}
.am-textarea.mono { font-family: ui-monospace, monospace; font-size: 12px; }
.am-err { color: #b91c1c; font-size: 13px; }
.ok { color: #166534; font-size: 13px; }
.form-actions { margin-top: 8px; }
</style>
