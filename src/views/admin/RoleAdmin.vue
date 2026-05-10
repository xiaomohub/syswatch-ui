<template>
  <div class="role-admin">
    <div class="toolbar">
      <button class="btn" type="button" :disabled="loading" @click="loadRoles">刷新</button>
    </div>

    <p v-if="listError" class="error-banner">{{ listError }}</p>

    <div class="table-wrap" v-if="!listError || roles.length">
      <table class="data-table">
        <thead>
          <tr>
            <th>角色</th>
            <th>编码</th>
            <th>档位说明</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in roles" :key="r.id ?? r.code">
            <td>{{ r.name }}</td>
            <td class="mono">{{ r.code }}</td>
            <td class="desc-cell">{{ tierDescription(r.code) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { fetchRoles } from '@/api/rbacAdmin'

const loading = ref(false)
const listError = ref('')
const roles = ref([])

/** @param {unknown} code */
function tierDescription(code) {
  const c = String(code ?? '')
    .trim()
    .toLowerCase()
  const map = {
    root: '平台超级管理：在 admin 能力基础上可访问人员管理、本页等账号治理',
    superadmin: '与 root 同档（别名）',
    system: '与 root 同档（别名）',
    admin: '运维使用者：告警、故障中心、值班、通知等业务；不含人员管理',
    administrator: '与 admin 同档（别名）',
    user: '仅监控面板及通用页（如无权提示页）；默认只读'
  }
  return map[c] || '—'
}

async function loadRoles() {
  loading.value = true
  listError.value = ''
  try {
    roles.value = await fetchRoles()
  } catch (e) {
    roles.value = []
    listError.value =
      e.response?.status === 404
        ? '后端尚未实现 RBAC 接口。'
        : e.response?.data?.message || e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadRoles()
})
</script>

<style scoped>
.role-admin {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}
.error-banner {
  margin: 0;
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: var(--accent-red);
  font-size: 14px;
}
.table-wrap {
  overflow: auto;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-card);
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.data-table th,
.data-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
  vertical-align: top;
}
.data-table th {
  color: var(--text-muted);
  font-weight: 500;
}
.mono {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 13px;
}
.desc-cell {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.45;
}
.btn {
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-primary);
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
