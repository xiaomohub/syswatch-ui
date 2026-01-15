<template>
  <div class="notify-page">
    <!-- Notification Channels -->
    <div class="channels-section">
      <div class="section-header">
        <div class="section-title">
          <svg class="section-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
          <span>通知渠道</span>
        </div>
        <button class="btn btn-primary" @click="showAddChannel = true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          添加渠道
        </button>
      </div>
      
      <div class="channels-grid">
        <div 
          class="channel-card" 
          v-for="channel in channels" 
          :key="channel.id"
          :class="{ 'disabled': !channel.enabled }"
        >
          <div class="channel-header">
            <div class="channel-icon" :style="{ background: channel.color }">
              <span v-html="channel.icon"></span>
            </div>
            <div class="channel-info">
              <div class="channel-name">{{ channel.name }}</div>
              <div class="channel-type">{{ channel.type }}</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="channel.enabled">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="channel-detail">
            <span class="detail-label">接收地址</span>
            <span class="detail-value">{{ channel.target }}</span>
          </div>
          <div class="channel-stats">
            <div class="stat-item">
              <span class="stat-value">{{ channel.sentCount }}</span>
              <span class="stat-label">已发送</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ channel.failCount }}</span>
              <span class="stat-label">失败</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ channel.successRate }}%</span>
              <span class="stat-label">成功率</span>
            </div>
          </div>
          <div class="channel-actions">
            <button class="action-btn" @click="testChannel(channel)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              测试
            </button>
            <button class="action-btn" @click="editChannel(channel)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              编辑
            </button>
            <button class="action-btn delete" @click="deleteChannel(channel.id)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Notification History -->
    <div class="history-section">
      <div class="section-header">
        <div class="section-title">
          <svg class="section-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>通知历史</span>
        </div>
        <div class="header-actions">
          <select class="filter-select" v-model="historyFilter">
            <option value="all">全部状态</option>
            <option value="success">发送成功</option>
            <option value="failed">发送失败</option>
            <option value="pending">发送中</option>
          </select>
          <button class="btn btn-secondary" @click="clearHistory">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            清空历史
          </button>
        </div>
      </div>

      <div class="history-list">
        <div 
          class="history-item" 
          v-for="item in filteredHistory" 
          :key="item.id"
        >
          <div class="history-status" :class="item.status"></div>
          <div class="history-content">
            <div class="history-title">{{ item.title }}</div>
            <div class="history-meta">
              <span class="meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                {{ item.channel }}
              </span>
              <span class="meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                {{ item.time }}
              </span>
            </div>
          </div>
          <div class="history-target">{{ item.target }}</div>
          <div class="history-badge" :class="item.status">
            {{ getStatusLabel(item.status) }}
          </div>
          <button class="retry-btn" v-if="item.status === 'failed'" @click="retryNotify(item)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            重试
          </button>
        </div>

        <div class="empty-state" v-if="filteredHistory.length === 0">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          <p>暂无通知记录</p>
        </div>
      </div>
    </div>

    <!-- Notification Templates -->
    <div class="templates-section">
      <div class="section-header">
        <div class="section-title">
          <svg class="section-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <span>通知模板</span>
        </div>
        <button class="btn btn-primary" @click="showAddTemplate = true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          添加模板
        </button>
      </div>

      <div class="templates-grid">
        <div class="template-card" v-for="template in templates" :key="template.id">
          <div class="template-header">
            <span class="template-name">{{ template.name }}</span>
            <span class="template-type" :class="template.severity">{{ template.severity }}</span>
          </div>
          <div class="template-preview">
            <div class="preview-title">{{ template.title }}</div>
            <div class="preview-content">{{ template.content }}</div>
          </div>
          <div class="template-vars">
            <span class="var-tag" v-for="v in template.variables" :key="v">{{ '{{' + v + '}}' }}</span>
          </div>
          <div class="template-actions">
            <button class="icon-btn" @click="editTemplate(template)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="icon-btn delete" @click="deleteTemplate(template.id)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Channel Modal -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="showAddChannel" @click.self="showAddChannel = false">
        <div class="modal">
          <div class="modal-header">
            <h3>添加通知渠道</h3>
            <button class="close-btn" @click="showAddChannel = false">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">渠道名称</label>
              <input type="text" class="form-input" v-model="newChannel.name" placeholder="例如：运维团队邮件">
            </div>
            <div class="form-group">
              <label class="form-label">渠道类型</label>
              <select class="form-select" v-model="newChannel.type">
                <option value="email">邮件</option>
                <option value="webhook">Webhook</option>
                <option value="slack">Slack</option>
                <option value="dingtalk">钉钉</option>
                <option value="wechat">企业微信</option>
                <option value="sms">短信</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">接收地址</label>
              <input type="text" class="form-input" v-model="newChannel.target" :placeholder="getTargetPlaceholder">
            </div>
            <div class="form-group" v-if="newChannel.type === 'webhook'">
              <label class="form-label">Secret (可选)</label>
              <input type="password" class="form-input" v-model="newChannel.secret" placeholder="用于签名验证">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showAddChannel = false">取消</button>
            <button class="btn btn-primary" @click="addChannel">保存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'

// Channels
const channels = ref([
  {
    id: 1,
    name: '运维团队邮件',
    type: '邮件',
    target: 'ops-team@example.com',
    enabled: true,
    sentCount: 156,
    failCount: 3,
    successRate: 98,
    color: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>'
  },
  {
    id: 2,
    name: 'Slack 通知',
    type: 'Webhook',
    target: 'https://hooks.slack.com/services/...',
    enabled: true,
    sentCount: 89,
    failCount: 1,
    successRate: 99,
    color: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/><path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>'
  },
  {
    id: 3,
    name: '钉钉机器人',
    type: 'Webhook',
    target: 'https://oapi.dingtalk.com/robot/...',
    enabled: true,
    sentCount: 234,
    failCount: 8,
    successRate: 97,
    color: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  },
  {
    id: 4,
    name: '短信告警',
    type: '短信',
    target: '+86 138****8888',
    enabled: false,
    sentCount: 42,
    failCount: 2,
    successRate: 95,
    color: 'linear-gradient(135deg, #10b981, #059669)',
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
  }
])

// History
const historyFilter = ref('all')
const notifyHistory = ref([
  { id: 1, title: 'CPU 使用率超过阈值', channel: '运维团队邮件', target: 'ops-team@example.com', time: '2024-01-15 14:32:18', status: 'success' },
  { id: 2, title: '内存使用率告警', channel: 'Slack 通知', target: '#alerts', time: '2024-01-15 14:28:45', status: 'success' },
  { id: 3, title: 'Database 连接池告警', channel: '钉钉机器人', target: '运维群', time: '2024-01-15 14:25:12', status: 'failed' },
  { id: 4, title: '磁盘空间不足', channel: '运维团队邮件', target: 'ops-team@example.com', time: '2024-01-15 14:20:33', status: 'success' },
  { id: 5, title: 'API 响应时间增加', channel: 'Slack 通知', target: '#alerts', time: '2024-01-15 14:15:22', status: 'pending' },
])

const filteredHistory = computed(() => {
  if (historyFilter.value === 'all') return notifyHistory.value
  return notifyHistory.value.filter(h => h.status === historyFilter.value)
})

// Templates
const templates = ref([
  {
    id: 1,
    name: '严重告警模板',
    severity: 'critical',
    title: '[严重] {{alert_name}}',
    content: '主机 {{host}} 发生严重告警：{{message}}。当前值：{{value}}，阈值：{{threshold}}。请立即处理！',
    variables: ['alert_name', 'host', 'message', 'value', 'threshold']
  },
  {
    id: 2,
    name: '警告告警模板',
    severity: 'warning',
    title: '[警告] {{alert_name}}',
    content: '主机 {{host}} 发生警告：{{message}}。当前值：{{value}}。',
    variables: ['alert_name', 'host', 'message', 'value']
  },
  {
    id: 3,
    name: '恢复通知模板',
    severity: 'info',
    title: '[恢复] {{alert_name}}',
    content: '主机 {{host}} 的告警已恢复正常。持续时间：{{duration}}。',
    variables: ['alert_name', 'host', 'duration']
  }
])

// Modal
const showAddChannel = ref(false)
const showAddTemplate = ref(false)

const newChannel = reactive({
  name: '',
  type: 'email',
  target: '',
  secret: ''
})

const getTargetPlaceholder = computed(() => {
  const placeholders = {
    email: 'example@domain.com',
    webhook: 'https://hooks.example.com/...',
    slack: 'https://hooks.slack.com/services/...',
    dingtalk: 'https://oapi.dingtalk.com/robot/...',
    wechat: 'https://qyapi.weixin.qq.com/...',
    sms: '+86 13800138000'
  }
  return placeholders[newChannel.type] || ''
})

// Methods
const getStatusLabel = (status) => {
  const labels = { success: '发送成功', failed: '发送失败', pending: '发送中' }
  return labels[status] || status
}

const testChannel = (channel) => {
  alert(`正在发送测试消息到: ${channel.target}`)
}

const editChannel = (channel) => {
  // 编辑渠道
  console.log('Edit channel:', channel)
}

const deleteChannel = (id) => {
  if (confirm('确定要删除该通知渠道吗？')) {
    channels.value = channels.value.filter(c => c.id !== id)
  }
}

const addChannel = () => {
  if (!newChannel.name || !newChannel.target) {
    alert('请填写完整信息')
    return
  }
  
  channels.value.push({
    id: Date.now(),
    name: newChannel.name,
    type: newChannel.type,
    target: newChannel.target,
    enabled: true,
    sentCount: 0,
    failCount: 0,
    successRate: 100,
    color: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>'
  })
  
  showAddChannel.value = false
  newChannel.name = ''
  newChannel.type = 'email'
  newChannel.target = ''
  newChannel.secret = ''
}

const retryNotify = (item) => {
  alert(`正在重试发送: ${item.title}`)
}

const clearHistory = () => {
  if (confirm('确定要清空通知历史吗？')) {
    notifyHistory.value = []
  }
}

const editTemplate = (template) => {
  console.log('Edit template:', template)
}

const deleteTemplate = (id) => {
  if (confirm('确定要删除该模板吗？')) {
    templates.value = templates.value.filter(t => t.id !== id)
  }
}
</script>

<style scoped>
.notify-page {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* Section Common */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
}

.section-icon {
  color: var(--accent-cyan);
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* Channels */
.channels-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.channel-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
  transition: all 0.3s ease;
}

.channel-card:hover {
  border-color: var(--accent-cyan);
}

.channel-card.disabled {
  opacity: 0.6;
}

.channel-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.channel-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.channel-info {
  flex: 1;
}

.channel-name {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 4px;
}

.channel-type {
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

.channel-detail {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
  font-size: 13px;
}

.detail-label {
  color: var(--text-muted);
}

.detail-value {
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-secondary);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.channel-stats {
  display: flex;
  gap: 24px;
  padding: 16px 0;
  border-bottom: 1px solid var(--border-color);
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
  color: var(--accent-cyan);
}

.stat-label {
  font-size: 11px;
  color: var(--text-muted);
  display: block;
  margin-top: 4px;
}

.channel-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
}

.action-btn.delete:hover {
  border-color: var(--accent-red);
  color: var(--accent-red);
}

/* History */
.history-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.history-item:hover {
  background: rgba(6, 182, 212, 0.08);
}

.history-status {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.history-status.success {
  background: var(--accent-green);
  box-shadow: 0 0 8px var(--accent-green);
}

.history-status.failed {
  background: var(--accent-red);
  box-shadow: 0 0 8px var(--accent-red);
}

.history-status.pending {
  background: var(--accent-yellow);
  box-shadow: 0 0 8px var(--accent-yellow);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.history-content {
  flex: 1;
  min-width: 0;
}

.history-title {
  font-weight: 500;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-muted);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.history-target {
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-muted);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-badge {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
}

.history-badge.success {
  background: rgba(16, 185, 129, 0.15);
  color: var(--accent-green);
}

.history-badge.failed {
  background: rgba(239, 68, 68, 0.15);
  color: var(--accent-red);
}

.history-badge.pending {
  background: rgba(245, 158, 11, 0.15);
  color: var(--accent-yellow);
}

.retry-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
}

/* Templates */
.templates-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.template-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 20px;
  transition: all 0.3s ease;
}

.template-card:hover {
  border-color: var(--accent-cyan);
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.template-name {
  font-weight: 600;
}

.template-type {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
}

.template-type.critical {
  background: rgba(239, 68, 68, 0.15);
  color: var(--accent-red);
}

.template-type.warning {
  background: rgba(245, 158, 11, 0.15);
  color: var(--accent-yellow);
}

.template-type.info {
  background: rgba(6, 182, 212, 0.15);
  color: var(--accent-cyan);
}

.template-preview {
  background: var(--bg-tertiary);
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 14px;
}

.preview-title {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
  font-family: 'JetBrains Mono', monospace;
}

.preview-content {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.template-vars {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}

.var-tag {
  padding: 4px 8px;
  background: rgba(139, 92, 246, 0.15);
  color: var(--accent-purple);
  border-radius: 4px;
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
}

.template-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 8px;
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

/* Empty State */
.empty-state {
  padding: 60px 20px;
  text-align: center;
  color: var(--text-muted);
}

.empty-state svg {
  margin-bottom: 16px;
  opacity: 0.5;
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

.modal {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  width: 480px;
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
}

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

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
}

/* Filter Select */
.filter-select {
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
}

/* Responsive */
@media (max-width: 1400px) {
  .channels-grid {
    grid-template-columns: 1fr;
  }
  .templates-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 900px) {
  .templates-grid {
    grid-template-columns: 1fr;
  }
}
</style>