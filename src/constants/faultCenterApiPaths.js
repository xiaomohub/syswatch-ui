/**
 * WatchAlert 故障中心接口完整 Path（与 Go Permission 中间件一致，用于按钮 v-if）
 * @see docs/fault-center-backend.md
 */
export const FC_API = {
  LIST: { method: 'GET', path: '/api/w8t/faultCenter/faultCenterList' },
  SEARCH: { method: 'GET', path: '/api/w8t/faultCenter/faultCenterSearch' },
  CREATE: { method: 'POST', path: '/api/w8t/faultCenter/faultCenterCreate' },
  UPDATE: { method: 'POST', path: '/api/w8t/faultCenter/faultCenterUpdate' },
  DELETE: { method: 'POST', path: '/api/w8t/faultCenter/faultCenterDelete' },
  RESET: { method: 'POST', path: '/api/w8t/faultCenter/faultCenterReset' },
  SLO: { method: 'GET', path: '/api/w8t/faultCenter/slo' }
}

/** @param {{ method: string, path: string }} op */
export function fcApiPathKey(op) {
  return `${op.method} ${op.path}`
}
