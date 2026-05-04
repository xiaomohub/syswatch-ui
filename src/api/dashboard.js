import http from '@/utils/http'
import { buildDashboardOverviewPayload } from '@/constants/dashboardPromql'

/**
 * 监控大盘聚合数据（浏览器不直连 VM）。
 *
 * 开发/生产：请求经同源 `/api` 进入网关或主后端；本地 `npm run dev` 时 Vite 将 `/api` 代理到
 * `vite.config.ts` 中的 target（默认 `http://localhost:8080`），由后端实现
 * `GET/POST /api/dashboard/overview` 并代查 Prometheus/VM。
 * 无后端时可本地跑 `npm run dashboard-api`（默认 8090）并把代理 target 指到该端口作 mock。
 *
 * 默认 POST 携带 {@link buildDashboardOverviewPayload}；若接口为 GET-only（404/405）则回退 GET。
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

/** axios 响应体解包：兼容 { data: T } 与直接 T */
export function unwrapBody(res) {
  const d = res?.data
  if (d && typeof d === 'object' && 'data' in d && d.data !== undefined && d.data !== null) {
    return d.data
  }
  return d
}
