import { useUserStore } from '@/store/user'
import { RBAC_RELAX_ALL, ACCESS_LEVEL } from '@/constants/rbac'
import { NOTICE_API, noticeApiPathKey } from '@/constants/noticeApiPaths'

/**
 * 通知对象：运维档全放行；user 档仅列表/记录只读。
 * legacy 模式仍按 JWT path 码。
 */
export function useNoticePerm() {
  const userStore = useUserStore()

  /** @param {{ method: string, path: string }} op */
  function can(op) {
    if (RBAC_RELAX_ALL) return true
    if (userStore.rbacLegacyMode) return true
    if (userStore.accessLevel >= ACCESS_LEVEL.ADMIN) return true
    const readOps = [
      noticeApiPathKey(NOTICE_API.LIST),
      noticeApiPathKey(NOTICE_API.RECORD_LIST),
      noticeApiPathKey(NOTICE_API.RECORD_ALARM_DETAIL)
    ]
    return readOps.includes(noticeApiPathKey(op))
  }

  return {
    can,
    canCreate: () => can(NOTICE_API.CREATE),
    canUpdate: () => can(NOTICE_API.UPDATE),
    canDelete: () => can(NOTICE_API.DELETE),
    canList: () => can(NOTICE_API.LIST),
    canRecordList: () => can(NOTICE_API.RECORD_LIST),
    canRecordAlarmDetail: () => can(NOTICE_API.RECORD_ALARM_DETAIL),
    /** 无 Permission 中间件 */
    canRecordMetric: () => true,
    canTest: () => true
  }
}
