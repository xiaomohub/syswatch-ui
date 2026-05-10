import http from '@/utils/http'
import { buildDashboardOverviewPayload } from '@/constants/dashboardPromql'

/**
 * 监控大盘聚合数据：仅请求同源 `/api/dashboard/overview`，由后端代发 Prometheus / VM 兼容查询；
 * 浏览器不配置、不直连 vmselect / Prometheus。
 *
 * 默认 POST 携带 {@link buildDashboardOverviewPayload}（可与环境 instance 不一致时按需覆盖 promql）；
 * 若接口为 GET-only（404/405）则回退 GET。
 *
 * @param {object} [body] 覆盖默认 promql/step；传 `null` 可强制仅 GET。
 */
export async function fetchDashboardOverview(body) {
  const payload =
    body === null ? null : body !== undefined && typeof body === 'object' ? body : buildDashboardOverviewPayload()

  if (payload != null && typeof payload === 'object' && Object.keys(payload).length > 0) {
    try {
      return await http.post('/api/dashboard/overview', payload)
    } catch (e) {
      const s = e?.response?.status
      if (s === 405 || s === 404) {
        return http.get('/api/dashboard/overview')
      }
      throw e
    }
  }
  return http.get('/api/dashboard/overview')
}

/** axios 响应体解包：兼容网关一层 `{ data: T }` */
export function unwrapBody(res) {
  const d = res?.data
  if (d && typeof d === 'object' && 'data' in d && d.data !== undefined && d.data !== null) {
    return d.data
  }
  return d
}

/**
 * 解析 `/api/dashboard/overview` 业务载荷。
 * - `envelope=true`（默认）：`{ code, message, data }`，`code !== 0` 时抛错。
 * - `envelope=false`：响应体即为扁平载荷。
 * - 若网关再包一层 `{ data: … }`，先剥一层再按上两者处理。
 * @returns {Record<string, unknown> | null}
 */
export function unwrapOverviewPayload(res) {
  let d = res?.data
  if (d == null || typeof d !== 'object') return null
  if ('data' in d && d.data != null && typeof d.data === 'object') {
    d = d.data
  }
  if ('code' in d) {
    if (d.code !== 0) {
      const msg = typeof d.message === 'string' && d.message ? d.message : `业务错误 (${d.code})`
      throw new Error(msg)
    }
    return d.data ?? null
  }
  return d
}
