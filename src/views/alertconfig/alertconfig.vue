<template>
  <div class="alertconfig-page">
    <div class="config-grid">
      <!-- Threshold Settings -->
      <div class="config-card">
        <div class="card-header">
          <div class="card-icon cyan">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </div>
          <div>
            <h3 class="card-title">阈值配置</h3>
            <p class="card-desc">设置各项指标的告警阈值</p>
          </div>
        </div>
        <div class="card-body">
          <div class="threshold-item" v-for="threshold in thresholds" :key="threshold.key">
            <div class="threshold-info">
              <span class="threshold-name">{{ threshold.name }}</span>
              <span class="threshold-desc">{{ threshold.description }}</span>
            </div>
            <div class="threshold-inputs">
              <div class="input-group">
                <label>警告</label>
                <div class="input-wrapper">
                  <input 
                    type="number" 
                    v-model="threshold.warning" 
                    class="threshold-input warning"
                  >
                  <span class="input-unit">{{ threshold.unit }}</span>
                </div>
              </div>
              <div class="input-group">
                <label>严重</label>
                <div class="input-wrapper">
                  <input 
                    type="number" 
                    v-model="threshold.critical" 
                    class="threshold-input critical"
                  >
                  <span class="input-unit">{{ threshold.unit }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Alert Toggles -->
      <div class="config-card">
        <div class="card-header">
          <div class="card-icon purple">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <div>
            <h3 class="card-title">告警开关</h3>
            <p class="card-desc">启用或禁用各类告警</p>
          </div>
        </div>
        <div class="card-body">
          <div class="toggle-item" v-for="toggle in alertToggles" :key="toggle.key">
            <div class="toggle-info">
              <span class="toggle-icon" v-html="toggle.icon"></span>
              <div>
                <span class="toggle-name">{{ toggle.name }}</span>
                <span class="toggle-desc">{{ toggle.description }}</span>
              </div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="toggle.enabled">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- Alert Rules -->
      <div class="config-card full-width">
        <div class="card-header">
          <div class="card-icon green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2"/>
              <polyline points="2 17 12 22 22 17"/>
              <polyline points="2 12 12 17 22 12"/>
            </svg>
          </div>
          <div>
            <h3 class="card-title">告警规则</h3>
            <p class="card-desc">管理自定义告警规则</p>
          </div>
          <button class="btn btn-primary" @click="showAddRule = true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            添加规则
          </button>
        </div>
        <div class="card-body">
          <div class="rules-table">
            <div class="table-header">
              <span class="col-status">状态</span>
              <span class="col-name">规则名称</span>
              <span class="col-condition">触发条件</span>
              <span class="col-severity">严重级别</span>
              <span class="col-duration">持续时间</span>
              <span class="col-actions">操作</span>
            </div>
            <div class="table-body">
              <div class="rule-row" v-for="rule in rules" :key="rule.id">
                <div class="col-status">
                  <span class="status-indicator" :class="rule.enabled ? 'active' : 'inactive'"></span>
                </div>
                <div class="col-name">
                  <span class="rule-name">{{ rule.name }}</span>
                  <span class="rule-desc">{{ rule.description }}</span>
                </div>
                <div class="col-condition">
                  <code class="condition-code">{{ rule.condition }}</code>
                </div>
                <div class="col-severity">
                  <span class="severity-tag" :class="rule.severity">{{ getSeverityLabel(rule.severity) }}</span>
                </div>
                <div class="col-duration">
                  <span class="duration-value">{{ rule.duration }}</span>
                </div>
                <div class="col-actions">
                  <button class="icon-btn" @click="toggleRule(rule)" :title="rule.enabled ? '禁用' : '启用'">
                    <svg v-if="rule.enabled" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="6" y="4" width="4" height="16"/>
                      <rect x="14" y="4" width="4" height="16"/>
                    </svg>
                    <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  </button>
                  <button class="icon-btn" @click="editRule(rule)" title="编辑">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button class="icon-btn delete" @click="deleteRule(rule.id)" title="删除">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Notification Settings -->
      <div class="config-card">
        <div class="card-header">
          <div class="card-icon yellow">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <div>
            <h3 class="card-title">通知设置</h3>
            <p class="card-desc">配置告警通知方式</p>
          </div>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">通知邮箱</label>
            <input type="email" class="form-input" v-model="notifySettings.email" placeholder="ops@example.com">
          </div>
          <div class="form-group">
            <label class="form-label">Webhook URL</label>
            <input type="url" class="form-input" v-model="notifySettings.webhook" placeholder="https://hooks.example.com/...">
          </div>
          <div class="form-group">
            <label class="form-label">通知频率</label>
            <select class="form-select" v-model="notifySettings.frequency">
              <option value="realtime">实时通知</option>
              <option value="5m">每5分钟汇总</option>
              <option value="15m">每15分钟汇总</option>
              <option value="1h">每小时汇总</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">静默时间段</label>
            <div class="time-range">
              <input type="time" class="form-input time-input" v-model="notifySettings.silentStart">
              <span class="time-separator">至</span>
              <input type="time" class="form-input time-input" v-model="notifySettings.silentEnd">
            </div>
          </div>
        </div>
      </div>

      <!-- Advanced Settings -->
      <div class="config-card">
        <div class="card-header">
          <div class="card-icon red">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </div>
          <div>
            <h3 class="card-title">高级设置</h3>
            <p class="card-desc">配置告警行为和策略</p>
          </div>
        </div>
        <div class="card-body">
          <div class="advanced-item">
            <div class="advanced-info">
              <span class="advanced-name">告警聚合</span>
              <span class="advanced-desc">相同类型的告警合并发送</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="advancedSettings.aggregation">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="advanced-item">
            <div class="advanced-info">
              <span class="advanced-name">自动恢复通知</span>
              <span class="advanced-desc">告警恢复时发送通知</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="advancedSettings.recoveryNotify">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="advanced-item">
            <div class="advanced-info">
              <span class="advanced-name">重复告警抑制</span>
              <span class="advanced-desc">抑制短时间内的重复告警</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="advancedSettings.suppress">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="form-group" v-if="advancedSettings.suppress">
            <label class="form-label">抑制时间 (分钟)</label>
            <input type="number" class="form-input" v-model="advancedSettings.suppressMinutes" min="1" max="60">
          </div>
          <div class="advanced-item">
            <div class="advanced-info">
              <span class="advanced-name">告警升级</span>
              <span class="advanced-desc">长时间未处理的告警自动升级</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="advancedSettings.escalation">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Save Button -->
    <div class="save-section">
      <button class="btn btn-secondary" @click="resetConfig">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="1 4 1 10 7 10"/>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
        </svg>
        重置配置
      </button>
      <button class="btn btn-primary" @click="saveConfig">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
        保存配置
      </button>
    </div>

    <!-- Add Rule Modal -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="showAddRule" @click.self="showAddRule = false">
        <div class="modal rule-modal">
          <div class="modal-header">
            <h3>{{ editingRule ? '编辑规则' : '添加规则' }}</h3>
            <button class="close-btn" @click="closeRuleModal">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">规则名称</label>
              <input type="text" class="form-input" v-model="ruleForm.name" placeholder="例如：CPU高负载告警">
            </div>
            <div class="form-group">
              <label class="form-label">规则描述</label>
              <input type="text" class="form-input" v-model="ruleForm.description" placeholder="简要描述规则用途">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">监控指标</label>
                <select class="form-select" v-model="ruleForm.metric">
                  <option value="cpu_usage">CPU 使用率</option>
                  <option value="memory_usage">内存使用率</option>
                  <option value="disk_usage">磁盘使用率</option>
                  <option value="network_in">网络入流量</option>
                  <option value="network_out">网络出流量</option>
                  <option value="load_avg">系统负载</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">比较运算符</label>
                <select class="form-select" v-model="ruleForm.operator">
                  <option value=">">大于 (>)</option>
                  <option value=">=">大于等于 (>=)</option>
                  <option value="<">小于 (<)</option>
                  <option value="<=">小于等于 (<=)</option>
                  <option value="==">等于 (==)</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">阈值</label>
                <input type="number" class="form-input" v-model="ruleForm.threshold" placeholder="80">
              </div>
              <div class="form-group">
                <label class="form-label">持续时间</label>
                <select class="form-select" v-model="ruleForm.duration">
                  <option value="1m">1 分钟</option>
                  <option value="5m">5 分钟</option>
                  <option value="10m">10 分钟</option>
                  <option value="15m">15 分钟</option>
                  <option value="30m">30 分钟</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">严重级别</label>
              <div class="severity-options">
                <label class="severity-option" :class="{ active: ruleForm.severity === 'critical' }">
                  <input type="radio" v-model="ruleForm.severity" value="critical">
                  <span class="severity-dot critical"></span>
                  严重
                </label>
                <label class="severity-option" :class="{ active: ruleForm.severity === 'warning' }">
                  <input type="radio" v-model="ruleForm.severity" value="warning">
                  <span class="severity-dot warning"></span>
                  警告
                </label>
                <label class="severity-option" :class="{ active: ruleForm.severity === 'info' }">
                  <input type="radio" v-model="ruleForm.severity" value="info">
                  <span class="severity-dot info"></span>
                  提示
                </label>
              </div>
            </div>
            <div class="condition-preview">
              <label class="form-label">生成的条件表达式</label>
              <code class="preview-code">{{ generatedCondition }}</code>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeRuleModal">取消</button>
            <button class="btn btn-primary" @click="saveRule">保存规则</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

// Thresholds
const thresholds = ref([
  { key: 'cpu', name: 'CPU 使用率', description: '处理器使用率阈值', warning: 70, critical: 85, unit: '%' },
  { key: 'memory', name: '内存使用率', description: '内存占用率阈值', warning: 75, critical: 90, unit: '%' },
  { key: 'disk', name: '磁盘使用率', description: '磁盘空间占用阈值', warning: 80, critical: 95, unit: '%' },
  { key: 'load', name: '系统负载', description: '1分钟平均负载阈值', warning: 5, critical: 10, unit: '' },
])

// Alert toggles
const alertToggles = ref([
  { key: 'cpu', name: 'CPU 告警', description: 'CPU使用率超过阈值时告警', enabled: true, icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/></svg>' },
  { key: 'memory', name: '内存告警', description: '内存使用率超过阈值时告警', enabled: true, icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 19v-3c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v3"/><path d="M3 7v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2z"/></svg>' },
  { key: 'disk', name: '磁盘告警', description: '磁盘空间不足时告警', enabled: true, icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>' },
  { key: 'network', name: '网络告警', description: '网络异常时告警', enabled: false, icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><circle cx="12" cy="20" r="1"/></svg>' },
  { key: 'service', name: '服务告警', description: '服务状态异常时告警', enabled: true, icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/></svg>' },
])

// Rules
const rules = ref([
  { id: 1, name: 'CPU 高负载', description: 'CPU使用率持续过高', condition: 'cpu_usage > 85%', severity: 'critical', duration: '5m', enabled: true },
  { id: 2, name: '内存告警', description: '内存使用率超过阈值', condition: 'memory_usage > 80%', severity: 'warning', duration: '5m', enabled: true },
  { id: 3, name: '磁盘空间告警', description: '磁盘使用率过高', condition: 'disk_usage > 90%', severity: 'critical', duration: '10m', enabled: true },
  { id: 4, name: '网络流量异常', description: '入站流量超过阈值', condition: 'network_in > 1Gbps', severity: 'warning', duration: '5m', enabled: false },
])

// Notify settings
const notifySettings = reactive({
  email: 'ops@example.com',
  webhook: '',
  frequency: 'realtime',
  silentStart: '00:00',
  silentEnd: '06:00'
})

// Advanced settings
const advancedSettings = reactive({
  aggregation: true,
  recoveryNotify: true,
  suppress: true,
  suppressMinutes: 5,
  escalation: false
})

// Rule modal
const showAddRule = ref(false)
const editingRule = ref(null)
const ruleForm = reactive({
  name: '',
  description: '',
  metric: 'cpu_usage',
  operator: '>',
  threshold: 80,
  duration: '5m',
  severity: 'warning'
})

const generatedCondition = computed(() => {
  const metricLabels = {
    cpu_usage: 'cpu_usage',
    memory_usage: 'memory_usage',
    disk_usage: 'disk_usage',
    network_in: 'network_in',
    network_out: 'network_out',
    load_avg: 'load_avg'
  }
  const unit = ruleForm.metric.includes('network') ? 'Mbps' : '%'
  return `${metricLabels[ruleForm.metric]} ${ruleForm.operator} ${ruleForm.threshold}${unit}`
})

// Methods
const getSeverityLabel = (severity) => {
  const labels = { critical: '严重', warning: '警告', info: '提示' }
  return labels[severity] || severity
}

const toggleRule = (rule) => {
  rule.enabled = !rule.enabled
}

const editRule = (rule) => {
  editingRule.value = rule
  // 解析条件填充表单
  ruleForm.name = rule.name
  ruleForm.description = rule.description
  ruleForm.severity = rule.severity
  ruleForm.duration = rule.duration
  showAddRule.value = true
}

const deleteRule = (id) => {
  if (confirm('确定要删除该规则吗？')) {
    rules.value = rules.value.filter(r => r.id !== id)
  }
}

const closeRuleModal = () => {
  showAddRule.value = false
  editingRule.value = null
  ruleForm.name = ''
  ruleForm.description = ''
  ruleForm.metric = 'cpu_usage'
  ruleForm.operator = '>'
  ruleForm.threshold = 80
  ruleForm.duration = '5m'
  ruleForm.severity = 'warning'
}

const saveRule = () => {
  if (!ruleForm.name) {
    alert('请输入规则名称')
    return
  }

  if (editingRule.value) {
    // 更新规则
    const index = rules.value.findIndex(r => r.id === editingRule.value.id)
    if (index !== -1) {
      rules.value[index] = {
        ...rules.value[index],
        name: ruleForm.name,
        description: ruleForm.description,
        condition: generatedCondition.value,
        severity: ruleForm.severity,
        duration: ruleForm.duration
      }
    }
  } else {
    // 添加新规则
    rules.value.push({
      id: Date.now(),
      name: ruleForm.name,
      description: ruleForm.description,
      condition: generatedCondition.value,
      severity: ruleForm.severity,
      duration: ruleForm.duration,
      enabled: true
    })
  }

  closeRuleModal()
}

const resetConfig = () => {
  if (confirm('确定要重置所有配置吗？')) {
    // 重置逻辑
    alert('配置已重置')
  }
}

const saveConfig = () => {
  alert('配置保存成功！')
}
</script>

<style scoped>
.alertconfig-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.config-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  overflow: hidden;
}

.config-card.full-width {
  grid-column: span 2;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.card-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.card-icon.cyan { background: linear-gradient(135deg, var(--accent-cyan), #0891b2); }
.card-icon.purple { background: linear-gradient(135deg, var(--accent-purple), #7c3aed); }
.card-icon.green { background: linear-gradient(135deg, var(--accent-green), #059669); }
.card-icon.yellow { background: linear-gradient(135deg, var(--accent-yellow), #d97706); }
.card-icon.red { background: linear-gradient(135deg, var(--accent-red), #dc2626); }

.card-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.card-desc {
  font-size: 12px;
  color: var(--text-muted);
}

.card-header .btn {
  margin-left: auto;
}

.card-body {
  padding: 24px;
}

/* Threshold Items */
.threshold-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid var(--border-color);
}

.threshold-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.threshold-item:first-child {
  padding-top: 0;
}

.threshold-name {
  font-weight: 500;
  display: block;
  margin-bottom: 4px;
}

.threshold-desc {
  font-size: 12px;
  color: var(--text-muted);
}

.threshold-inputs {
  display: flex;
  gap: 16px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-group label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
}

.threshold-input {
  width: 70px;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: 'JetBrains Mono', monospace;
  text-align: center;
}

.threshold-input:focus {
  outline: none;
  border-color: var(--accent-cyan);
}

.threshold-input.warning:focus {
  border-color: var(--accent-yellow);
}

.threshold-input.critical:focus {
  border-color: var(--accent-red);
}

.input-unit {
  font-size: 12px;
  color: var(--text-muted);
}

/* Toggle Items */
.toggle-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid var(--border-color);
}

.toggle-item:last-child {
  border-bottom: none;
}

.toggle-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.toggle-icon {
  width: 40px;
  height: 40px;
  background: var(--bg-tertiary);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-cyan);
}

.toggle-name {
  font-weight: 500;
  display: block;
  margin-bottom: 4px;
}

.toggle-desc {
  font-size: 12px;
  color: var(--text-muted);
}

.toggle-switch {
  position: relative;
  width: 48px;
  height: 26px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-tertiary);
  border-radius: 26px;
  transition: 0.3s;
  border: 1px solid var(--border-color);
}

.toggle-slider::before {
  content: '';
  position: absolute;
  height: 20px;
  width: 20px;
  left: 2px;
  bottom: 2px;
  background: var(--text-muted);
  border-radius: 50%;
  transition: 0.3s;
}

.toggle-switch input:checked + .toggle-slider {
  background: var(--accent-cyan);
  border-color: var(--accent-cyan);
}

.toggle-switch input:checked + .toggle-slider::before {
  background: white;
  transform: translateX(22px);
}

/* Rules Table */
.rules-table {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 60px 1fr 1fr 100px 100px 120px;
  gap: 16px;
  padding: 14px 20px;
  background: var(--bg-tertiary);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.rule-row {
  display: grid;
  grid-template-columns: 60px 1fr 1fr 100px 100px 120px;
  gap: 16px;
  padding: 16px 20px;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  transition: background 0.2s ease;
}

.rule-row:last-child {
  border-bottom: none;
}

.rule-row:hover {
  background: rgba(6, 182, 212, 0.04);
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-indicator.active {
  background: var(--accent-green);
  box-shadow: 0 0 8px var(--accent-green);
}

.status-indicator.inactive {
  background: var(--text-muted);
}

.rule-name {
  font-weight: 500;
  display: block;
  margin-bottom: 4px;
}

.rule-desc {
  font-size: 12px;
  color: var(--text-muted);
}

.condition-code {
  padding: 6px 10px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--accent-cyan);
}

.severity-tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
}

.severity-tag.critical {
  background: rgba(239, 68, 68, 0.15);
  color: var(--accent-red);
}

.severity-tag.warning {
  background: rgba(245, 158, 11, 0.15);
  color: var(--accent-yellow);
}

.severity-tag.info {
  background: rgba(6, 182, 212, 0.15);
  color: var(--accent-cyan);
}

.duration-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
}

.col-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.icon-btn:hover {
  background: var(--accent-cyan);
  color: white;
}

.icon-btn.delete:hover {
  background: var(--accent-red);
}

/* Form */
.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  font-weight: 500;
}

.form-input, .form-select {
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  transition: all 0.2s ease;
}

.form-input:focus, .form-select:focus {
  outline: none;
  border-color: var(--accent-cyan);
  box-shadow: 0 0 0 3px var(--accent-cyan-glow);
}

.form-select option {
  background: var(--bg-secondary);
}

.time-range {
  display: flex;
  align-items: center;
  gap: 12px;
}

.time-input {
  flex: 1;
}

.time-separator {
  color: var(--text-muted);
}

/* Advanced Items */
.advanced-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid var(--border-color);
}

.advanced-item:last-child {
  border-bottom: none;
}

.advanced-name {
  font-weight: 500;
  display: block;
  margin-bottom: 4px;
}

.advanced-desc {
  font-size: 12px;
  color: var(--text-muted);
}

/* Save Section */
.save-section {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 8px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.rule-modal {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  width: 560px;
  max-height: 90vh;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.modal-body {
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.severity-options {
  display: flex;
  gap: 12px;
}

.severity-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.severity-option input {
  display: none;
}

.severity-option.active {
  border-color: var(--accent-cyan);
  background: rgba(6, 182, 212, 0.1);
}

.severity-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.severity-dot.critical { background: var(--accent-red); }
.severity-dot.warning { background: var(--accent-yellow); }
.severity-dot.info { background: var(--accent-cyan); }

.condition-preview {
  margin-top: 8px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.preview-code {
  display: block;
  padding: 14px 16px;
  background: var(--bg-tertiary);
  border-radius: 10px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  color: var(--accent-cyan);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
}

/* Responsive */
@media (max-width: 1200px) {
  .config-grid {
    grid-template-columns: 1fr;
  }
  .config-card.full-width {
    grid-column: span 1;
  }
}
</style>