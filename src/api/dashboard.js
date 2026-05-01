import http from '@/utils/http'

/**
 * 监控大盘聚合数据（后端查 VictoriaMetrics / 缓存后返回，浏览器不直连 VM）
 * GET /api/dashboard/overview
 */
export function fetchDashboardOverview() {
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
