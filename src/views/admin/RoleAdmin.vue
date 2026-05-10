<template>
  <div class="role-admin">
    <div class="toolbar">
      <span class="hint">
        平台以 <code>root</code> / <code>admin</code> / <code>user</code> 三档角色为主；下方权限码仅在后端仍使用细粒度串时维护（见
        <code>docs/rbac-role-model.md</code>）。
      </span>
      <button class="btn" type="button" :disabled="loading" @click="loadAll">刷新</button>
    </div>

    <p v-if="listError" class="error-banner">{{ listError }}</p>

    <div class="table-wrap" v-if="!listError || roles.length">
      <table class="data-table">
        <thead>
          <tr>
            <th>角色</th>
            <th>编码</th>
            <th>权限数</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in roles" :key="r.id ?? r.code">
            <td>{{ r.name }}</td>
            <td class="mono">{{ r.code }}</td>
            <td>{{ (r.permissionCodes || []).length }}</td>
            <td class="actions">
              <button type="button" class="link-btn" @click="openEditor(r)">编辑权限</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="editor.open" class="editor-overlay" @click.self="closeEditor">
      <div class="editor">
        <h2>{{ editor.role?.name }} <span class="sub">({{ editor.role?.code }})</span></h2>
        <p v-if="editor.error" class="error-banner">{{ editor.error }}</p>
        <div class="perm-grid">
          <label v-for="p in catalog" :key="p.code" class="perm-item">
            <input type="checkbox" :value="p.code" v-model="editor.selected" />
            <span class="perm-code">{{ p.code }}</span>
            <span class="perm-name">{{ p.name }}</span>
          </label>
        </div>
        <div class="editor-actions">
          <button type="button" class="btn secondary" @click="closeEditor">取消</button>
          <button type="button" class="btn primary" :disabled="editor.saving" @click="saveEditor">
            {{ editor.saving ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import {
  fetchRoles,
  fetchPermissionsCatalogOptional,
  updateRolePermissions,
  localPermissionCatalog
} from '@/api/rbacAdmin'

const loading = ref(false)
const listError = ref('')
const roles = ref([])
const catalog = ref([])

const editor = ref({
  open: false,
  role: null,
  selected: [],
  saving: false,
  error: ''
})

async function loadAll() {
  loading.value = true
  listError.value = ''
  try {
    const [roleRows, remotePerms] = await Promise.all([fetchRoles(), fetchPermissionsCatalogOptional()])
    roles.value = roleRows
    catalog.value = remotePerms && remotePerms.length ? remotePerms : localPermissionCatalog()
  } catch (e) {
    roles.value = []
    catalog.value = localPermissionCatalog()
    listError.value =
      e.response?.status === 404
        ? '后端尚未实现 RBAC 接口。下方为前端权限字典预览。'
        : e.response?.data?.message || e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function openEditor(role) {
  editor.value = {
    open: true,
    role,
    selected: [...(role.permissionCodes || [])],
    saving: false,
    error: ''
  }
}

function closeEditor() {
  editor.value = { open: false, role: null, selected: [], saving: false, error: '' }
}

async function saveEditor() {
  const r = editor.value.role
  if (!r || r.id == null) {
    editor.value.error = '缺少角色 id，无法保存（请确认后端返回 id）'
    return
  }
  editor.value.saving = true
  editor.value.error = ''
  try {
    await updateRolePermissions(r.id, editor.value.selected)
    closeEditor()
    await loadAll()
  } catch (e) {
    editor.value.error = e.response?.data?.message || e.message || '保存失败'
  } finally {
    editor.value.saving = false
  }
}

onMounted(() => {
  loadAll()
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
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.hint {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.5;
}
.hint code {
  font-size: 12px;
  color: var(--accent-cyan);
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
}
.data-table th {
  color: var(--text-muted);
  font-weight: 500;
}
.mono {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 13px;
}
.actions {
  text-align: right;
}
.link-btn {
  background: none;
  border: none;
  color: var(--accent-cyan);
  cursor: pointer;
  font-size: 14px;
  padding: 0;
}
.link-btn:hover {
  text-decoration: underline;
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
.btn.primary {
  background: var(--brand-600);
  border-color: transparent;
  color: #fff;
}
.btn.primary:hover:not(:disabled) {
  background: var(--brand-700);
}
.btn.secondary {
  background: transparent;
}
.editor-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 24px;
}
.editor {
  width: min(640px, 100%);
  max-height: 90vh;
  overflow: auto;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
}
.editor h2 {
  margin: 0 0 16px;
  font-size: 18px;
}
.editor .sub {
  font-size: 14px;
  color: var(--text-muted);
  font-weight: 400;
}
.perm-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 16px 0 24px;
}
.perm-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 12px;
  align-items: start;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  cursor: pointer;
}
.perm-item input {
  margin-top: 4px;
}
.perm-code {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  color: var(--accent-cyan);
}
.perm-name {
  grid-column: 2;
  font-size: 13px;
  color: var(--text-secondary);
}
.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
