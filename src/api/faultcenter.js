import http from '@/utils/http'

/** WatchAlert 风格业务前缀 */
export const W8T_BASE = '/api/w8t'
export const SYSTEM_BASE = '/api/system'

/**
 * 解包统一响应：{ code: 200, data, msg }（兼容 code 0）
 * @param {import('axios').AxiosResponse} res
 */
export function unwrapW8t(res) {
  const outer = res?.data
  if (outer == null) return outer
  const code = outer.code
  if (code !== 200 && code !== 0) {
    const msg =
      outer.msg ||
      outer.message ||
      (typeof outer.data === 'string' ? outer.data : '') ||
      '请求失败'
    const err = new Error(msg)
    err.code = code
    err.raw = outer
    throw err
  }
  return outer.data
}

/** @param {Record<string, string|undefined>} params */
export function faultCenterList(params) {
  return http.get(`${W8T_BASE}/faultCenter/faultCenterList`, { params })
}

/** @param {{ id?: string, name?: string }} params */
export function faultCenterSearch(params) {
  return http.get(`${W8T_BASE}/faultCenter/faultCenterSearch`, { params })
}

export function faultCenterCreate(body) {
  return http.post(`${W8T_BASE}/faultCenter/faultCenterCreate`, body, {
    headers: { 'Content-Type': 'application/json' }
  })
}

export function faultCenterUpdate(body) {
  return http.post(`${W8T_BASE}/faultCenter/faultCenterUpdate`, body, {
    headers: { 'Content-Type': 'application/json' }
  })
}

/** @param {{ id: string, name?: string }} body */
export function faultCenterDelete(body) {
  const payload = typeof body === 'string' ? { id: body } : { ...body }
  return http.post(`${W8T_BASE}/faultCenter/faultCenterDelete`, payload, {
    headers: { 'Content-Type': 'application/json' }
  })
}

export function faultCenterReset(body) {
  return http.post(`${W8T_BASE}/faultCenter/faultCenterReset`, body, {
    headers: { 'Content-Type': 'application/json' }
  })
}

/** @param {{ id: string, tenantId?: string }} params */
export function faultCenterSlo(params) {
  return http.get(`${W8T_BASE}/faultCenter/slo`, { params })
}

/** @param {{ faultCenterId: string }} params */
export function getDashboardInfo(params) {
  return http.get(`${SYSTEM_BASE}/getDashboardInfo`, { params })
}
