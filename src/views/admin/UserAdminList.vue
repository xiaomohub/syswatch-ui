<template>
  <div class="user-admin">
    <div class="toolbar">
      <input
        v-model.trim="keyword"
        type="search"
        class="search-input"
        placeholder="搜索用户名、姓名、邮箱、手机"
        aria-label="搜索用户"
        @keydown.enter="loadUsers"
      />
      <div class="toolbar-actions">
        <button class="btn" type="button" :disabled="loading" @click="loadUsers">刷新</button>
        <button class="btn primary" type="button" :disabled="loading" @click="openCreate">新建用户</button>
      </div>
    </div>

    <p v-if="listError" class="error-banner">{{ listError }}</p>

    <div class="table-wrap" v-if="!listError || users.length">
      <table class="data-table">
        <thead>
          <tr>
            <th>用户名</th>
            <th>显示名</th>
            <th>邮箱</th>
            <th>手机号码</th>
            <th>状态</th>
            <th>角色</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in filteredUsers" :key="String(u.id)">
            <td class="mono">{{ u.username }}</td>
            <td>{{ u.displayName || '—' }}</td>
            <td>{{ u.email || '—' }}</td>
            <td>{{ u.phone || '—' }}</td>
            <td>
              <span :class="u.enabled ? 'tag tag-on' : 'tag tag-off'">{{ u.enabled ? '启用' : '停用' }}</span>
            </td>
            <td class="roles-cell">{{ roleSummary(u) }}</td>
            <td class="actions">
              <button type="button" class="link-btn" @click="openEdit(u)">编辑</button>
              <button
                type="button"
                class="link-btn danger"
                :disabled="isCurrentUser(u)"
                @click="removeUser(u)"
              >
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!loading && !filteredUsers.length" class="empty-hint">无匹配用户</p>
    </div>

    <Teleport to="body">
      <div v-if="editor.open" class="editor-overlay" @click.self="closeEditor">
        <div class="editor" role="dialog" aria-modal="true" aria-labelledby="user-editor-title">
          <h2 id="user-editor-title">{{ editor.mode === 'create' ? '新建用户' : '编辑用户' }}</h2>
          <p v-if="editor.error" class="error-banner">{{ editor.error }}</p>
          <div class="form-grid">
            <label class="field">
              <span>用户名 <span v-if="editor.mode === 'create'" class="req">*</span></span>
              <input
                v-model.trim="editor.form.username"
                type="text"
                class="fc-input"
                :disabled="editor.mode !== 'create'"
                autocomplete="off"
                placeholder="登录名，创建后不可改"
              />
            </label>
            <label class="field">
              <span>显示名</span>
              <input v-model.trim="editor.form.displayName" type="text" class="fc-input" autocomplete="name" />
            </label>
            <label class="field">
              <span>邮箱</span>
              <input v-model.trim="editor.form.email" type="email" class="fc-input" autocomplete="email" />
            </label>
            <label class="field">
              <span>手机号码</span>
              <input v-model.trim="editor.form.phone" type="tel" class="fc-input" autocomplete="tel" />
            </label>
            <label class="field">
              <span>密码 <span v-if="editor.mode === 'create'" class="req">*</span></span>
              <input
                v-model="editor.form.password"
                type="password"
                class="fc-input"
                :placeholder="editor.mode === 'create' ? '初始密码' : '留空则不修改'"
                autocomplete="new-password"
              />
            </label>
            <label class="field checkbox-row">
              <input v-model="editor.form.enabled" type="checkbox" />
              <span>启用账号</span>
            </label>
          </div>
          <div class="roles-block">
            <div class="roles-label">角色</div>
            <div class="roles-checks">
              <label v-for="r in roles" :key="String(r.id)" class="role-check">
                <input type="checkbox" :value="r.id" v-model="editor.form.roleIds" />
                <span>{{ r.name }}</span>
                <span class="role-code mono">{{ r.code }}</span>
              </label>
              <p v-if="!roles.length" class="muted">暂无角色数据，请先在「角色与权限」中维护角色。</p>
            </div>
          </div>
          <div class="editor-actions">
            <button type="button" class="btn secondary" :disabled="editor.saving" @click="closeEditor">取消</button>
            <button type="button" class="btn primary" :disabled="editor.saving" @click="saveEditor">
              {{ editor.saving ? '保存中…' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { listUsers, fetchRoles, createUser, updateUser, deleteUser, setUserRoles } from '@/api/rbacAdmin'

const userStore = useUserStore()

const loading = ref(false)
const listError = ref('')
const users = ref([])
const roles = ref([])
const keyword = ref('')

const editor = ref({
  open: false,
  mode: 'create',
  saving: false,
  error: '',
  userId: null,
  form: {
    username: '',
    displayName: '',
    email: '',
    phone: '',
    password: '',
    enabled: true,
    /** @type {(string|number)[]} */
    roleIds: []
  }
})

const filteredUsers = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  if (!q) return users.value
  return users.value.filter((u) => {
    const blob = [u.username, u.displayName, u.email, u.phone].join(' ').toLowerCase()
    return blob.includes(q)
  })
})

function roleSummary(u) {
  const names = (u.roles || []).map((r) => r.name || r.code).filter(Boolean)
  return names.length ? names.join('、') : '—'
}

function isCurrentUser(u) {
  const self = (userStore.profile.username || '').trim().toLowerCase()
  if (!self) return false
  return (u.username || '').trim().toLowerCase() === self
}

async function loadRoles() {
  try {
    roles.value = await fetchRoles()
  } catch {
    roles.value = []
  }
}

async function loadUsers() {
  loading.value = true
  listError.value = ''
  try {
    const { items } = await listUsers({})
    users.value = items
  } catch (e) {
    users.value = []
    listError.value =
      e.response?.status === 404
        ? '后端尚未实现用户管理接口，请参考 docs/user-management-backend.md 对接。'
        : e.response?.data?.message || e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function resetForm() {
  editor.value.form = {
    username: '',
    displayName: '',
    email: '',
    phone: '',
    password: '',
    enabled: true,
    roleIds: []
  }
  editor.value.error = ''
  editor.value.userId = null
}

function openCreate() {
  resetForm()
  editor.value = {
    ...editor.value,
    open: true,
    mode: 'create',
    saving: false
  }
}

function openEdit(u) {
  editor.value = {
    ...editor.value,
    open: true,
    mode: 'update',
    saving: false,
    error: '',
    userId: u.id,
    form: {
      username: u.username,
      displayName: u.displayName,
      email: u.email,
      phone: u.phone || '',
      password: '',
      enabled: u.enabled,
      roleIds: [...(u.roleIds || [])]
    }
  }
}

function closeEditor() {
  editor.value = {
    ...editor.value,
    open: false,
    saving: false,
    error: '',
    mode: 'create',
    userId: null,
    form: {
      username: '',
      displayName: '',
      email: '',
      phone: '',
      password: '',
      enabled: true,
      roleIds: []
    }
  }
}

async function saveEditor() {
  const ed = editor.value
  const f = ed.form
  ed.error = ''
  if (ed.mode === 'create') {
    if (!f.username.trim()) {
      ed.error = '请填写用户名'
      return
    }
    if (!f.password) {
      ed.error = '请设置初始密码'
      return
    }
  }
  ed.saving = true
  try {
    let uid = ed.userId
    if (ed.mode === 'create') {
      const created = await createUser({
        username: f.username.trim(),
        displayName: f.displayName.trim() || undefined,
        email: f.email.trim() || undefined,
        phone: f.phone.trim() || undefined,
        password: f.password,
        enabled: f.enabled
      })
      uid = created?.id
      if (uid == null) {
        ed.error = '创建成功但未返回用户 id，无法绑定角色'
        return
      }
    } else {
      const body = {
        displayName: f.displayName.trim() || undefined,
        email: f.email.trim() || undefined,
        phone: f.phone.trim() || undefined,
        enabled: f.enabled
      }
      if (f.password) body.password = f.password
      await updateUser(uid, body)
    }
    await setUserRoles(uid, f.roleIds)
    closeEditor()
    await loadUsers()
  } catch (e) {
    ed.error = e.response?.data?.message || e.message || '保存失败'
  } finally {
    ed.saving = false
  }
}

async function removeUser(u) {
  if (isCurrentUser(u)) return
  listError.value = ''
  try {
    await deleteUser(u.id)
    await loadUsers()
  } catch (e) {
    listError.value = e.response?.data?.message || e.message || '删除失败'
  }
}

onMounted(() => {
  loadRoles()
  loadUsers()
})
</script>

<style scoped>
.user-admin {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.toolbar-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.search-input {
  min-width: 220px;
  flex: 1;
  max-width: 360px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 14px;
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
.roles-cell {
  max-width: 280px;
  line-height: 1.4;
}
.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}
.tag-on {
  background: rgba(34, 197, 94, 0.12);
  color: rgb(34, 197, 94);
}
.tag-off {
  background: rgba(239, 68, 68, 0.1);
  color: var(--accent-red);
}
.actions {
  text-align: right;
  white-space: nowrap;
}
.link-btn {
  background: none;
  border: none;
  color: var(--accent-cyan);
  cursor: pointer;
  font-size: 14px;
  padding: 0 8px 0 0;
}
.link-btn:hover {
  text-decoration: underline;
}
.link-btn.danger {
  color: var(--accent-red);
}
.link-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  text-decoration: none;
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
.empty-hint {
  margin: 0;
  padding: 24px;
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
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
  width: min(520px, 100%);
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
.form-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}
.field .req {
  color: var(--accent-red);
}
.fc-input {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 14px;
}
.checkbox-row {
  flex-direction: row;
  align-items: center;
  gap: 10px;
}
.roles-block {
  margin-top: 20px;
}
.roles-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 10px;
}
.roles-checks {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow: auto;
  padding: 4px 0;
}
.role-check {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 10px;
  align-items: center;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  cursor: pointer;
  font-size: 13px;
}
.role-check input {
  grid-row: span 2;
}
.role-code {
  grid-column: 2;
  font-size: 11px;
  color: var(--accent-cyan);
}
.muted {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
}
.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
</style>
