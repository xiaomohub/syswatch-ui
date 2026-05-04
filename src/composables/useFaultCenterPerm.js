import { useUserStore } from '@/store/user'
import { FC_API, fcApiPathKey } from '@/constants/faultCenterApiPaths'

/**
 * 故障中心按钮权限：优先匹配 JWT 中的「METHOD + 空格 + 完整 path」字符串。
 * rbacLegacyMode 时视为全量放行（兼容旧登录响应）。
 * SLO 在现网 Go 无 Permission 中间件，仅要求已登录，故 canSlo 恒 true。
 */
export function useFaultCenterPerm() {
  const userStore = useUserStore()

  /** @param {{ method: string, path: string }} op */
  function can(op) {
    if (userStore.rbacLegacyMode) return true
    return userStore.permissions.includes(fcApiPathKey(op))
  }

  return {
    can,
    canList: () => can(FC_API.LIST),
    canSearch: () => can(FC_API.SEARCH),
    canCreate: () => can(FC_API.CREATE),
    canUpdate: () => can(FC_API.UPDATE),
    canDelete: () => can(FC_API.DELETE),
    canReset: () => can(FC_API.RESET),
    /** 与 Go 一致：SLO 不按 path 隐藏 */
    canSlo: () => true
  }
}
