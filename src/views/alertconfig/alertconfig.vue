<template>
  <div class="alert-rule-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <div class="page-title">
          <svg class="title-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div>
            <h1>告警规则管理</h1>
            <span class="subtitle">Prometheus Alert Rules</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <button class="action-btn" @click="publishAll" :disabled="publishing">
          <svg v-if="!publishing" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
          <span v-else class="spinner"></span>
          发布所有规则
        </button>
        <button class="action-btn primary" @click="openAddModal">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          新增规则
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card cyan">
        <div class="stat-header">
          <div class="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
        </div>
        <div class="stat-value">{{ rules.length }}</div>
        <div class="stat-label">总规则数</div>
        <div class="stat-progress">
          <div class="stat-progress-bar" :style="{ width: '100%' }"></div>
        </div>
      </div>
      <div class="stat-card green">
        <div class="stat-header">
          <div class="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
        </div>
        <div class="stat-value">{{ enabledCount }}</div>
        <div class="stat-label">已启用</div>
        <div class="stat-progress">
          <div class="stat-progress-bar" :style="{ width: rules.length ? (enabledCount / rules.length * 100) + '%' : '0%' }"></div>
        </div>
      </div>
      <div class="stat-card yellow">
        <div class="stat-header">
          <div class="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
          </div>
        </div>
        <div class="stat-value">{{ rules.length - enabledCount }}</div>
        <div class="stat-label">已停用</div>
        <div class="stat-progress">
          <div class="stat-progress-bar" :style="{ width: rules.length ? ((rules.length - enabledCount) / rules.length * 100) + '%' : '0%' }"></div>
        </div>
      </div>
    </div>

    <!-- Table Section -->
    <div class="table-section">
      <div class="section-header">
        <div class="section-title">
          <svg class="section-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="9" y1="21" x2="9" y2="9"/>
          </svg>
          <span>规则列表</span>
        </div>
        <div class="section-actions">
          <span class="rules-count">共 {{ rules.length }} 条规则</span>
        </div>
      </div>
      
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>规则名称</th>
              <th>指标代码</th>
              <th>PromQL 表达式</th>
              <th>条件</th>
              <th>持续时间</th>
              <th>严重级别</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="8" class="loading-cell">
                <div class="loading-spinner"></div>
                <span>加载中...</span>
              </td>
            </tr>
            <tr v-else-if="rules.length === 0">
              <td colspan="8" class="empty-cell">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-icon">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <span>暂无告警规则</span>
              </td>
            </tr>
            <tr v-for="rule in rules" :key="rule.id" :class="{ disabled: !rule.enabled }">
              <td class="name-cell">
                <span class="rule-name">{{ rule.ruleName }}</span>
                <span class="rule-summary" v-if="rule.summary">{{ rule.summary }}</span>
              </td>
              <td class="metric-cell">
                <code>{{ rule.metricCode || '-' }}</code>
              </td>
              <td class="expr-cell">
                <code>{{ rule.exprTemplate }}</code>
              </td>
              <td class="condition-cell">
                <span class="condition-badge">
                  {{ rule.comparator || '=' }} {{ rule.threshold || '-' }}
                </span>
              </td>
              <td class="duration-cell">{{ rule.duration || '0s' }}</td>
              <td>
                <span class="severity-badge" :class="rule.severity">
                  {{ severityLabel(rule.severity) }}
                </span>
              </td>
              <td>
                <label class="switch">
                  <input 
                    type="checkbox" 
                    :checked="rule.enabled === 1" 
                    @change="toggleEnable(rule)"
                  >
                  <span class="slider"></span>
                </label>
              </td>
              <td class="action-cell">
                <button class="table-action-btn edit" @click="openEditModal(rule)" title="编辑">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button class="table-action-btn delete" @click="confirmDelete(rule)" title="删除">
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

    <!-- Add/Edit Modal -->
    <div class="modal-overlay" v-if="showModal" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ isEdit ? '编辑规则' : '新增规则' }}</h2>
          <button class="close-btn" @click="closeModal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <!-- 基本信息 -->
          <div class="form-section">
            <h3 class="section-title">基本信息</h3>
            <div class="form-group">
              <label>规则名称 <span class="required">*</span></label>
              <input v-model="form.ruleName" type="text" placeholder="如：HighCpuUsage" />
            </div>
            <div class="form-group">
              <label>资源类型</label>
              <input v-model="form.resourceType" type="text" placeholder="如：host、pod、container" />
            </div>
            <div class="form-group">
              <label>指标代码</label>
              <input v-model="form.metricCode" type="text" placeholder="如：cpu_usage、memory_usage" />
            </div>
          </div>

          <!-- 告警条件 -->
          <div class="form-section">
            <h3 class="section-title">告警条件</h3>
            <div class="form-group">
              <label>PromQL 表达式 <span class="required">*</span></label>
              <textarea v-model="form.exprTemplate" placeholder="如：100 - (avg(irate(node_cpu_seconds_total{mode='idle'}[5m])) * 100) > 80"></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>比较操作符</label>
                <select v-model="form.comparator">
                  <option value="">-- 选择操作符 --</option>
                  <option value=">">&gt; (大于)</option>
                  <option value="<">&lt; (小于)</option>
                  <option value=">=">&gt;= (大于等于)</option>
                  <option value="<=">&lt;= (小于等于)</option>
                  <option value="==">==(等于)</option>
                  <option value="!=">!= (不等于)</option>
                </select>
              </div>
              <div class="form-group">
                <label>阈值</label>
                <input v-model="form.threshold" type="number" placeholder="如：80" step="0.01" />
              </div>
            </div>
            <div class="form-group">
              <label>持续时间</label>
              <input v-model="form.duration" type="text" placeholder="如：5m" />
            </div>
          </div>

          <!-- 告警信息 -->
          <div class="form-section">
            <h3 class="section-title">告警信息</h3>
            <div class="form-group">
              <label>严重级别</label>
              <select v-model="form.severity">
                <option value="info">信息</option>
                <option value="warning">警告</option>
                <option value="critical">严重</option>
              </select>
            </div>
            <div class="form-group">
              <label>摘要信息</label>
              <input v-model="form.summary" type="text" placeholder="告警摘要" />
            </div>
            <div class="form-group">
              <label>详细描述</label>
              <textarea v-model="form.description" placeholder="告警详细描述"></textarea>
            </div>
          </div>

          <!-- 状态 -->
          <div class="form-section">
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="form.enabled" :true-value="1" :false-value="0" />
                <span>启用规则</span>
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="action-btn" @click="closeModal">取消</button>
          <button class="action-btn primary" @click="submitForm" :disabled="submitting">
            <span v-if="submitting" class="spinner"></span>
            {{ isEdit ? '保存' : '创建' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirm Modal -->
    <div class="modal-overlay" v-if="showDeleteConfirm" @click.self="showDeleteConfirm = false">
      <div class="modal modal-sm">
        <div class="modal-header">
          <h2>确认删除</h2>
          <button class="close-btn" @click="showDeleteConfirm = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <p class="confirm-text">
            确定要删除规则 <strong>{{ ruleToDelete?.ruleName }}</strong> 吗？
          </p>
          <p class="confirm-warning">此操作不可恢复</p>
        </div>
        <div class="modal-footer">
          <button class="action-btn" @click="showDeleteConfirm = false">取消</button>
          <button class="action-btn danger" @click="deleteRule" :disabled="deleting">
            <span v-if="deleting" class="spinner"></span>
            删除
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
import { ref, reactive, computed, onMounted } from 'vue'
import axios from 'axios'

const API_BASE = '/api/alert-rules'

export default {
  name: 'AlertRuleManagement',
  setup() {
    const rules = ref([])
    const loading = ref(false)
    const showModal = ref(false)
    const showDeleteConfirm = ref(false)
    const isEdit = ref(false)
    const submitting = ref(false)
    const deleting = ref(false)
    const publishing = ref(false)
    const ruleToDelete = ref(null)

    const form = reactive({
      id: null,
      ruleName: '',
      resourceType: '',
      metricCode: '',
      exprTemplate: '',
      comparator: '',
      threshold: null,
      duration: '',
      severity: 'warning',
      summary: '',
      description: '',
      enabled: 1
    })

    const toast = reactive({
      show: false,
      message: '',
      type: 'success'
    })

    const enabledCount = computed(() => rules.value.filter(r => r.enabled === 1).length)

    const showToast = (message, type = 'success') => {
      toast.message = message
      toast.type = type
      toast.show = true
      setTimeout(() => { toast.show = false }, 3000)
    }

    const severityLabel = (severity) => {
      const map = { info: '信息', warning: '警告', critical: '严重' }
      return map[severity] || severity
    }

    const fetchRules = async () => {
      loading.value = true
      try {
        const res = await axios.get(API_BASE)
        rules.value = res.data
      } catch (e) {
        console.error('Error fetching rules:', e)
        showToast('获取规则列表失败', 'error')
      } finally {
        loading.value = false
      }
    }

    const resetForm = () => {
      Object.assign(form, {
        id: null,
        ruleName: '',
        resourceType: '',
        metricCode: '',
        exprTemplate: '',
        comparator: '',
        threshold: null,
        duration: '5m',
        severity: 'warning',
        summary: '',
        description: '',
        enabled: 1
      })
    }

    const openAddModal = () => {
      resetForm()
      isEdit.value = false
      showModal.value = true
    }

    const openEditModal = (rule) => {
      Object.assign(form, {
        id: rule.id,
        ruleName: rule.ruleName,
        resourceType: rule.resourceType || '',
        metricCode: rule.metricCode || '',
        exprTemplate: rule.exprTemplate,
        comparator: rule.comparator || '',
        threshold: rule.threshold,
        duration: rule.duration,
        severity: rule.severity,
        summary: rule.summary || '',
        description: rule.description || '',
        enabled: rule.enabled
      })
      isEdit.value = true
      showModal.value = true
    }

    const closeModal = () => {
      showModal.value = false
      resetForm()
    }

    const submitForm = async () => {
      if (!form.ruleName || !form.exprTemplate) {
        showToast('请填写必填项', 'error')
        return
      }
      submitting.value = true
      try {
        // 构建完整的请求数据，确保所有字段都被发送
        const payload = {
          id: form.id,
          ruleName: form.ruleName.trim(),
          resourceType: form.resourceType ? form.resourceType.trim() : '',
          metricCode: form.metricCode ? form.metricCode.trim() : '',
          exprTemplate: form.exprTemplate.trim(),
          comparator: form.comparator || '',  // 确保发送比较操作符
          threshold: form.threshold !== null && form.threshold !== '' ? parseFloat(form.threshold) : null,  // 转换为数字
          duration: form.duration ? form.duration.trim() : '',
          severity: form.severity || 'warning',
          summary: form.summary ? form.summary.trim() : '',
          description: form.description ? form.description.trim() : '',
          enabled: form.enabled ? 1 : 0
        }
        
        console.log('Submitting payload:', payload)  // 调试日志
        
        if (isEdit.value) {
          await axios.put(API_BASE, payload)
          showToast('规则更新成功')
        } else {
          await axios.post(API_BASE, payload)
          showToast('规则创建成功')
        }
        closeModal()
        fetchRules()
      } catch (e) {
        console.error('Error submitting form:', e)
        const errorMsg = e.response?.data?.message || '操作失败'
        showToast(errorMsg, 'error')
      } finally {
        submitting.value = false
      }
    }

    const toggleEnable = async (rule) => {
      const newEnabled = rule.enabled === 1 ? 0 : 1
      try {
        await axios.post(`${API_BASE}/${rule.id}/enable`, null, {
          params: { enabled: newEnabled }
        })
        rule.enabled = newEnabled
        showToast(newEnabled ? '规则已启用' : '规则已停用')
      } catch (e) {
        console.error('Error toggling enable:', e)
        showToast('操作失败', 'error')
      }
    }

    const confirmDelete = (rule) => {
      ruleToDelete.value = rule
      showDeleteConfirm.value = true
    }

    const deleteRule = async () => {
      deleting.value = true
      try {
        await axios.delete(`${API_BASE}/${ruleToDelete.value.id}`)
        showToast('规则已删除')
        showDeleteConfirm.value = false
        fetchRules()
      } catch (e) {
        console.error('Error deleting rule:', e)
        showToast('删除失败', 'error')
      } finally {
        deleting.value = false
      }
    }

    const publishAll = async () => {
      publishing.value = true
      try {
        await axios.post(`${API_BASE}/publish`)
        showToast('规则发布成功')
      } catch (e) {
        console.error('Error publishing rules:', e)
        showToast('发布失败', 'error')
      } finally {
        publishing.value = false
      }
    }

    onMounted(fetchRules)

    return {
      rules, loading, showModal, showDeleteConfirm, isEdit, submitting,
      deleting, publishing, ruleToDelete, form, toast, enabledCount,
      severityLabel, openAddModal, openEditModal, closeModal, submitForm,
      toggleEnable, confirmDelete, deleteRule, publishAll
    }
  }
}
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.alert-rule-page {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* ==================== Header ==================== */
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
  background: linear-gradient(135deg, var(--accent-cyan), transparent);
  border-radius: 12px;
  color: var(--accent-cyan);
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

.header-actions {
  display: flex;
  gap: 12px;
}

/* ==================== Action Buttons ==================== */
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

.action-btn.primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px var(--accent-cyan-glow);
}

.action-btn.danger {
  background: linear-gradient(135deg, var(--accent-red), #dc2626);
  border-color: transparent;
  color: white;
  box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
}

.action-btn.danger:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(239, 68, 68, 0.4);
}

/* ==================== Stats Grid ==================== */
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
  transition: all 0.3s ease;
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

.stat-card:hover {
  transform: translateY(-4px);
  border-color: var(--card-accent);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.stat-card.cyan { --card-accent: var(--accent-cyan); }
.stat-card.green { --card-accent: var(--accent-green); }
.stat-card.yellow { --card-accent: var(--accent-yellow); }

.stat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, var(--card-accent), transparent);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--card-accent);
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.stat-label {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.stat-progress {
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
}

.stat-progress-bar {
  height: 100%;
  background: var(--card-accent);
  border-radius: 2px;
  transition: width 0.5s ease;
}

/* ==================== Table Section ==================== */
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

.rules-count {
  font-size: 13px;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: 6px 12px;
  border-radius: 6px;
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

.data-table tr.disabled {
  opacity: 0.5;
}

.data-table tr:hover:not(.disabled) {
  background: var(--bg-tertiary);
}

.name-cell {
  min-width: 140px;
}

.rule-name {
  font-weight: 600;
  color: var(--text-primary);
  display: block;
}

.rule-summary {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
  display: block;
}

.metric-cell code {
  background: var(--bg-tertiary);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--accent-yellow);
  border: 1px solid var(--border-color);
}

.expr-cell {
  max-width: 280px;
}

.expr-cell code {
  background: var(--bg-tertiary);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--accent-cyan);
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 1px solid var(--border-color);
}

.condition-cell {
  min-width: 120px;
}

.condition-badge {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(236, 72, 153, 0.1));
  border: 1px solid var(--border-color);
  padding: 6px 12px;
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  display: inline-block;
}

.duration-cell {
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-secondary);
}

/* ==================== Severity Badge ==================== */
.severity-badge {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 8px;
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

/* ==================== Switch ==================== */
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  transition: 0.3s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background: var(--text-muted);
  transition: 0.3s;
  border-radius: 50%;
}

.switch input:checked + .slider {
  background: linear-gradient(135deg, var(--accent-cyan), #0891b2);
  border-color: transparent;
}

.switch input:checked + .slider:before {
  transform: translateX(20px);
  background: white;
}

/* ==================== Table Action Buttons ==================== */
.action-cell {
  white-space: nowrap;
}

.table-action-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  padding: 8px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  color: var(--text-muted);
  margin-right: 8px;
}

.table-action-btn:last-child {
  margin-right: 0;
}

.table-action-btn:hover {
  color: var(--text-primary);
}

.table-action-btn.edit:hover {
  background: rgba(6, 182, 212, 0.15);
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
}

.table-action-btn.delete:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: var(--accent-red);
  color: var(--accent-red);
}

/* ==================== Loading & Empty ==================== */
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

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ==================== Modal ==================== */
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
  max-width: 620px;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.modal-sm {
  max-width: 420px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  background: var(--bg-card);
  z-index: 10;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
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
  position: sticky;
  bottom: 0;
  background: var(--bg-card);
  z-index: 10;
}

/* ==================== Form ==================== */
.form-section {
  margin-bottom: 28px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}

.form-section:last-child {
  border-bottom: none;
}

.form-section > .section-title {
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-cyan);
  text-transform: uppercase;
  letter-spacing: 0.5px;
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

.form-group input[type="text"],
.form-group input[type="number"],
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 11px 13px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-primary);
  font-family: inherit;
  transition: all 0.2s;
}

.form-group input::placeholder,
.form-group textarea::placeholder {
  color: var(--text-muted);
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--accent-cyan);
  box-shadow: 0 0 0 3px var(--accent-cyan-glow);
  background: var(--bg-secondary);
}

.form-group textarea {
  min-height: 90px;
  resize: vertical;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}

.form-group select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

.form-group select option {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  color: var(--text-primary) !important;
  margin: 0 !important;
}

.checkbox-label input {
  width: 18px;
  height: 18px;
  accent-color: var(--accent-cyan);
  cursor: pointer;
}

/* ==================== Confirm Modal ==================== */
.confirm-text {
  margin: 0 0 8px;
  color: var(--text-primary);
  font-size: 15px;
}

.confirm-text strong {
  color: var(--accent-cyan);
}

.confirm-warning {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
}

/* ==================== Toast ==================== */
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
  transform: translateY(20px) translateX(20px);
}

/* ==================== Responsive ==================== */
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .table-wrapper {
    overflow-x: auto;
  }

  .data-table {
    min-width: 900px;
  }
  
  .modal {
    max-width: 95vw;
  }
}
</style>