import { useUserStore } from '@/store/user'
import { RBAC_RELAX_ALL, ACCESS_LEVEL } from '@/constants/rbac'
import { FC_API, fcApiPathKey } from '@/constants/faultCenterApiPaths'

/**
 * 故障中心按钮权限：运维档（admin/root）全放行；仅 user 档只读（列表/检索可看，写操作隐藏）。
 * rbacLegacyMode / RBAC_RELAX_ALL 时仍按 JWT path 码或全放行（兼容旧后端）。
 */
export function useFaultCenterPerm() {
  const userStore = useUserStore()

  /** @param {{ method: string, path: string }} op */
  function can(op) {
    if (RBAC_RELAX_ALL) return true
    if (userStore.rbacLegacyMode) return true
    if (userStore.accessLevel >= ACCESS_LEVEL.ADMIN) return true
    const readOps = [fcApiPathKey(FC_API.LIST), fcApiPathKey(FC_API.SEARCH)]
    return readOps.includes(fcApiPathKey(op))
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
