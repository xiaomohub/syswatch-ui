/**
 * 访问控制：以角色档位为主（root / admin / user），不再按菜单 permission 码授权。
 * 兼容：RBAC_RELAX_ALL、rbacLegacyMode 时仍视为最高档位，避免联调/旧环境锁死。
 */

/** 为 true 时前端不校验菜单/路由档位（仅仍要求已登录）。联调完成后请改回 false。 */
export const RBAC_RELAX_ALL = true

/** 为 false 时隐藏「告警统计」菜单并拦截 `/alert`（临时开关，恢复时改回 true）。 */
export const FEATURE_ALERT_STATISTICS = false

/** 与登录用户角色编码对齐（小写比较）：root > admin > user */
export const ROLE_CODE = {
  ROOT: 'root',
  ADMIN: 'admin',
  USER: 'user'
}

/** 档位数值越大权限越高，用于路由 meta.access 与 getters 比较 */
export const ACCESS_LEVEL = {
  USER: 0,
  ADMIN: 1,
  ROOT: 2
}

/**
 * @param {{ code?: string, name?: string }[]} roles
 * @returns {typeof ACCESS_LEVEL[keyof typeof ACCESS_LEVEL]}
 */
export function resolveAccessLevelFromRoles(roles) {
  if (!Array.isArray(roles) || !roles.length) return ACCESS_LEVEL.USER
  const codes = roles.map((r) => String(r?.code ?? r?.name ?? '').trim().toLowerCase())
  if (codes.some((c) => c === 'root' || c === 'superadmin' || c === 'system')) return ACCESS_LEVEL.ROOT
  if (codes.some((c) => c === 'admin' || c === 'administrator')) return ACCESS_LEVEL.ADMIN
  return ACCESS_LEVEL.USER
}

/**
 * 路由 meta.access：'user' | 'admin' | 'root'
 * 取匹配记录中的最高要求（root > admin > user）。
 * @param {import('vue-router').RouteRecordNormalized[]} matched
 */
export function requiredAccessRankFromMatched(matched) {
  let max = ACCESS_LEVEL.USER
  for (const record of matched) {
    const a = record.meta?.access
    if (a === 'root') max = Math.max(max, ACCESS_LEVEL.ROOT)
    else if (a === 'admin') max = Math.max(max, ACCESS_LEVEL.ADMIN)
    else if (a === 'user') max = Math.max(max, ACCESS_LEVEL.USER)
  }
  return max
}

/** 登录后默认落地页（按角色可扩展；当前统一进监控面板） */
export function defaultHomePath() {
  return '/dashboard'
}

/** 以下为旧「菜单 permission」常量，仅用于 rbacLegacyMode / 后端仍下发细粒度码时的兼容，路由不再依赖。 */
export const PERM = {
  MENU_DASHBOARD: 'menu:dashboard',
  MENU_ALERT: 'menu:alert',
  MENU_FAULT_CENTER: 'menu:faultcenter',
  MENU_ALERT_MGMT: 'menu:alert:mgmt',
  MENU_DATASOURCE: 'menu:datasource',
  MENU_AIOPS_RCA: 'menu:aiops:rca',
  MONITOR_EMBED: 'monitor:embed',
  MONITOR_GRAFANA_DIRECT: 'monitor:grafana:direct',
  ADMIN_ROLE_MANAGE: 'admin:role:manage'
}

/** 旧后端仅返回 token、无 permissions 且无 roles 时，视为全量兼容 */
export const LEGACY_FULL_PERMISSIONS = Object.values(PERM)
