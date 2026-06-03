<template>
  <Teleport to="body">
    <div v-if="open" class="nod-mask" @click.self="emitClose">
      <aside class="nod-panel ds-drawer" role="dialog" aria-modal="true" @click.stop>
        <header class="nod-head">
          <h2 class="nod-title">{{ variant === 'update' ? '编辑数据源' : '创建数据源' }}</h2>
          <button type="button" class="nod-x" aria-label="关闭" @click="emitClose">×</button>
        </header>

        <div class="ds-steps" aria-label="步骤">
          <button
            type="button"
            class="ds-step"
            :class="{ active: currentStep === 0, done: currentStep > 0 }"
            :disabled="lockStep"
            @click="!lockStep && (currentStep = 0)"
          >
            1 选择数据源
          </button>
          <span class="ds-step-sep" aria-hidden="true">→</span>
          <span class="ds-step" :class="{ active: currentStep === 1 }">2 配置数据源</span>
        </div>

        <div class="nod-body ds-body">
          <p v-if="formError" class="nod-err">{{ formError }}</p>

          <!-- 步骤 0 -->
          <div v-show="currentStep === 0" class="ds-type-grid">
            <button
              v-for="t in DATASOURCE_TYPE_CARDS"
              :key="t.value"
              type="button"
              class="ds-type-card"
              @click="selectType(t.value)"
            >
              <span class="ds-type-abbr">{{ typeAbbr(t.value) }}</span>
              <span class="ds-type-label">{{ t.label }}</span>
            </button>
          </div>

          <!-- 步骤 1 -->
          <div v-show="currentStep === 1" class="ds-form">
            <label class="nod-field">
              <span>数据源名称 <em class="req">*</em></span>
              <input
                :value="form.name"
                class="nod-input"
                placeholder="不允许空格"
                autocomplete="off"
                @input="onNameInput"
                @keydown="onNameKeydown"
              >
            </label>

            <p class="ds-hint">
              标签（最多 10 条，键值均必填；空行可删）会进入告警事件外部标签。
            </p>
            <div v-for="(row, li) in form.labels" :key="'lb-' + li" class="ds-kv-row">
              <input v-model="row.key" class="nod-input sm" placeholder="key" @blur="trimRow(row, 'key')">
              <input v-model="row.value" class="nod-input sm" placeholder="value" @blur="trimRow(row, 'value')">
              <button
                v-if="form.labels.length > 1"
                type="button"
                class="nop-btn sm"
                @click="removeLabelRow(li)"
              >
                删
              </button>
            </div>
            <button
              v-if="form.labels.length < 10"
              type="button"
              class="nop-btn sm ghost"
              @click="addLabelRow"
            >
              + 标签行
            </button>

            <input v-model="form.type" type="hidden" aria-hidden="true">

            <label class="nod-field">
              <span>描述</span>
              <textarea v-model="form.description" class="nod-input ta" rows="2" placeholder="可选" />
            </label>

            <label v-if="variant === 'create'" class="nod-field chk">
              <input v-model="enabled" type="checkbox">
              <span>启用</span>
            </label>
            <p v-else class="ds-field-hint">是否启用请在数据源列表中切换，无需在此编辑。</p>

            <!-- HTTP 类 -->
            <template v-if="isHttpType">
              <h3 class="ds-section-title">HTTP</h3>
              <label class="nod-field">
                <span>URL <em class="req">*</em></span>
                <input v-model="form.http.url" class="nod-input" placeholder="https://example.com" autocomplete="off">
              </label>
              <p class="ds-field-hint">必须以 http(s) 开头且不能以 / 结尾。</p>
              <label class="nod-field">
                <span>超时（秒）<em class="req">*</em></span>
                <input v-model.number="form.http.timeout" class="nod-input" type="number" min="0" step="1">
              </label>

              <template v-if="form.type !== 'ElasticSearch'">
                <p class="ds-hint">HTTP 请求头（最多 10 条）</p>
                <div v-for="(row, hi) in form.httpHeaders" :key="'hh-' + hi" class="ds-kv-row">
                  <input v-model="row.key" class="nod-input sm" placeholder="Header 名" @blur="trimRow(row, 'key')">
                  <input v-model="row.value" class="nod-input sm" placeholder="值" @blur="trimRow(row, 'value')">
                  <button
                    v-if="form.httpHeaders.length > 1"
                    type="button"
                    class="nop-btn sm"
                    @click="removeHeaderRow(hi)"
                  >
                    删
                  </button>
                </div>
                <button
                  v-if="form.httpHeaders.length < 10"
                  type="button"
                  class="nop-btn sm ghost"
                  @click="addHeaderRow"
                >
                  + 请求头
                </button>
              </template>

              <div class="ds-radio-row">
                <span>认证</span>
                <label><input v-model="authState" type="radio" value="Off"> 不认证</label>
                <label><input v-model="authState" type="radio" value="On"> 认证</label>
              </div>
              <template v-if="authState === 'On'">
                <label class="nod-field">
                  <span>用户名 <em class="req">*</em></span>
                  <input v-model="form.auth.user" class="nod-input" autocomplete="username">
                </label>
                <label class="nod-field">
                  <span>密码 <em class="req">*</em></span>
                  <input v-model="form.auth.pass" class="nod-input" type="password" autocomplete="new-password">
                </label>
              </template>

              <template v-if="form.type === 'Prometheus'">
                <h3 class="ds-section-title">Remote write</h3>
                <p class="ds-field-hint">启用后需填写 Remote write URL（规则同主 URL）。</p>
                <div class="ds-radio-row">
                  <span>Write</span>
                  <label><input v-model="writeState" type="radio" value="Off"> 禁用</label>
                  <label><input v-model="writeState" type="radio" value="On"> 启用</label>
                </div>
                <label v-if="writeState === 'On'" class="nod-field">
                  <span>Write URL <em class="req">*</em></span>
                  <input v-model="form.write.url" class="nod-input" placeholder="https://..." autocomplete="off">
                </label>

                <h3 class="ds-section-title">本地 prometheus.yml 与热重载</h3>
                <p class="ds-field-hint">
                  下方 YAML 仅保存在本机浏览器（localStorage），不会随「提交」写入后端；用于对照、复制到服务器上的配置文件。
                  热重载为浏览器直连 <code class="ds-code">POST …/-/reload</code>（需 Prometheus 启用
                  <code class="ds-code">--web.enable-lifecycle</code>）。若控制台出现 CORS 错误，需 Prometheus 或反向代理放行跨域，或将 UI 与 Prometheus 部署为同站。
                </p>
                <textarea
                  v-model="promLocal.yaml"
                  class="nod-input ds-yaml ds-yaml-prom"
                  spellcheck="false"
                  placeholder="# global:&#10;#   scrape_interval: 15s&#10;scrape_configs: []&#10;"
                />
                <label class="nod-field">
                  <span>热重载 URL（可选，覆盖下面推导地址）</span>
                  <input
                    v-model="promLocal.reloadOverride"
                    class="nod-input"
                    placeholder="留空则根据上方「URL」推导，例如 http://10.0.0.1:9099/-/reload"
                    autocomplete="off"
                  >
                </label>
                <p class="ds-field-hint">
                  将请求：<span class="ds-prom-effective">{{ effectiveReloadUrl || '—（请先填写 URL）' }}</span>
                </p>
                <div class="ds-prom-actions">
                  <button
                    type="button"
                    class="nop-btn primary"
                    :disabled="prometheusReloading || !form.http.url.trim()"
                    @click="handlePrometheusReload"
                  >
                    {{ prometheusReloading ? '请求中…' : 'POST /-/reload（热重载）' }}
                  </button>
                </div>
              </template>
            </template>

            <!-- ClickHouse -->
            <template v-else-if="form.type === 'ClickHouse'">
              <h3 class="ds-section-title">ClickHouse</h3>
              <label class="nod-field">
                <span>地址 <em class="req">*</em></span>
                <input v-model="form.clickhouseConfig.addr" class="nod-input" placeholder="host:9000 或多个地址">
              </label>
              <label class="nod-field">
                <span>超时（秒）<em class="req">*</em></span>
                <input v-model.number="form.clickhouseConfig.timeout" class="nod-input" type="number" min="0" step="1">
              </label>
              <div class="ds-radio-row">
                <span>认证</span>
                <label><input v-model="authState" type="radio" value="Off"> 不认证</label>
                <label><input v-model="authState" type="radio" value="On"> 认证</label>
              </div>
              <template v-if="authState === 'On'">
                <label class="nod-field">
                  <span>用户名 <em class="req">*</em></span>
                  <input v-model="form.auth.user" class="nod-input" autocomplete="username">
                </label>
                <label class="nod-field">
                  <span>密码 <em class="req">*</em></span>
                  <input v-model="form.auth.pass" class="nod-input" type="password" autocomplete="new-password">
                </label>
              </template>
            </template>

            <!-- AliCloud SLS -->
            <template v-else-if="form.type === 'AliCloudSLS'">
              <h3 class="ds-section-title">阿里云 SLS</h3>
              <label class="nod-field">
                <span>Endpoint <em class="req">*</em></span>
                <input v-model="form.dsAliCloudConfig.alicloudEndpoint" class="nod-input" autocomplete="off">
              </label>
              <label class="nod-field">
                <span>AccessKey <em class="req">*</em></span>
                <input v-model="form.dsAliCloudConfig.alicloudAk" class="nod-input" type="password" autocomplete="off">
              </label>
              <label class="nod-field">
                <span>SecretKey <em class="req">*</em></span>
                <input v-model="form.dsAliCloudConfig.alicloudSk" class="nod-input" type="password" autocomplete="off">
              </label>
            </template>

            <!-- CloudWatch -->
            <template v-else-if="form.type === 'CloudWatch'">
              <h3 class="ds-section-title">AWS CloudWatch</h3>
              <label class="nod-field">
                <span>Region <em class="req">*</em></span>
                <input v-model="form.awsCloudwatch.region" class="nod-input" placeholder="ap-southeast-1">
              </label>
              <label class="nod-field">
                <span>Access Key <em class="req">*</em></span>
                <input v-model="form.awsCloudwatch.accessKey" class="nod-input" autocomplete="off">
              </label>
              <label class="nod-field">
                <span>Secret Key <em class="req">*</em></span>
                <input v-model="form.awsCloudwatch.secretKey" class="nod-input" type="password" autocomplete="off">
              </label>
            </template>

            <!-- Kubernetes -->
            <template v-else-if="form.type === 'Kubernetes'">
              <h3 class="ds-section-title">kubeConfig（YAML）</h3>
              <textarea
                v-model="form.kubeConfig"
                class="nod-input ds-yaml"
                spellcheck="false"
                placeholder="apiVersion: v1&#10;kind: Config&#10;..."
              />
            </template>
          </div>
        </div>

        <footer class="ds-footer">
          <template v-if="currentStep === 0">
            <button type="button" class="nop-btn" @click="emitClose">取消</button>
          </template>
          <template v-else>
            <div class="ds-footer-left">
              <button type="button" class="nop-btn ghost" :disabled="submitting" @click="handleTestConnection">
                连接测试
              </button>
              <button
                v-if="form.type === 'Prometheus'"
                type="button"
                class="nop-btn ghost"
                :disabled="submitting || prometheusReloading || !form.http.url.trim()"
                title="与上方「POST /-/reload」相同，从浏览器直连 Prometheus"
                @click="handlePrometheusReload"
              >
                {{ prometheusReloading ? '热重载中…' : 'Prometheus 热重载' }}
              </button>
            </div>
            <div class="ds-footer-right">
              <button type="button" class="nop-btn" :disabled="lockStep" @click="goPrevStep">上一步</button>
              <button type="button" class="nop-btn primary" :disabled="submitting" @click="handleSubmit">
                {{ submitting ? '提交中…' : '提交' }}
              </button>
            </div>
          </template>
        </footer>
      </aside>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import {
  createDatasource,
  datasourcePing,
  updateDatasource
} from '@/api/datasource'
import {
  DATASOURCE_HTTP_TYPES,
  DATASOURCE_TYPE_CARDS,
  DATASOURCE_HTTP_URL_RE
} from '@/constants/datasourceTypes'
import {
  postPrometheusLifecycleReload,
  prometheusReloadUrlFromQueryUrl
} from '@/utils/prometheusLifecycle'

const props = defineProps({
  open: { type: Boolean, default: false },
  variant: { type: String, default: 'create' },
  /** @type {import('vue').PropType<Record<string, unknown>|null>} */
  record: { type: Object, default: null }
})

const emit = defineEmits(['close', 'success', 'toast'])

function emitClose() {
  emit('close')
}

const currentStep = ref(0)
const lockStep = ref(false)
const enabled = ref(true)
const authState = ref('Off')
const writeState = ref('Off')
const formError = ref('')
const submitting = ref(false)

const form = reactive({
  type: '',
  name: '',
  description: '',
  labels: /** @type {{ key: string, value: string }[]} */ ([{ key: '', value: '' }]),
  http: { url: '', timeout: 30 },
  httpHeaders: /** @type {{ key: string, value: string }[]} */ ([{ key: '', value: '' }]),
  auth: { user: '', pass: '' },
  write: { url: '' },
  clickhouseConfig: { addr: '', timeout: 30 },
  dsAliCloudConfig: { alicloudEndpoint: '', alicloudAk: '', alicloudSk: '' },
  awsCloudwatch: { region: '', accessKey: '', secretKey: '' },
  kubeConfig: '',
  /** 编辑回填透传 */
  elasticSearch: /** @type {unknown} */ (null)
})

/** Prometheus 本地草稿（仅浏览器，不走数据源保存接口） */
const promLocal = reactive({ yaml: '', reloadOverride: '' })
const prometheusReloading = ref(false)
const skipPromLocalPersist = ref(false)
let promLocalSaveTimer = 0

const promLocalStorageKey = computed(() => {
  if (!props.open || form.type !== 'Prometheus') return ''
  if (props.variant === 'update' && props.record && props.record.id != null) {
    return `syswatch.prom-local.v1:id:${props.record.id}`
  }
  return 'syswatch.prom-local.v1:draft'
})

const effectiveReloadUrl = computed(() => {
  const o = String(promLocal.reloadOverride || '').trim()
  if (o) return o
  const base = String(form.http.url || '').trim()
  if (!base) return ''
  try {
    return prometheusReloadUrlFromQueryUrl(base)
  } catch {
    return ''
  }
})

function loadPromLocalFromStorage() {
  const key = promLocalStorageKey.value
  if (!key) return
  skipPromLocalPersist.value = true
  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      promLocal.yaml = ''
      promLocal.reloadOverride = ''
    } else {
      const j = JSON.parse(raw) as { prometheusYml?: string; reloadUrlOverride?: string }
      promLocal.yaml = typeof j.prometheusYml === 'string' ? j.prometheusYml : ''
      promLocal.reloadOverride = typeof j.reloadUrlOverride === 'string' ? j.reloadUrlOverride : ''
    }
  } catch {
    promLocal.yaml = ''
    promLocal.reloadOverride = ''
  }
  void nextTick(() => {
    skipPromLocalPersist.value = false
  })
}

function persistPromLocalNow() {
  const key = promLocalStorageKey.value
  if (!key || skipPromLocalPersist.value) return
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ prometheusYml: promLocal.yaml, reloadUrlOverride: promLocal.reloadOverride })
    )
  } catch {
    /* quota / private mode */
  }
}

function schedulePersistPromLocal() {
  window.clearTimeout(promLocalSaveTimer)
  promLocalSaveTimer = window.setTimeout(() => persistPromLocalNow(), 450)
}

watch(
  () => ({ open: props.open, key: promLocalStorageKey.value }),
  ({ open, key }) => {
    if (!open || !key) return
    loadPromLocalFromStorage()
  },
  { immediate: true }
)

watch(
  () => [promLocal.yaml, promLocal.reloadOverride],
  () => {
    if (!promLocalStorageKey.value || skipPromLocalPersist.value) return
    schedulePersistPromLocal()
  },
  { deep: true }
)

const isHttpType = computed(() => DATASOURCE_HTTP_TYPES.has(form.type))

function typeAbbr(t) {
  const map = {
    Prometheus: 'PR',
    VictoriaMetrics: 'VI',
    ElasticSearch: 'ES',
    Kubernetes: 'KU',
    Loki: 'LO'
  }
  if (t && map[t]) return map[t]
  if (!t) return '?'
  if (t === 'AliCloudSLS') return 'SLS'
  if (t === 'VictoriaLogs') return 'VL'
  if (t === 'ClickHouse') return 'CH'
  return String(t).slice(0, 2).toUpperCase()
}

function trimRow(row, k) {
  row[k] = String(row[k] ?? '').trim()
}

function emptyForm() {
  form.type = ''
  form.name = ''
  form.description = ''
  form.labels = [{ key: '', value: '' }]
  form.http = { url: '', timeout: 30 }
  form.httpHeaders = [{ key: '', value: '' }]
  form.auth = { user: '', pass: '' }
  form.write = { url: '' }
  form.clickhouseConfig = { addr: '', timeout: 30 }
  form.dsAliCloudConfig = { alicloudEndpoint: '', alicloudAk: '', alicloudSk: '' }
  form.awsCloudwatch = { region: '', accessKey: '', secretKey: '' }
  form.kubeConfig = ''
  form.elasticSearch = null
}

function objToKv(obj) {
  if (!obj || typeof obj !== 'object') return [{ key: '', value: '' }]
  const keys = Object.keys(obj)
  if (!keys.length) return [{ key: '', value: '' }]
  return keys.map((k) => ({ key: k, value: String(obj[k] ?? '') }))
}

function selectType(t) {
  form.type = t
  formError.value = ''
  currentStep.value = 1
}

function onNameKeydown(e) {
  if (e.key === ' ') e.preventDefault()
}

function onNameInput(e) {
  const t = e.target
  form.name = String(t.value || '').replace(/\s+/g, '')
}

function addLabelRow() {
  if (form.labels.length >= 10) return
  form.labels.push({ key: '', value: '' })
}

function removeLabelRow(i) {
  form.labels.splice(i, 1)
  if (!form.labels.length) form.labels.push({ key: '', value: '' })
}

function addHeaderRow() {
  if (form.httpHeaders.length >= 10) return
  form.httpHeaders.push({ key: '', value: '' })
}

function removeHeaderRow(i) {
  form.httpHeaders.splice(i, 1)
  if (!form.httpHeaders.length) form.httpHeaders.push({ key: '', value: '' })
}

function goPrevStep() {
  if (lockStep.value) return
  formError.value = ''
  currentStep.value = 0
}

function kvListToObject(rows) {
  const o = /** @type {Record<string, string>} */ ({})
  for (const row of rows) {
    const k = String(row.key ?? '').trim()
    const v = String(row.value ?? '').trim()
    if (!k) continue
    o[k] = v
  }
  return o
}

function validateLabels() {
  const rows = form.labels.filter((r) => String(r.key).trim() || String(r.value).trim())
  if (rows.length > 10) return '标签最多 10 条'
  for (const r of rows) {
    const k = String(r.key ?? '').trim()
    const v = String(r.value ?? '').trim()
    if (!k || !v) return '标签各行键、值均必填（可删空行）'
  }
  return ''
}

function validateHeaders() {
  if (form.type === 'ElasticSearch') return ''
  const rows = form.httpHeaders.filter((r) => String(r.key).trim() || String(r.value).trim())
  if (rows.length > 10) return '请求头最多 10 条'
  for (const r of rows) {
    const k = String(r.key ?? '').trim()
    const v = String(r.value ?? '').trim()
    if (!k || !v) return '请求头各行键、值均必填'
  }
  return ''
}

function validateHttpUrl(label, url) {
  const u = String(url || '').trim()
  if (!u) return `${label} 不能为空`
  if (!DATASOURCE_HTTP_URL_RE.test(u)) return `${label} 格式无效（需 http(s) 且不能以 / 结尾）`
  return ''
}

function validateStep1() {
  formError.value = ''
  const name = form.name.trim()
  if (!name) {
    formError.value = '请填写数据源名称'
    return false
  }
  if (/\s/.test(name)) {
    formError.value = '名称不能包含空格'
    return false
  }
  if (!form.type) {
    formError.value = '请选择数据源类型'
    return false
  }
  const le = validateLabels()
  if (le) {
    formError.value = le
    return false
  }

  if (isHttpType.value) {
    const u1 = validateHttpUrl('URL', form.http.url)
    if (u1) {
      formError.value = u1
      return false
    }
    if (!Number.isFinite(Number(form.http.timeout)) || Number(form.http.timeout) < 0) {
      formError.value = 'HTTP 超时须为非负数字'
      return false
    }
    const he = validateHeaders()
    if (he) {
      formError.value = he
      return false
    }
    if (authState.value === 'On') {
      if (!form.auth.user.trim() || !form.auth.pass) {
        formError.value = '请填写认证用户名与密码'
        return false
      }
    }
    if (form.type === 'Prometheus' && writeState.value === 'On') {
      const uw = validateHttpUrl('Write URL', form.write.url)
      if (uw) {
        formError.value = uw
        return false
      }
    }
    return true
  }

  if (form.type === 'ClickHouse') {
    if (!form.clickhouseConfig.addr.trim()) {
      formError.value = '请填写 ClickHouse 地址'
      return false
    }
    if (!Number.isFinite(Number(form.clickhouseConfig.timeout)) || Number(form.clickhouseConfig.timeout) < 0) {
      formError.value = '超时须为非负数字'
      return false
    }
    if (authState.value === 'On' && (!form.auth.user.trim() || !form.auth.pass)) {
      formError.value = '请填写认证用户名与密码'
      return false
    }
    return true
  }

  if (form.type === 'AliCloudSLS') {
    const c = form.dsAliCloudConfig
    if (!c.alicloudEndpoint.trim() || !c.alicloudAk.trim() || !c.alicloudSk.trim()) {
      formError.value = '请填写 Endpoint、AK、SK'
      return false
    }
    return true
  }

  if (form.type === 'CloudWatch') {
    const a = form.awsCloudwatch
    if (!a.region.trim() || !a.accessKey.trim() || !a.secretKey.trim()) {
      formError.value = '请填写 Region、Access Key、Secret Key'
      return false
    }
    return true
  }

  if (form.type === 'Kubernetes') {
    if (!form.kubeConfig.trim()) {
      formError.value = '请填写 kubeConfig'
      return false
    }
    return true
  }

  formError.value = '未实现的类型校验'
  return false
}

function buildPayload() {
  const labelsObj = kvListToObject(form.labels)
  /** @type {Record<string, unknown>} */
  const params = {
    name: form.name.trim(),
    type: form.type,
    description: form.description.trim() || undefined,
    labels: labelsObj,
    enabled: enabled.value
  }

  if (form.elasticSearch != null) {
    params.elasticSearch = form.elasticSearch
  }

  if (isHttpType.value) {
    const headersObj = kvListToObject(form.httpHeaders)
    params.http = {
      url: form.http.url.trim(),
      timeout: Number(form.http.timeout),
      ...(form.type !== 'ElasticSearch' && Object.keys(headersObj).length ? { headers: headersObj } : {})
    }
    if (authState.value === 'On') {
      params.auth = { user: form.auth.user.trim(), pass: form.auth.pass }
    }
    if (form.type === 'Prometheus') {
      params.write = {
        enabled: writeState.value === 'On',
        url: writeState.value === 'On' ? form.write.url.trim() : ''
      }
    }
  } else if (form.type === 'ClickHouse') {
    params.clickhouseConfig = {
      addr: form.clickhouseConfig.addr.trim(),
      timeout: Number(form.clickhouseConfig.timeout)
    }
    if (authState.value === 'On') {
      params.auth = { user: form.auth.user.trim(), pass: form.auth.pass }
    }
  } else if (form.type === 'AliCloudSLS') {
    params.dsAliCloudConfig = { ...form.dsAliCloudConfig }
  } else if (form.type === 'CloudWatch') {
    params.awsCloudwatch = { ...form.awsCloudwatch }
  } else if (form.type === 'Kubernetes') {
    params.kubeConfig = form.kubeConfig
  }

  return params
}

function applyRecord(row) {
  emptyForm()
  if (!row) return
  form.type = String(row.type || '')
  form.name = String(row.name || '')
  form.description = String(row.description || '')
  form.labels = objToKv(
    row.labels && typeof row.labels === 'object' && !Array.isArray(row.labels) ? row.labels : {}
  )
  enabled.value = row.enabled !== false && row.enabled !== 0

  const http = row.http && typeof row.http === 'object' ? row.http : {}
  form.http.url = String(http.url || '')
  form.http.timeout = Number(http.timeout) || 30
  form.httpHeaders = objToKv(
    http.headers && typeof http.headers === 'object' && !Array.isArray(http.headers) ? http.headers : {}
  )

  const auth = row.auth && typeof row.auth === 'object' ? row.auth : {}
  if (auth.user || auth.pass) {
    authState.value = 'On'
    form.auth.user = String(auth.user || '')
    form.auth.pass = String(auth.pass || '')
  } else {
    authState.value = 'Off'
  }

  const wr = row.write && typeof row.write === 'object' ? row.write : {}
  const wOn = wr.enabled === true || wr.enabled === 'On' || wr.enabled === 1
  writeState.value = wOn ? 'On' : 'Off'
  form.write.url = String(wr.url || '')

  const ch = row.clickhouseConfig && typeof row.clickhouseConfig === 'object' ? row.clickhouseConfig : {}
  form.clickhouseConfig.addr = String(ch.addr ?? ch.Addr ?? '')
  form.clickhouseConfig.timeout = Number(ch.timeout ?? ch.Timeout) || 30

  const ali =
    row.dsAliCloudConfig && typeof row.dsAliCloudConfig === 'object'
      ? row.dsAliCloudConfig
      : {
          alicloudEndpoint: row.alicloudEndpoint,
          alicloudAk: row.alicloudAk,
          alicloudSk: row.alicloudSk
        }
  form.dsAliCloudConfig.alicloudEndpoint = String(ali?.alicloudEndpoint ?? '')
  form.dsAliCloudConfig.alicloudAk = String(ali?.alicloudAk ?? '')
  form.dsAliCloudConfig.alicloudSk = String(ali?.alicloudSk ?? '')

  const aws = row.awsCloudwatch && typeof row.awsCloudwatch === 'object' ? row.awsCloudwatch : {}
  form.awsCloudwatch.region = String(aws.region || '')
  form.awsCloudwatch.accessKey = String(aws.accessKey || '')
  form.awsCloudwatch.secretKey = String(aws.secretKey || '')

  form.kubeConfig = String(row.kubeConfig || '')
  form.elasticSearch = row.elasticSearch ?? null
}

watch(
  () => [props.open, props.variant, props.record],
  () => {
    if (!props.open) return
    formError.value = ''
    if (props.variant === 'update' && props.record) {
      lockStep.value = true
      currentStep.value = 1
      applyRecord(props.record)
    } else {
      lockStep.value = false
      currentStep.value = 0
      emptyForm()
      enabled.value = true
      authState.value = 'Off'
      writeState.value = 'Off'
    }
  },
  { immediate: true }
)

async function handleTestConnection() {
  if (!validateStep1()) return
  submitting.value = true
  try {
    const body = buildPayload()
    if (props.variant === 'update' && props.record && props.record.id != null) {
      body.id = props.record.id
    }
    await datasourcePing(body)
    emit('toast', { message: '数据源测试通过', type: 'success' })
  } catch (e) {
    formError.value = e instanceof Error ? e.message : '连接测试失败'
    emit('toast', { message: formError.value, type: 'error' })
  } finally {
    submitting.value = false
  }
}

async function handlePrometheusReload() {
  const base = String(form.http.url || '').trim()
  if (!base) {
    emit('toast', { message: '请先填写 Prometheus URL', type: 'error' })
    return
  }
  const ro = String(promLocal.reloadOverride || '').trim()
  if (ro) {
    const err = validateHttpUrl('热重载 URL', ro)
    if (err) {
      emit('toast', { message: err, type: 'error' })
      return
    }
  }
  prometheusReloading.value = true
  try {
    const extra = form.type !== 'ElasticSearch' ? kvListToObject(form.httpHeaders) : {}
    const timeoutMs = Math.max(1000, (Number(form.http.timeout) || 30) * 1000)
    const r = await postPrometheusLifecycleReload({
      queryBaseUrl: base,
      reloadUrl: ro || undefined,
      timeoutMs,
      basicUser: authState.value === 'On' ? form.auth.user.trim() : undefined,
      basicPass: authState.value === 'On' ? form.auth.pass : undefined,
      extraHeaders: Object.keys(extra).length ? extra : undefined
    })
    if (r.ok) {
      emit('toast', { message: `热重载已接受（HTTP ${r.status}）`, type: 'success' })
    } else {
      emit('toast', {
        message: `热重载失败：HTTP ${r.status} ${r.statusText || ''}`.trim(),
        type: 'error'
      })
    }
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.name === 'AbortError'
          ? '热重载请求超时'
          : e.message.includes('Failed to fetch') || e.message.includes('NetworkError')
            ? '请求失败（多为 CORS 或网络不可达）'
            : e.message
        : '热重载请求失败'
    emit('toast', { message: msg, type: 'error' })
  } finally {
    prometheusReloading.value = false
  }
}

async function handleSubmit() {
  if (!validateStep1()) return
  submitting.value = true
  formError.value = ''
  try {
    const body = buildPayload()
    if (props.variant === 'update' && props.record && props.record.id != null) {
      await updateDatasource({ ...body, id: props.record.id })
      emit('toast', { message: '数据源更新成功', type: 'success' })
    } else {
      await createDatasource(body)
      emit('toast', { message: '数据源创建成功', type: 'success' })
    }
    emit('success')
    emitClose()
  } catch (e) {
    formError.value = e instanceof Error ? e.message : '提交失败'
    emit('toast', { message: formError.value, type: 'error' })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.ds-drawer.nod-panel {
  width: min(1080px, 100vw);
}
.ds-drawer.nod-panel .nod-head {
  padding: 22px 28px;
}
.ds-drawer.nod-panel .nod-title {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text-primary, #0f172a);
}
.ds-drawer.nod-panel .nod-x {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  transition:
    background 0.18s ease,
    color 0.18s ease,
    transform 0.12s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.ds-drawer.nod-panel .nod-x:hover {
  background: #f1f5f9;
  color: #0f172a;
}
.ds-drawer.nod-panel .nod-x:active {
  transform: scale(0.94);
}
.ds-drawer.nod-panel .nod-body {
  padding: 20px 28px 24px;
}
.ds-drawer.nod-panel .nod-field {
  margin-bottom: 18px;
  font-size: 15px;
  gap: 8px;
  color: var(--text-primary, #334155);
}
.ds-drawer.nod-panel .nod-input {
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 15px;
  line-height: 1.45;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}
.ds-drawer.nod-panel .nod-input:hover:not(:disabled) {
  border-color: #cbd5e1;
}
.ds-drawer.nod-panel .nod-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}
.ds-drawer.nod-panel .nod-input.sm {
  padding: 10px 14px;
  font-size: 14px;
  border-radius: 12px;
}
.ds-drawer.nod-panel .nod-err {
  font-size: 14px;
  margin-bottom: 14px;
  padding: 10px 14px;
  border-radius: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
}
/* 抽屉内按钮：更圆、更大、hover/active 反馈（不影响其它页面 .nop-btn） */
.ds-drawer.nod-panel .nop-btn {
  padding: 11px 20px;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.01em;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition:
    transform 0.14s ease,
    box-shadow 0.18s ease,
    background 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease;
}
.ds-drawer.nod-panel .nop-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.35);
}
.ds-drawer.nod-panel .nop-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.1);
  border-color: #cbd5e1;
}
.ds-drawer.nod-panel .nop-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
}
.ds-drawer.nod-panel .nop-btn.primary {
  background: #1d4ed8;
  color: #fff;
  border-color: #1d4ed8;
}
.ds-drawer.nod-panel .nop-btn.primary:hover:not(:disabled) {
  background: #1e40af;
  border-color: #1e40af;
  box-shadow: 0 8px 20px rgba(29, 78, 216, 0.35);
}
.ds-drawer.nod-panel .nop-btn.primary:active:not(:disabled) {
  background: #1e3a8a;
  border-color: #1e3a8a;
}
.ds-drawer.nod-panel .nop-btn.ghost {
  background: #f8fafc;
  border-color: #e2e8f0;
  color: #475569;
}
.ds-drawer.nod-panel .nop-btn.ghost:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #334155;
}
.ds-drawer.nod-panel .nop-btn.sm {
  padding: 8px 16px;
  font-size: 14px;
  border-radius: 12px;
}
.ds-steps {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 28px 0;
  font-size: 15px;
  color: #64748b;
}
.ds-step {
  border: none;
  background: none;
  padding: 8px 14px;
  border-radius: 999px;
  cursor: pointer;
  color: inherit;
  font-size: inherit;
  font-weight: 500;
  transition:
    background 0.18s ease,
    color 0.18s ease,
    transform 0.12s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.ds-step:hover:not(:disabled) {
  background: #f1f5f9;
  color: #475569;
}
.ds-step:active:not(:disabled) {
  transform: scale(0.97);
}
.ds-step.active {
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 600;
}
.ds-step.done {
  color: #0d9488;
}
.ds-step:disabled {
  opacity: 0.5;
  cursor: default;
}
.ds-step-sep {
  color: #cbd5e1;
  font-size: 14px;
}
.ds-body {
  flex: 1;
  overflow: auto;
  padding-bottom: 16px;
}
.ds-type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
  gap: 16px;
  padding: 12px 0 0;
}
.ds-type-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 22px 14px;
  border: 1px solid var(--border-default, #e5e7eb);
  border-radius: 16px;
  background: #fff;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.14s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.ds-type-card:hover {
  border-color: #93c5fd;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}
.ds-type-card:active {
  transform: scale(0.98);
}
.ds-type-abbr {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 700;
  color: #475569;
}
.ds-type-label {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  text-align: center;
  line-height: 1.35;
}
.ds-form {
  padding-top: 8px;
}
.ds-section-title {
  margin: 22px 0 12px;
  font-size: 17px;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: -0.01em;
}
.ds-hint,
.ds-field-hint {
  font-size: 14px;
  line-height: 1.5;
  color: #64748b;
  margin: 0 0 10px;
}
.ds-kv-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}
.ds-kv-row .nod-input.sm {
  flex: 1;
  min-width: 140px;
}
.ds-radio-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px 24px;
  margin: 14px 0;
  font-size: 15px;
}
.ds-radio-row label {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.ds-yaml {
  min-height: 480px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
}
.ds-yaml-prom {
  min-height: 260px;
}
.ds-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  background: #f1f5f9;
  padding: 1px 6px;
  border-radius: 6px;
}
.ds-prom-effective {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  word-break: break-all;
  color: #0f172a;
}
.ds-prom-actions {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}
.nod-field.chk {
  display: flex;
  align-items: center;
  gap: 10px;
}
.nod-field.chk input[type='checkbox'] {
  width: 18px;
  height: 18px;
  accent-color: #1d4ed8;
  cursor: pointer;
}
.nod-input.ta {
  resize: vertical;
  min-height: 72px;
}
.req {
  color: #b91c1c;
  font-style: normal;
}
.ds-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  padding: 20px 28px 22px;
  border-top: 1px solid var(--border-default, #e5e7eb);
  background: linear-gradient(180deg, #fafbfc 0%, #f4f6f8 100%);
}
.ds-footer .ds-footer-left {
  margin-right: auto;
}
.ds-footer-right {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
</style>

<style>
.nop-page .nod-mask,
.nod-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  z-index: 1100;
  display: flex;
  justify-content: flex-end;
}
.nop-page .nod-panel,
.nod-panel {
  max-width: 100vw;
  height: 100%;
  background: var(--bg-surface, #fff);
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
}
.nop-page .nod-head,
.nod-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-default, #e5e7eb);
}
.nop-page .nod-title,
.nod-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.nop-page .nod-x,
.nod-x {
  border: none;
  background: none;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  color: #64748b;
}
.nod-body {
  padding: 12px 20px;
  flex: 1;
  overflow: auto;
}
.nod-err {
  color: #b91c1c;
  font-size: 13px;
  margin-bottom: 10px;
}
.nod-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 13px;
}
.nod-input {
  padding: 8px 10px;
  border: 1px solid var(--border-default, #e5e7eb);
  border-radius: 8px;
  font-size: 13px;
  box-sizing: border-box;
}
.nop-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-default, #e5e7eb);
  background: #fff;
  font-size: 13px;
  cursor: pointer;
}
.nop-btn.primary {
  background: #111827;
  color: #fff;
  border-color: #111827;
}
.nop-btn.ghost {
  background: #f8fafc;
}
.nop-btn.sm {
  padding: 4px 10px;
  font-size: 12px;
}
.nop-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
