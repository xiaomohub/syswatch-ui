import { useUserStore } from '@/store/user'
import { NOTICE_API, noticeApiPathKey } from '@/constants/noticeApiPaths'

/**
 * 通知对象按钮权限：匹配 JWT 中「METHOD + 空格 + 完整 path」。
 * 测试、统计与 Go 一致无 Permission，登录即可。
 */
export function useNoticePerm() {
  const userStore = useUserStore()

  /** @param {{ method: string, path: string }} op */
  function can(op) {
    if (userStore.rbacLegacyMode) return true
    return userStore.permissions.includes(noticeApiPathKey(op))
  }

  return {
    can,
    canCreate: () => can(NOTICE_API.CREATE),
    canUpdate: () => can(NOTICE_API.UPDATE),
    canDelete: () => can(NOTICE_API.DELETE),
    canList: () => can(NOTICE_API.LIST),
    canRecordList: () => can(NOTICE_API.RECORD_LIST),
    /** 无 Permission 中间件 */
    canRecordMetric: () => true,
    canTest: () => true
  }
}
