/**
 * 权限码与菜单、监控能力映射（后端 JWT / 登录响应应下发同名 permission 字符串）
 */
export const PERM = {
  MENU_DASHBOARD: 'menu:dashboard',
  MENU_ALERT: 'menu:alert',
  MENU_FAULT_CENTER: 'menu:faultcenter',
  MENU_ALERT_CONFIG: 'menu:alertconfig',
  /** WatchAlert：规则组 / 规则 / 活跃与历史事件 / 静默 */
  MENU_ALERT_MGMT: 'menu:alert:mgmt',
  MENU_ALERT_SILENCE: 'menu:alertsilence',
  MENU_LOG_QUERY: 'menu:logquery',
  /** 智能诊断（根因 / 巡检 / 历史） */
  MENU_AIOPS_RCA: 'menu:aiops:rca',
  /** 经平台内嵌查看 Grafana 大盘（URL 仅由后端签发，前端不拼真实 Grafana 地址） */
  MONITOR_EMBED: 'monitor:embed',
  /** 新开标签直达 Grafana（高敏，仅运维/管理员） */
  MONITOR_GRAFANA_DIRECT: 'monitor:grafana:direct',
  ADMIN_ROLE_MANAGE: 'admin:role:manage'
}

/** 旧后端仅返回 token、无 permissions 数组时，视为全量兼容 */
export const LEGACY_FULL_PERMISSIONS = Object.values(PERM)

/**
 * 登录后默认进入的第一个有权限的菜单路径。
 * 若 JWT 未包含任何已知菜单权限，则落在「故障中心」（该路由未挂 permission，登录用户均可访问），
 * 避免误进「无权限」页看起来像未跳转。
 */
export function defaultHomePath(hasPermission) {
  const order = [
    ['/dashboard', PERM.MENU_DASHBOARD],
    ['/alert', PERM.MENU_ALERT],
    ['/aiops-rca', PERM.MENU_AIOPS_RCA],
    ['/alertconfig', PERM.MENU_ALERT_CONFIG],
    ['/alert-mgmt', PERM.MENU_ALERT_MGMT],
    ['/alertsilence', PERM.MENU_ALERT_SILENCE],
    ['/logquery', PERM.MENU_LOG_QUERY],
    ['/roleadmin', PERM.ADMIN_ROLE_MANAGE],
    ['/fault-center', PERM.MENU_FAULT_CENTER]
  ]
  for (const [path, code] of order) {
    if (hasPermission(code)) return path
  }
  return '/fault-center'
}
