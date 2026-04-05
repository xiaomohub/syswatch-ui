<template>
  <div class="aiops-rca">
    <div class="intro">
      <h2 class="title">AIOps 告警根因分析</h2>
      <p class="desc">
        将告警上下文提交给后端智能分析服务，辅助推断可能根因与处置建议。分析结果由模型生成，需结合监控与日志交叉验证。
      </p>
    </div>

    <div class="layout">
      <section class="panel input-panel">
        <h3 class="panel-title">告警上下文</h3>
        <label class="field">
          <span>告警 ID</span>
          <input v-model="form.alertId" type="text" placeholder="可选，便于审计关联" />
        </label>
        <label class="field">
          <span>告警名称</span>
          <input v-model="form.alertName" type="text" placeholder="如 CPUThrottlingHigh" />
        </label>
        <label class="field">
          <span>摘要</span>
          <input v-model="form.summary" type="text" placeholder="告警摘要 / summary" />
        </label>
        <label class="field">
          <span>描述</span>
          <textarea v-model="form.description" rows="4" placeholder="详细描述、指标片段、错误栈等"></textarea>
        </label>
        <label class="field">
          <span>触发时间</span>
          <input v-model="form.startsAt" type="text" placeholder="ISO8601 或可读时间" />
        </label>
        <label class="field">
          <span>补充上下文</span>
          <textarea v-model="form.extraContext" rows="3" placeholder="近期变更、相关服务、人工备注等"></textarea>
        </label>
        <button type="button" class="submit-btn" :disabled="analyzing || !canSubmit" @click="runAnalyze">
          {{ analyzing ? '分析中…' : '开始智能分析' }}
        </button>
        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
      </section>

      <section class="panel result-panel">
        <h3 class="panel-title">分析结果</h3>
        <div v-if="!result && !analyzing && !errorMsg" class="placeholder">
          填写左侧告警信息后点击「开始智能分析」。也可在「告警统计」列表中对单条告警使用快捷入口预填。
        </div>
        <div v-if="analyzing" class="loading">
          <div class="spinner"></div>
          <span>正在调用 AIOps 服务，请稍候…</span>
        </div>
        <template v-else-if="result">
          <p v-if="result.requestId" class="meta">请求 ID：<code>{{ result.requestId }}</code></p>
          <div v-if="result.summary" class="block">
            <h4>结论摘要</h4>
            <div class="text-block">{{ result.summary }}</div>
          </div>
          <div v-if="result.rootCauses?.length" class="block">
            <h4>可能根因</h4>
            <ul class="cause-list">
              <li v-for="(c, i) in result.rootCauses" :key="i">
                <div class="cause-head">
                  <span class="cause-title">{{ c.title || '根因 ' + (i + 1) }}</span>
                  <span v-if="c.likelihood != null" class="badge">{{ c.likelihood }}</span>
                </div>
                <p v-if="c.evidence" class="cause-sub">依据：{{ c.evidence }}</p>
                <p v-if="c.reasoning" class="cause-sub">{{ c.reasoning }}</p>
              </li>
            </ul>
          </div>
          <div v-if="result.recommendations?.length" class="block">
            <h4>处置建议</h4>
            <ol class="rec-list">
              <li v-for="(r, i) in result.recommendations" :key="i">{{ r }}</li>
            </ol>
          </div>
          <div v-if="result.analysis && !result.summary" class="block">
            <h4>完整分析</h4>
            <div class="text-block pre">{{ result.analysis }}</div>
          </div>
          <p v-if="result.disclaimer" class="disclaimer">{{ result.disclaimer }}</p>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup>
/**
 * 后端对接：POST /api/aiops/rca/analyze
 * Body: { alertId?, alertName?, summary?, description?, startsAt?, extraContext? }
 * 响应见 normalizeResult()
 */
import { ref, computed, onMounted } from 'vue'
import http from '@/utils/http'

const PREFILL_KEY = 'aiops_rca_prefill'

const form = ref({
  alertId: '',
  alertName: '',
  summary: '',
  description: '',
  startsAt: '',
  extraContext: ''
})

const analyzing = ref(false)
const errorMsg = ref('')
const result = ref(null)

const canSubmit = computed(() => {
  const f = form.value
  return (
    (f.summary && f.summary.trim()) ||
    (f.description && f.description.trim()) ||
    (f.alertName && f.alertName.trim())
  )
})

function normalizeResult(data) {
  if (!data || typeof data !== 'object') return null
  return {
    requestId: data.requestId ?? data.id,
    summary: data.summary ?? data.conclusion,
    rootCauses: Array.isArray(data.rootCauses)
      ? data.rootCauses
      : Array.isArray(data.causes)
        ? data.causes
        : [],
    recommendations: Array.isArray(data.recommendations)
      ? data.recommendations
      : Array.isArray(data.actions)
        ? data.actions
        : typeof data.recommendations === 'string'
          ? [data.recommendations]
          : [],
    analysis: typeof data.analysis === 'string' ? data.analysis : data.content,
    disclaimer: data.disclaimer ?? data.notice
  }
}

async function runAnalyze() {
  errorMsg.value = ''
  result.value = null
  analyzing.value = true
  try {
    const res = await http.post('/api/aiops/rca/analyze', {
      alertId: form.value.alertId || undefined,
      alertName: form.value.alertName || undefined,
      summary: form.value.summary || undefined,
      description: form.value.description || undefined,
      startsAt: form.value.startsAt || undefined,
      extraContext: form.value.extraContext || undefined
    })
    result.value = normalizeResult(res.data)
    if (!result.value || (!result.value.summary && !result.value.analysis && !result.value.rootCauses?.length)) {
      errorMsg.value = '服务返回为空或格式未识别，请检查后端响应结构'
      result.value = null
    }
  } catch (e) {
    errorMsg.value =
      e.response?.data?.message || e.response?.data?.error || e.message || '分析请求失败'
  } finally {
    analyzing.value = false
  }
}

onMounted(() => {
  const raw = sessionStorage.getItem(PREFILL_KEY)
  if (!raw) return
  try {
    const p = JSON.parse(raw)
    if (p.alertId != null) form.value.alertId = String(p.alertId)
    if (p.alertName) form.value.alertName = String(p.alertName)
    if (p.summary) form.value.summary = String(p.summary)
    if (p.description) form.value.description = String(p.description)
    if (p.startsAt) form.value.startsAt = String(p.startsAt)
  } catch {
    /* ignore */
  }
  sessionStorage.removeItem(PREFILL_KEY)
})
</script>

<style scoped>
.aiops-rca {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
}
.intro .title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 600;
}
.intro .desc {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}
.layout {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 24px;
  align-items: start;
}
@media (max-width: 960px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
.panel {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
}
.panel-title {
  margin: 0 0 20px;
  font-size: 16px;
  font-weight: 600;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 13px;
  color: var(--text-muted);
}
.field input,
.field textarea {
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
}
.field textarea {
  resize: vertical;
  min-height: 80px;
}
.submit-btn {
  width: 100%;
  margin-top: 8px;
  padding: 14px 20px;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  color: #fff;
  background: linear-gradient(135deg, var(--accent-purple), var(--accent-cyan));
}
.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.error {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--accent-red);
}
.placeholder {
  font-size: 14px;
  color: var(--text-muted);
  line-height: 1.6;
}
.loading {
  display: flex;
  align-items: center;
  gap: 16px;
  color: var(--text-secondary);
}
.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent-cyan);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.meta {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0 0 16px;
}
.meta code {
  color: var(--accent-cyan);
  font-size: 12px;
}
.block {
  margin-bottom: 20px;
}
.block h4 {
  margin: 0 0 10px;
  font-size: 14px;
  color: var(--accent-cyan);
}
.text-block {
  font-size: 14px;
  line-height: 1.65;
  color: var(--text-secondary);
}
.text-block.pre {
  white-space: pre-wrap;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 13px;
}
.cause-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cause-list li {
  padding: 14px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
}
.cause-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.cause-title {
  font-weight: 600;
  font-size: 14px;
}
.badge {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(139, 92, 246, 0.2);
  color: var(--accent-purple);
}
.cause-sub {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.5;
}
.rec-list {
  margin: 0;
  padding-left: 20px;
  color: var(--text-secondary);
  line-height: 1.7;
  font-size: 14px;
}
.disclaimer {
  margin: 20px 0 0;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
  font-size: 12px;
  color: var(--text-muted);
}
</style>
