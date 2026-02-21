<template>
    <div class="alert-silence-page">
      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="page-title">
            <svg class="title-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <div>
              <h1>告警静默</h1>
              <span class="subtitle">对正在告警的事件进行静默操作</span>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <button class="action-btn" @click="refreshData" :disabled="loading">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ spinning: loading }">
              <path d="M23 4v6h-6"/>
              <path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            刷新
          </button>
        </div>
      </div>
  
      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card red">
          <div class="stat-header">
            <div class="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
          </div>
          <div class="stat-value">{{ firingCount }}</div>
          <div class="stat-label">正在告警</div>
        </div>
        <div class="stat-card yellow">
          <div class="stat-header">
            <div class="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </div>
          </div>
          <div class="stat-value">{{ silencedCount }}</div>
          <div class="stat-label">已静默</div>
        </div>
        <div class="stat-card cyan">
          <div class="stat-header">
            <div class="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
          </div>
          <div class="stat-value">{{ activeSilences.length }}</div>
          <div class="stat-label">活跃静默规则</div>
        </div>
      </div>
  
      <!-- Tabs -->
      <div class="tabs">
        <button class="tab" :class="{ active: activeTab === 'alerts' }" @click="activeTab = 'alerts'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          </svg>
          告警事件 ({{ alerts.length }})
        </button>
        <button class="tab" :class="{ active: activeTab === 'silences' }" @click="activeTab = 'silences'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
          </svg>
          静默规则 ({{ activeSilences.length }})
        </button>
      </div>
  
      <!-- Alerts Table -->
      <div class="table-section" v-show="activeTab === 'alerts'">
        <div class="section-header">
          <div class="section-title">
            <svg class="section-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            </svg>
            <span>正在告警的事件</span>
          </div>
          <div class="section-hint">点击"静默"按钮可暂停该告警的通知</div>
        </div>
        
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>告警名称</th>
                <th>实例</th>
                <th>级别</th>
                <th>告警详情</th>
                <th>开始时间</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="7" class="loading-cell">
                  <div class="loading-spinner"></div>
                  <span>加载中...</span>
                </td>
              </tr>
              <tr v-else-if="alerts.length === 0">
                <td colspan="7" class="empty-cell">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-icon">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <span>当前没有正在告警的事件</span>
                </td>
              </tr>
              <tr v-for="alert in alerts" :key="alert.fingerprint" :class="{ silenced: alert.silenced }">
                <td class="name-cell">
                  <span class="alert-name">{{ alert.alertName || alert.labels?.alertname }}</span>
                </td>
                <td class="instance-cell">
                  <code>{{ alert.instance || alert.labels?.instance || '-' }}</code>
                </td>
                <td>
                  <span class="severity-badge" :class="alert.severity || alert.labels?.severity || 'warning'">
                    {{ severityLabel(alert.severity || alert.labels?.severity) }}
                  </span>
                </td>
                <td class="summary-cell">
                  <span class="summary-text">{{ alert.summary || alert.annotations?.summary || '-' }}</span>
                </td>
                <td class="time-cell">{{ formatTime(alert.startsAt) }}</td>
                <td>
                  <span class="status-badge" :class="alert.silenced ? 'silenced' : 'firing'">
                    {{ alert.silenced ? '已静默' : '告警中' }}
                  </span>
                </td>
                <td class="action-cell">
                  <button 
                    v-if="!alert.silenced"
                    class="table-action-btn silence" 
                    @click="openSilenceModal(alert)" 
                    title="静默该告警"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                    静默
                  </button>
                  <button 
                    v-else
                    class="table-action-btn unsilence" 
                    @click="confirmUnsilence(alert)" 
                    title="取消静默"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    恢复通知
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
  
      <!-- Silences Table -->
      <div class="table-section" v-show="activeTab === 'silences'">
        <div class="section-header">
          <div class="section-title">
            <svg class="section-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
            <span>活跃的静默规则</span>
          </div>
        </div>
        
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>静默ID</th>
                <th>匹配条件</th>
                <th>开始时间</th>
                <th>结束时间</th>
                <th>创建人</th>
                <th>备注</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loadingSilences">
                <td colspan="7" class="loading-cell">
                  <div class="loading-spinner"></div>
                  <span>加载中...</span>
                </td>
              </tr>
              <tr v-else-if="activeSilences.length === 0">
                <td colspan="7" class="empty-cell">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-icon">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                  </svg>
                  <span>当前没有活跃的静默规则</span>
                </td>
              </tr>
              <tr v-for="silence in activeSilences" :key="silence.id">
                <td class="id-cell">
                  <code>{{ silence.id.substring(0, 8) }}...</code>
                </td>
                <td class="matchers-cell">
                  <div class="matchers-list">
                    <span class="matcher-tag" v-for="matcher in silence.matchers" :key="matcher.name">
                      {{ matcher.name }}={{ matcher.value }}
                    </span>
                  </div>
                </td>
                <td class="time-cell">{{ formatTime(silence.startsAt) }}</td>
                <td class="time-cell">{{ formatTime(silence.endsAt) }}</td>
                <td>{{ silence.createdBy || '-' }}</td>
                <td class="comment-cell">{{ silence.comment || '-' }}</td>
                <td class="action-cell">
                  <button 
                    class="table-action-btn delete" 
                    @click="confirmDeleteSilence(silence)" 
                    title="删除静默"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
  
      <!-- Silence Modal -->
      <div class="modal-overlay" v-if="showSilenceModal" @click.self="closeSilenceModal">
        <div class="modal">
          <div class="modal-header">
            <h2>静默告警</h2>
            <button class="close-btn" @click="closeSilenceModal">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <!-- 告警信息 -->
            <div class="alert-info-card">
              <div class="info-row">
                <span class="info-label">告警名称</span>
                <span class="info-value">{{ selectedAlert?.alertName || selectedAlert?.labels?.alertname }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">实例</span>
                <code class="info-value">{{ selectedAlert?.instance || selectedAlert?.labels?.instance || '无' }}</code>
              </div>
              <div class="info-row">
                <span class="info-label">级别</span>
                <span class="severity-badge" :class="selectedAlert?.severity || selectedAlert?.labels?.severity || 'warning'">
                  {{ severityLabel(selectedAlert?.severity || selectedAlert?.labels?.severity) }}
                </span>
              </div>
            </div>
  
            <!-- 静默设置 -->
            <div class="form-section">
              <h3 class="section-title">静默设置</h3>
              <div class="form-group">
                <label>静默时长 <span class="required">*</span></label>
                <div class="duration-presets">
                  <button 
                    v-for="preset in durationPresets" 
                    :key="preset.value"
                    class="preset-btn"
                    :class="{ active: silenceForm.durationMinutes === preset.value }"
                    @click="silenceForm.durationMinutes = preset.value"
                  >
                    {{ preset.label }}
                  </button>
                </div>
                <div class="custom-duration">
                  <input 
                    v-model.number="silenceForm.durationMinutes" 
                    type="number" 
                    placeholder="自定义分钟数"
                    min="1"
                  />
                  <span class="unit">分钟</span>
                </div>
              </div>
              <div class="form-group">
                <label>备注说明</label>
                <textarea v-model="silenceForm.comment" placeholder="静默原因（可选）"></textarea>
              </div>
              <div class="form-group">
                <label>操作人</label>
                <input v-model="silenceForm.createdBy" type="text" placeholder="您的名称" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="action-btn" @click="closeSilenceModal">取消</button>
            <button class="action-btn primary" @click="createSilence" :disabled="submitting">
              <span v-if="submitting" class="spinner"></span>
              确认静默
            </button>
          </div>
        </div>
      </div>
  
      <!-- Confirm Delete Modal -->
      <div class="modal-overlay" v-if="showDeleteConfirm" @click.self="showDeleteConfirm = false">
        <div class="modal modal-sm">
          <div class="modal-header">
            <h2>确认取消静默</h2>
            <button class="close-btn" @click="showDeleteConfirm = false">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="confirm-text">确定要取消该静默吗？</p>
            <p class="confirm-warning">取消后，匹配的告警将恢复通知</p>
          </div>
          <div class="modal-footer">
            <button class="action-btn" @click="showDeleteConfirm = false">取消</button>
            <button class="action-btn danger" @click="deleteSilence" :disabled="deleting">
              <span v-if="deleting" class="spinner"></span>
              确认
            </button>
          </div>
        </div>
      </div>
  
      <!-- Toast -->
      <transition name="toast">
        <div v-if="toast.show" class="toast" :class="toast.type">
          <svg v-if="toast.type === 'success'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          {{ toast.message }}
        </div>
      </transition>
    </div>
  </template>
  
  <script>
  import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
  import axios from 'axios'
  
  const API_BASE = '/api/alert/silence'
  
  export default {
    name: 'AlertSilenceManagement',
    setup() {
      const alerts = ref([])
      const activeSilences = ref([])
      const loading = ref(false)
      const loadingSilences = ref(false)
      const showSilenceModal = ref(false)
      const showDeleteConfirm = ref(false)
      const submitting = ref(false)
      const deleting = ref(false)
      const selectedAlert = ref(null)
      const silenceToDelete = ref(null)
      const activeTab = ref('alerts')
  
      const durationPresets = [
        { label: '30分钟', value: 30 },
        { label: '1小时', value: 60 },
        { label: '2小时', value: 120 },
        { label: '4小时', value: 240 },
        { label: '8小时', value: 480 },
        { label: '24小时', value: 1440 }
      ]
  
      const silenceForm = reactive({
        durationMinutes: 60,
        comment: '',
        createdBy: ''
      })
  
      const toast = reactive({
        show: false,
        message: '',
        type: 'success'
      })
  
      const firingCount = computed(() => alerts.value.filter(a => !a.silenced).length)
      const silencedCount = computed(() => alerts.value.filter(a => a.silenced).length)
  
      const showToast = (message, type = 'success') => {
        toast.message = message
        toast.type = type
        toast.show = true
        setTimeout(() => { toast.show = false }, 3000)
      }
  
      const severityLabel = (severity) => {
        const map = { info: '信息', warning: '警告', critical: '严重' }
        return map[severity] || severity || '未知'
      }
  
      const formatTime = (time) => {
        if (!time) return '-'
        const date = new Date(time)
        return date.toLocaleString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      }
  
      const fetchAlerts = async () => {
        loading.value = true
        try {
          const res = await axios.get(`${API_BASE}/alerts`)
          if (res.data.code === 0) {
            alerts.value = res.data.data || []
          }
        } catch (e) {
          console.error('Error fetching alerts:', e)
          showToast('获取告警列表失败', 'error')
        } finally {
          loading.value = false
        }
      }
  
      const fetchSilences = async () => {
        loadingSilences.value = true
        try {
          const res = await axios.get(`${API_BASE}/silences`)
          if (res.data.code === 0) {
            activeSilences.value = res.data.data || []
          }
        } catch (e) {
          console.error('Error fetching silences:', e)
        } finally {
          loadingSilences.value = false
        }
      }
  
      const refreshData = () => {
        fetchAlerts()
        fetchSilences()
      }
  
      const openSilenceModal = (alert) => {
        selectedAlert.value = alert
        silenceForm.durationMinutes = 60
        silenceForm.comment = ''
        silenceForm.createdBy = ''
        showSilenceModal.value = true
      }
  
      const closeSilenceModal = () => {
        showSilenceModal.value = false
        selectedAlert.value = null
      }
  
      const createSilence = async () => {
        if (!silenceForm.durationMinutes || silenceForm.durationMinutes < 1) {
          showToast('请选择静默时长', 'error')
          return
        }
  
        submitting.value = true
        try {
          const payload = {
            alertName: selectedAlert.value.alertName || selectedAlert.value.labels?.alertname,
            instance: selectedAlert.value.instance || selectedAlert.value.labels?.instance,
            durationMinutes: silenceForm.durationMinutes,
            comment: silenceForm.comment || `静默 ${silenceForm.durationMinutes} 分钟`,
            createdBy: silenceForm.createdBy || 'syswatch-user'
          }
  
          const res = await axios.post(API_BASE, payload)
          if (res.data.code === 0) {
            showToast('静默创建成功，该告警将在 ' + silenceForm.durationMinutes + ' 分钟内不再通知')
            closeSilenceModal()
            refreshData()
          } else {
            showToast(res.data.message || '创建失败', 'error')
          }
        } catch (e) {
          console.error('Error creating silence:', e)
          showToast(e.response?.data?.message || '创建静默失败', 'error')
        } finally {
          submitting.value = false
        }
      }
  
      const confirmUnsilence = (alert) => {
        silenceToDelete.value = { id: alert.silenceId }
        showDeleteConfirm.value = true
      }
  
      const confirmDeleteSilence = (silence) => {
        silenceToDelete.value = silence
        showDeleteConfirm.value = true
      }
  
      const deleteSilence = async () => {
        deleting.value = true
        try {
          await axios.delete(`${API_BASE}/${silenceToDelete.value.id}`)
          showToast('静默已取消，告警将恢复通知')
          showDeleteConfirm.value = false
          refreshData()
        } catch (e) {
          console.error('Error deleting silence:', e)
          showToast('取消静默失败', 'error')
        } finally {
          deleting.value = false
        }
      }
  
      // 自动刷新
      let refreshInterval
      onMounted(() => {
        refreshData()
        // 每30秒自动刷新
        refreshInterval = setInterval(refreshData, 30000)
      })
  
      onUnmounted(() => {
        if (refreshInterval) {
          clearInterval(refreshInterval)
        }
      })
  
      return {
        alerts, activeSilences, loading, loadingSilences,
        showSilenceModal, showDeleteConfirm, submitting, deleting,
        selectedAlert, silenceToDelete, activeTab,
        durationPresets, silenceForm, toast,
        firingCount, silencedCount,
        severityLabel, formatTime,
        refreshData, openSilenceModal, closeSilenceModal,
        createSilence, confirmUnsilence, confirmDeleteSilence, deleteSilence
      }
    }
  }
  </script>
  
  <style scoped>
  * {
    box-sizing: border-box;
  }
  
  .alert-silence-page {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  
  /* Header */
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .page-title {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  
  .title-icon {
    width: 48px;
    height: 48px;
    padding: 10px;
    background: linear-gradient(135deg, var(--accent-red), transparent);
    border-radius: 12px;
    color: var(--accent-red);
  }
  
  .header-left h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .subtitle {
    color: var(--text-muted);
    font-size: 13px;
  }
  
  /* Action Buttons */
  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .action-btn:hover:not(:disabled) {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border-color: var(--accent-cyan);
  }
  
  .action-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .action-btn.primary {
    background: linear-gradient(135deg, var(--accent-cyan), #0891b2);
    border-color: transparent;
    color: white;
    box-shadow: 0 4px 16px var(--accent-cyan-glow);
  }
  
  .action-btn.danger {
    background: linear-gradient(135deg, var(--accent-red), #dc2626);
    border-color: transparent;
    color: white;
  }
  
  .spinning {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  /* Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
  
  .stat-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 24px;
    position: relative;
    overflow: hidden;
  }
  
  .stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--card-accent), transparent);
  }
  
  .stat-card.red { --card-accent: var(--accent-red); }
  .stat-card.yellow { --card-accent: var(--accent-yellow); }
  .stat-card.cyan { --card-accent: var(--accent-cyan); }
  
  .stat-icon {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, var(--card-accent), transparent);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--card-accent);
    margin-bottom: 16px;
  }
  
  .stat-value {
    font-size: 32px;
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
    color: var(--text-primary);
  }
  
  .stat-label {
    font-size: 13px;
    color: var(--text-muted);
    margin-top: 4px;
  }
  
  /* Tabs */
  .tabs {
    display: flex;
    gap: 8px;
    background: var(--bg-card);
    padding: 8px;
    border-radius: 12px;
    border: 1px solid var(--border-color);
  }
  
  .tab {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: transparent;
    border: none;
    border-radius: 8px;
    color: var(--text-secondary);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .tab:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }
  
  .tab.active {
    background: linear-gradient(135deg, var(--accent-cyan), #0891b2);
    color: white;
  }
  
  /* Table Section */
  .table-section {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    overflow: hidden;
  }
  
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border-color);
  }
  
  .section-title {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .section-icon {
    color: var(--accent-cyan);
  }
  
  .section-hint {
    font-size: 13px;
    color: var(--text-muted);
  }
  
  .table-wrapper {
    overflow-x: auto;
  }
  
  .data-table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .data-table th {
    background: var(--bg-tertiary);
    padding: 14px 20px;
    text-align: left;
    font-weight: 600;
    color: var(--text-secondary);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--border-color);
  }
  
  .data-table td {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
    vertical-align: middle;
    color: var(--text-primary);
  }
  
  .data-table tr:last-child td {
    border-bottom: none;
  }
  
  .data-table tr.silenced {
    opacity: 0.6;
    background: rgba(245, 158, 11, 0.05);
  }
  
  .data-table tr:hover:not(.silenced) {
    background: var(--bg-tertiary);
  }
  
  .alert-name {
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .instance-cell code,
  .id-cell code {
    background: var(--bg-tertiary);
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-family: 'JetBrains Mono', monospace;
    color: var(--accent-cyan);
    border: 1px solid var(--border-color);
  }
  
  .summary-cell {
    max-width: 300px;
  }
  
  .summary-text {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-secondary);
    font-size: 13px;
  }
  
  .time-cell {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: var(--text-secondary);
    white-space: nowrap;
  }
  
  .comment-cell {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-secondary);
  }
  
  /* Severity Badge */
  .severity-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
  }
  
  .severity-badge.info {
    background: rgba(6, 182, 212, 0.15);
    color: var(--accent-cyan);
  }
  
  .severity-badge.warning {
    background: rgba(245, 158, 11, 0.15);
    color: var(--accent-yellow);
  }
  
  .severity-badge.critical {
    background: rgba(239, 68, 68, 0.15);
    color: var(--accent-red);
  }
  
  /* Status Badge */
  .status-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
  }
  
  .status-badge.firing {
    background: rgba(239, 68, 68, 0.15);
    color: var(--accent-red);
  }
  
  .status-badge.silenced {
    background: rgba(245, 158, 11, 0.15);
    color: var(--accent-yellow);
  }
  
  /* Matchers */
  .matchers-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  
  .matcher-tag {
    background: rgba(139, 92, 246, 0.15);
    color: var(--accent-purple);
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-family: 'JetBrains Mono', monospace;
  }
  
  /* Table Action Buttons */
  .action-cell {
    white-space: nowrap;
  }
  
  .table-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: 1px solid var(--border-color);
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s;
    color: var(--text-muted);
    font-size: 12px;
    font-family: inherit;
  }
  
  .table-action-btn.silence:hover {
    background: rgba(245, 158, 11, 0.15);
    border-color: var(--accent-yellow);
    color: var(--accent-yellow);
  }
  
  .table-action-btn.unsilence:hover {
    background: rgba(16, 185, 129, 0.15);
    border-color: var(--accent-green);
    color: var(--accent-green);
  }
  
  .table-action-btn.delete:hover {
    background: rgba(239, 68, 68, 0.15);
    border-color: var(--accent-red);
    color: var(--accent-red);
  }
  
  /* Loading & Empty */
  .loading-cell,
  .empty-cell {
    text-align: center;
    padding: 64px 24px !important;
    color: var(--text-muted);
  }
  
  .loading-spinner,
  .spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 2px solid var(--border-color);
    border-top-color: var(--accent-cyan);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  .empty-icon {
    display: block;
    margin: 0 auto 16px;
    color: var(--text-muted);
  }
  
  /* Modal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(8px);
  }
  
  .modal {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    overflow: auto;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  }
  
  .modal-sm {
    max-width: 400px;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border-color);
  }
  
  .modal-header h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }
  
  .close-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    transition: all 0.2s;
  }
  
  .close-btn:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }
  
  .modal-body {
    padding: 24px;
  }
  
  .modal-footer {
    padding: 16px 24px;
    border-top: 1px solid var(--border-color);
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
  
  /* Alert Info Card */
  .alert-info-card {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 24px;
  }
  
  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
  }
  
  .info-row:not(:last-child) {
    border-bottom: 1px solid var(--border-color);
  }
  
  .info-label {
    color: var(--text-muted);
    font-size: 13px;
  }
  
  .info-value {
    color: var(--text-primary);
    font-weight: 500;
  }
  
  /* Form */
  .form-section {
    margin-bottom: 20px;
  }
  
  .form-section > .section-title {
    margin: 0 0 16px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--accent-cyan);
  }
  
  .form-group {
    margin-bottom: 16px;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: var(--text-secondary);
    font-size: 13px;
  }
  
  .required {
    color: var(--accent-red);
  }
  
  .duration-presets {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }
  
  .preset-btn {
    padding: 8px 16px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-secondary);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .preset-btn:hover {
    border-color: var(--accent-cyan);
    color: var(--accent-cyan);
  }
  
  .preset-btn.active {
    background: linear-gradient(135deg, var(--accent-cyan), #0891b2);
    border-color: transparent;
    color: white;
  }
  
  .custom-duration {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .custom-duration input {
    flex: 1;
    padding: 10px 12px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-size: 13px;
    color: var(--text-primary);
  }
  
  .custom-duration input:focus {
    outline: none;
    border-color: var(--accent-cyan);
  }
  
  .custom-duration .unit {
    color: var(--text-muted);
    font-size: 13px;
  }
  
  .form-group textarea,
  .form-group input[type="text"] {
    width: 100%;
    padding: 10px 12px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-size: 13px;
    color: var(--text-primary);
    font-family: inherit;
  }
  
  .form-group textarea {
    min-height: 80px;
    resize: vertical;
  }
  
  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: var(--accent-cyan);
  }
  
  /* Confirm Modal */
  .confirm-text {
    margin: 0 0 8px;
    color: var(--text-primary);
    font-size: 15px;
  }
  
  .confirm-warning {
    margin: 0;
    color: var(--text-muted);
    font-size: 13px;
  }
  
  /* Toast */
  .toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 14px 24px;
    border-radius: 12px;
    color: white;
    font-weight: 500;
    font-size: 14px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    z-index: 2000;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .toast.success {
    background: linear-gradient(135deg, var(--accent-green), #059669);
  }
  
  .toast.error {
    background: linear-gradient(135deg, var(--accent-red), #dc2626);
  }
  
  .toast-enter-active,
  .toast-leave-active {
    transition: all 0.3s ease;
  }
  
  .toast-enter-from,
  .toast-leave-to {
    opacity: 0;
    transform: translateY(20px);
  }
  
  /* Responsive */
  @media (max-width: 900px) {
    .stats-grid {
      grid-template-columns: 1fr;
    }
  }
  
  @media (max-width: 768px) {
    .data-table {
      min-width: 800px;
    }
  }
  </style>