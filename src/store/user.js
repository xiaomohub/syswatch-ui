import { defineStore } from 'pinia'
import {
  LEGACY_FULL_PERMISSIONS,
  RBAC_RELAX_ALL,
  ACCESS_LEVEL,
  resolveAccessLevelFromRoles
} from '@/constants/rbac'

const LS_USER = 'syswatch_user'
const LS_PERMS = 'syswatch_permissions'
const LS_LEGACY = 'syswatch_rbac_legacy'

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

/** 已登录但本地尚无权限快照时，视为旧版前端升级，避免空白权限锁死菜单 */
function migrateLegacySessionIfNeeded() {
  const token = localStorage.getItem('token') || ''
  let rbacLegacyMode = localStorage.getItem(LS_LEGACY) === '1'
  const hadPermsKey = localStorage.getItem(LS_PERMS) !== null
  let permissions = readJson(LS_PERMS, [])

  if (token && !hadPermsKey && !rbacLegacyMode) {
    rbacLegacyMode = true
    permissions = [...LEGACY_FULL_PERMISSIONS]
    localStorage.setItem(LS_LEGACY, '1')
    localStorage.setItem(LS_PERMS, JSON.stringify(permissions))
  } else if (rbacLegacyMode && !hadPermsKey) {
    permissions = [...LEGACY_FULL_PERMISSIONS]
    localStorage.setItem(LS_PERMS, JSON.stringify(permissions))
  }

  return { rbacLegacyMode, permissions }
}

const _session = migrateLegacySessionIfNeeded()

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    /** @type {{ username: string, displayName: string, roles: { code: string, name: string }[] }} */
    profile: readJson(LS_USER, {
      username: '',
      displayName: '',
      roles: []
    }),
    /** @type {string[]} */
    permissions: _session.permissions,
    /** 登录响应未带 permissions 字段时为 true，兼容旧后端 */
    rbacLegacyMode: _session.rbacLegacyMode
  }),
  getters: {
    roleLabel(state) {
      const r = state.profile.roles
      if (r && r.length) return r.map((x) => x.name || x.code).join('、')
      return state.rbacLegacyMode ? '系统管理员' : '未分配角色'
    },
    hasPermission: (state) => (code) => {
      if (RBAC_RELAX_ALL) return true
      if (state.rbacLegacyMode) return true
      return state.permissions.includes(code)
    },
    /** 三档角色：0 user / 1 admin / 2 root；联调全开与 legacy 视为 root */
    accessLevel: (state) => {
      if (RBAC_RELAX_ALL) return ACCESS_LEVEL.ROOT
      if (state.rbacLegacyMode) return ACCESS_LEVEL.ROOT
      return resolveAccessLevelFromRoles(state.profile.roles || [])
    }
  },
  actions: {
    setToken(token) {
      this.token = token
      localStorage.setItem('token', token)
    },
    setSession({ token, user, permissions, permissionsOmitted }) {
      if (token != null) {
        this.setToken(token)
      }
      if (user) {
        this.profile = {
          username: user.username || '',
          displayName: user.displayName || user.username || '',
          roles: Array.isArray(user.roles) ? user.roles : []
        }
        localStorage.setItem(LS_USER, JSON.stringify(this.profile))
        if (user.tenantId != null && String(user.tenantId).trim() !== '') {
          localStorage.setItem('tenantId', String(user.tenantId).trim())
        }
      }
      if (permissionsOmitted) {
        this.rbacLegacyMode = true
        this.permissions = [...LEGACY_FULL_PERMISSIONS]
        localStorage.setItem(LS_LEGACY, '1')
        localStorage.setItem(LS_PERMS, JSON.stringify(this.permissions))
        return
      }
      this.rbacLegacyMode = false
      localStorage.removeItem(LS_LEGACY)
      this.permissions = Array.isArray(permissions) ? permissions : []
      localStorage.setItem(LS_PERMS, JSON.stringify(this.permissions))
    },
    logout() {
      this.token = ''
      this.profile = { username: '', displayName: '', roles: [] }
      this.permissions = []
      this.rbacLegacyMode = false
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem(LS_USER)
      localStorage.removeItem(LS_PERMS)
      localStorage.removeItem(LS_LEGACY)
      localStorage.removeItem('tenantId')
    }
  }
})
