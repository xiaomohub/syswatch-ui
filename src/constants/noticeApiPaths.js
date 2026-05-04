/**
 * WatchAlert 通知对象接口 Path（与 Go Permission 中间件一致）
 * 测试发送、记录统计无 Permission，仅登录 + TenantID。
 */
export const NOTICE_API = {
  CREATE: { method: 'POST', path: '/api/w8t/notice/noticeCreate' },
  UPDATE: { method: 'POST', path: '/api/w8t/notice/noticeUpdate' },
  DELETE: { method: 'POST', path: '/api/w8t/notice/noticeDelete' },
  LIST: { method: 'GET', path: '/api/w8t/notice/noticeList' },
  RECORD_LIST: { method: 'GET', path: '/api/w8t/notice/noticeRecordList' },
  RECORD_METRIC: { method: 'GET', path: '/api/w8t/notice/noticeRecordMetric' },
  TEST: { method: 'POST', path: '/api/w8t/notice/noticeTest' }
}

/** @param {{ method: string, path: string }} op */
export function noticeApiPathKey(op) {
  return `${op.method} ${op.path}`
}
