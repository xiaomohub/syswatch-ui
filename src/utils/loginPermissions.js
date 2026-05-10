/**
 * 登录后权限快照：合并响应体常见字段与 JWT payload。
 * 若合并结果为空且响应/JWT 中也无 roles，则走 Pinia「旧版全量 permissions」兼容。
 */

const BODY_PERM_KEYS = [
  'permissions',
  'permissionList',
  'permissionCodes',
  'authorities',
  'authorityList',
  'apis'
]

function dedupe(arr) {
  return [...new Set(arr)]
}

/** @param {unknown} v */
export function normalizePermissionArray(v) {
  if (v == null) return []
  if (Array.isArray(v)) {
    return v
      .map((x) => {
        if (x == null) return ''
        if (typeof x === 'string') return x.trim()
        if (typeof x === 'object') {
          return String(
            /** @type {Record<string, unknown>} */ (x).authority ??
              /** @type {Record<string, unknown>} */ (x).permission ??
              /** @type {Record<string, unknown>} */ (x).code ??
              /** @type {Record<string, unknown>} */ (x).name ??
              ''
          ).trim()
        }
        return String(x).trim()
      })
      .filter(Boolean)
  }
  if (typeof v === 'string') {
    return v
      .split(/[\s,|]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

/** @param {Record<string, unknown>} obj */
function mergePermissionKeys(obj) {
  const out = []
  for (const k of BODY_PERM_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(obj, k)) continue
    out.push(...normalizePermissionArray(obj[k]))
  }
  return dedupe(out)
}

/** @param {string} token */
export function decodeJwtPayload(token) {
  try {
    const parts = String(token).trim().split('.')
    if (parts.length < 2) return null
    let segment = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const pad = segment.length % 4
    if (pad) segment += '='.repeat(4 - pad)
    const binary = atob(segment)
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    const json = new TextDecoder('utf-8').decode(bytes)
    const data = JSON.parse(json)
    return data && typeof data === 'object' ? data : null
  } catch {
    return null
  }
}

/** @param {Record<string, unknown> | null} payload */
function collectPermissionsFromJwt(payload) {
  if (!payload) return []
  const candidates = [
    payload.permissions,
    payload.perms,
    payload.permission,
    payload.authorities,
    payload.authority,
    payload.scope
  ]
  const out = []
  for (const c of candidates) {
    out.push(...normalizePermissionArray(c))
  }
  return dedupe(out)
}

/** @param {Record<string, unknown> | null} payload */
function collectRolesFromJwt(payload) {
  if (!payload) return []
  if (Array.isArray(payload.roles)) return payload.roles
  if (typeof payload.role === 'string' && payload.role.trim()) return [{ code: payload.role.trim() }]
  return []
}

/**
 * 登录响应 + JWT 中的角色列表（用于三档角色模型，避免空 permissions 误触 legacy 全放行）。
 * @param {Record<string, unknown>} flat
 * @param {string} token
 * @returns {{ code?: string, name?: string }[]}
 */
export function extractLoginRoles(flat, token) {
  const u = flat.user
  if (u && typeof u === 'object' && Array.isArray(u.roles) && u.roles.length) {
    return /** @type {{ code?: string, name?: string }[]} */ (u.roles)
  }
  if (Array.isArray(flat.roles) && flat.roles.length) {
    return /** @type {{ code?: string, name?: string }[]} */ (flat.roles)
  }
  return collectRolesFromJwt(decodeJwtPayload(token))
}

/**
 * @param {Record<string, unknown>} flat
 * @param {string} token
 * @returns {{ merged: string[], permissionsOmitted: boolean }}
 */
export function effectiveLoginPermissions(flat, token) {
  const fromBody = mergePermissionKeys(flat)
  const fromJwt = collectPermissionsFromJwt(decodeJwtPayload(token))
  const merged = dedupe([...fromBody, ...fromJwt])
  const hasRoles = extractLoginRoles(flat, token).length > 0
  return {
    merged,
    /** 无权限码且无角色信息时，视为旧后端，启用全量 permissions 兼容 */
    permissionsOmitted: merged.length === 0 && !hasRoles
  }
}
