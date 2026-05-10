import { useUserStore } from '@/store/user'
import { RBAC_RELAX_ALL, ACCESS_LEVEL } from '@/constants/rbac'
import { NOTICE_TMPL_API, noticeApiPathKey } from '@/constants/noticeApiPaths'

/** 通知模版：运维档全放行；user 档仅列表只读。 */
export function useNoticeTmplPerm() {
  const userStore = useUserStore()

  /** @param {{ method: string, path: string }} op */
  function can(op) {
    if (RBAC_RELAX_ALL) return true
    if (userStore.rbacLegacyMode) return true
    if (userStore.accessLevel >= ACCESS_LEVEL.ADMIN) return true
    return noticeApiPathKey(op) === noticeApiPathKey(NOTICE_TMPL_API.LIST)
  }

  return {
    can,
    canCreate: () => can(NOTICE_TMPL_API.CREATE),
    canUpdate: () => can(NOTICE_TMPL_API.UPDATE),
    canDelete: () => can(NOTICE_TMPL_API.DELETE),
    canList: () => can(NOTICE_TMPL_API.LIST)
  }
}
