<template>
  <div class="am-page">
    <div class="am-head">
      <h2 class="am-title">{{ isEdit ? '编辑规则' : '新建规则' }}</h2>
      <RouterLink to="/alert-mgmt/rules" class="am-btn linkish">返回列表</RouterLink>
    </div>

    <p v-if="pageError" class="am-err">{{ pageError }}</p>
    <div v-if="loadRule" class="am-loading"><span class="spinner" />加载规则…</div>

    <div v-else class="form-card">
      <label class="field"><span>规则组</span>
        <select v-model="form.ruleGroupId" class="am-input" required>
          <option value="" disabled>请选择</option>
          <option v-for="g in ruleGroups" :key="g.id" :value="g.id">{{ g.name || g.id }}</option>
        </select>
      </label>
      <label class="field"><span>故障中心 ID</span>
        <input v-model="form.faultCenterId" class="am-input" type="text" required placeholder="fc-xxx">
      </label>
      <label class="field"><span>数据源类型</span>
        <select v-model="form.datasourceType" class="am-input">
          <option value="Prometheus">Prometheus</option>
          <option value="Loki">Loki</option>
          <option value="Kubernetes">Kubernetes</option>
        </select>
      </label>
      <label class="field"><span>数据源 ID（逗号分隔）</span>
        <input v-model="form.datasourceIdStr" class="am-input" type="text" placeholder="ds1,ds2">
      </label>
      <label class="field"><span>规则名称</span>
        <input v-model="form.ruleName" class="am-input" type="text" required>
      </label>
      <label class="field"><span>严重级别</span>
        <input v-model="form.severity" class="am-input" type="text" placeholder="P1">
      </label>
      <label class="field"><span>评估间隔（秒）</span>
        <input v-model.number="form.evalInterval" class="am-input" type="number" min="1">
      </label>
      <label class="field"><span>重复通知间隔（秒）</span>
        <input v-model.number="form.repeatNoticeInterval" class="am-input" type="number" min="0">
      </label>
      <label class="field"><span>描述</span>
        <textarea v-model="form.description" class="am-textarea" rows="2"></textarea>
      </label>
      <label class="field inline"><input v-model="form.enabled" type="checkbox"> 启用</label>

      <label class="field"><span>Prometheus 配置（JSON，其他类型可在此扩展或留 {}）</span>
        <textarea v-model="prometheusJson" class="am-textarea mono" rows="8" placeholder='{"promQL":"..."}'></textarea>
      </label>
      <label class="field"><span>生效时段 effectiveTime（JSON，可选）</span>
        <textarea v-model="effectiveTimeJson" class="am-textarea mono" rows="3" placeholder="{}"></textarea>
      </label>

      <p v-if="submitError" class="am-err">{{ submitError }}</p>
      <div class="form-actions">
        <button type="button" class="am-btn primary" :disabled="submitting" @click="submit">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { normalizeListPayload } from '@/utils/w8tPage'
import { ruleGroupList, ruleSearch, ruleCreate, ruleUpdate } from '@/api/w8tAlert'
import { useFaultCenterContextStore } from '@/store/faultCenterContext'

const route = useRoute()
const router = useRouter()
const fcStore = useFaultCenterContextStore()

const isEdit = computed(() => route.name === 'AlertMgmtRuleEdit')
const paramGroupId = computed(() => String(route.params.ruleGroupId || ''))
const paramRuleId = computed(() => String(route.params.ruleId || ''))

const pageError = ref('')
const submitError = ref('')
const submitting = ref(false)
const loadRule = ref(false)

const ruleGroups = ref([])

const form = ref({
  ruleId: '',
  ruleGroupId: '',
  faultCenterId: '',
  datasourceType: 'Prometheus',
  datasourceIdStr: '',
  ruleName: '',
  severity: 'warning',
  evalInterval: 60,
  repeatNoticeInterval: 300,
  description: '',
  enabled: true
})

const prometheusJson = ref('{}')
const effectiveTimeJson = ref('')

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

function parseJsonField(raw, label) {
  if (!raw?.trim()) return undefined
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error(`${label} 不是合法 JSON`)
  }
}

async function loadExisting() {
  if (!isEdit.value) return
  loadRule.value = true
  pageError.value = ''
  try {
    const row = await ruleSearch({
      ruleGroupId: paramGroupId.value,
      ruleId: paramRuleId.value
    })
    if (!row || typeof row !== 'object') {
      pageError.value = '未找到规则'
      return
    }
    form.value = {
      ruleId: row.ruleId || paramRuleId.value,
      ruleGroupId: row.ruleGroupId || paramGroupId.value,
      faultCenterId: row.faultCenterId || '',
      datasourceType: row.datasourceType || 'Prometheus',
      datasourceIdStr: Array.isArray(row.datasourceId) ? row.datasourceId.join(',') : '',
      ruleName: row.ruleName || '',
      severity: row.severity || 'warning',
      evalInterval: row.evalInterval ?? 60,
      repeatNoticeInterval: row.repeatNoticeInterval ?? 300,
      description: row.description || '',
      enabled: row.enabled !== false
    }
    prometheusJson.value = row.prometheusConfig
      ? JSON.stringify(row.prometheusConfig, null, 2)
      : '{}'
    effectiveTimeJson.value = row.effectiveTime
      ? JSON.stringify(row.effectiveTime, null, 2)
      : ''
  } catch (e) {
    pageError.value = e?.message || '加载规则失败'
  } finally {
    loadRule.value = false
  }
}

async function submit() {
  submitError.value = ''
  if (!form.value.ruleGroupId || !form.value.faultCenterId || !form.value.ruleName?.trim()) {
    submitError.value = '请填写规则组、故障中心与规则名称'
    return
  }
  let promCfg
  let eff
  try {
    promCfg = parseJsonField(prometheusJson.value, 'Prometheus 配置')
    eff = effectiveTimeJson.value?.trim() ? parseJsonField(effectiveTimeJson.value, 'effectiveTime') : undefined
  } catch (e) {
    submitError.value = e.message
    return
  }

  const datasourceId = form.value.datasourceIdStr
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const body = {
    ruleGroupId: form.value.ruleGroupId,
    faultCenterId: form.value.faultCenterId,
    datasourceType: form.value.datasourceType,
    datasourceId,
    ruleName: form.value.ruleName.trim(),
    evalInterval: form.value.evalInterval,
    repeatNoticeInterval: form.value.repeatNoticeInterval,
    description: form.value.description || '',
    severity: form.value.severity || 'warning',
    enabled: form.value.enabled,
    prometheusConfig: promCfg && typeof promCfg === 'object' ? promCfg : {}
  }
  if (eff !== undefined) body.effectiveTime = eff

  submitting.value = true
  try {
    if (isEdit.value) {
      body.ruleId = form.value.ruleId || paramRuleId.value
      await ruleUpdate(body)
    } else {
      await ruleCreate(body)
    }
    router.push('/alert-mgmt/rules')
  } catch (e) {
    submitError.value = e?.message || '保存失败'
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await loadGroups()
  if (!isEdit.value && fcStore.currentFaultCenterId) {
    form.value.faultCenterId = fcStore.currentFaultCenterId
  }
  await loadExisting()
})
</script>

<style scoped>
.am-page { padding: 8px 0 32px; max-width: 720px; }
.am-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
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
.am-err { color: #b91c1c; font-size: 13px; }
.am-loading { display: flex; align-items: center; gap: 10px; padding: 16px; color: #555; }
.spinner {
  width: 18px; height: 18px;
  border: 2px solid #ddd;
  border-top-color: #333;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.form-card {
  border: 1px solid var(--border-default);
  border-radius: 10px;
  padding: 20px;
  background: #fff;
}
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; font-size: 13px; color: #333; }
.field.inline { flex-direction: row; align-items: center; gap: 8px; }
.am-input, .am-textarea {
  padding: 8px 10px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
}
.am-textarea.mono { font-family: ui-monospace, monospace; font-size: 12px; }
.form-actions { margin-top: 8px; }
</style>
