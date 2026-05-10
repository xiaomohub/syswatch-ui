import http from '@/utils/http'

/**
 * 角色模型已改为 root/admin/user 档位，不再维护「按菜单的 permission 码」。
 * 后端若仍提供 GET /api/rbac/permissions，则 RoleAdmin 展示远端列表；否则为空。
 */
export function localPermissionCatalog() {
  return []
}

function unwrapList(data) {
  if (Array.isArray(data)) return data
  return data?.items ?? data?.list ?? []
}

export function normalizeRole(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = raw.id
  if (id == null) return null
  return {
    id,
    code: raw.code ?? '',
    name: raw.name ?? raw.code ?? '',
    permissionCodes: Array.isArray(raw.permissionCodes) ? raw.permissionCodes : []
  }
}

export function normalizeUser(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = raw.id ?? raw.userId
  if (id == null) return null
  const roles = raw.roles ?? raw.roleList ?? []
  const normRoles = Array.isArray(roles)
    ? roles.map((r) => normalizeRole(r)).filter(Boolean)
    : []
  const roleIds = Array.isArray(raw.roleIds) ? [...raw.roleIds] : normRoles.map((r) => r.id)
  const enabled =
    raw.enabled !== false && raw.status !== 'disabled' && raw.disabled !== true && raw.status !== 0
  const phone = raw.phone ?? raw.mobile ?? raw.phoneNumber ?? raw.tel ?? ''
  return {
    id,
    username: String(raw.username ?? ''),
    displayName: String(raw.displayName ?? raw.name ?? raw.username ?? ''),
    email: String(raw.email ?? ''),
    phone: String(phone ?? ''),
    enabled,
    roles: normRoles,
    roleIds
  }
}

export async function fetchRoles() {
  const res = await http.get('/api/rbac/roles')
  const rows = unwrapList(res.data)
  return rows.map(normalizeRole).filter(Boolean)
}

/** @returns {Promise<{ code: string, name: string }[] | null>} null 表示请求失败，调用方用本地字典 */
export async function fetchPermissionsCatalogOptional() {
  try {
    const res = await http.get('/api/rbac/permissions')
    const remote = res.data
    const list = Array.isArray(remote) ? remote : remote?.items ?? remote?.permissions ?? null
    if (list && list.length) {
      return list.map((x) => ({ code: x.code, name: x.name || x.code }))
    }
    return []
  } catch {
    return null
  }
}

export async function updateRolePermissions(roleId, permissionCodes) {
  await http.put(`/api/rbac/roles/${roleId}/permissions`, { permissionCodes })
}

/**
 * @param {{ keyword?: string, page?: number, size?: number }} [params]
 * @returns {Promise<{ items: ReturnType<typeof normalizeUser>[], total: number }>}
 */
export async function listUsers(params) {
  const res = await http.get('/api/rbac/users', { params })
  const data = res.data
  const items = unwrapList(data).map(normalizeUser).filter(Boolean)
  const total = typeof data?.total === 'number' ? data.total : items.length
  return { items, total }
}

export async function getUser(userId) {
  const res = await http.get(`/api/rbac/users/${encodeURIComponent(String(userId))}`)
  const raw = res.data?.data ?? res.data
  return normalizeUser(raw)
}

/**
 * @param {{ username: string, displayName?: string, email?: string, phone?: string, password: string, enabled?: boolean }} body
 */
export async function createUser(body) {
  const res = await http.post('/api/rbac/users', body)
  const raw = res.data?.data ?? res.data
  const u = normalizeUser(raw)
  if (u) return u
  const id = raw?.id ?? res.data?.id
  if (id != null) {
    return {
      id,
      username: body.username,
      displayName: body.displayName ?? '',
      email: body.email ?? '',
      phone: body.phone ?? '',
      enabled: body.enabled !== false,
      roles: [],
      roleIds: []
    }
  }
  return null
}

/**
 * @param {string|number} userId
 * @param {{ displayName?: string, email?: string, phone?: string, password?: string, enabled?: boolean }} body
 */
export async function updateUser(userId, body) {
  const res = await http.patch(`/api/rbac/users/${encodeURIComponent(String(userId))}`, body)
  const raw = res.data?.data ?? res.data
  return normalizeUser(raw) ?? getUser(userId)
}

export async function deleteUser(userId) {
  await http.delete(`/api/rbac/users/${encodeURIComponent(String(userId))}`)
}

/**
 * 覆盖式写入用户角色（多对多建议整包替换）
 * @param {string|number} userId
 * @param {(string|number)[]} roleIds
 */
export async function setUserRoles(userId, roleIds) {
  await http.put(`/api/rbac/users/${encodeURIComponent(String(userId))}/roles`, { roleIds })
}
