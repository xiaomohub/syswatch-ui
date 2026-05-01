import http from '@/utils/http'

/**
 * 故障中心：按 WatchAlert 风格的“事件/工单”模型设计。
 * 说明：当前仅新增前端与接口约定，不对现有功能做改造。
 */

/** axios 响应体解包：兼容 { data: T } 与直接 T */
export function unwrapBody(res) {
  const d = res?.data
  if (d && typeof d === 'object' && 'data' in d && d.data !== undefined && d.data !== null) {
    return d.data
  }
  return d
}

export function fetchIncidentStats(params) {
  return http.get('/api/faultcenter/stats', { params })
}

export function fetchIncidents(params) {
  return http.get('/api/faultcenter/incidents', { params })
}

export function fetchIncidentDetail(id) {
  return http.get(`/api/faultcenter/incidents/${encodeURIComponent(id)}`)
}

export function ackIncident(id, payload) {
  return http.post(`/api/faultcenter/incidents/${encodeURIComponent(id)}/ack`, payload || {})
}

export function resolveIncident(id, payload) {
  return http.post(`/api/faultcenter/incidents/${encodeURIComponent(id)}/resolve`, payload || {})
}

export function assignIncident(id, payload) {
  return http.post(`/api/faultcenter/incidents/${encodeURIComponent(id)}/assign`, payload || {})
}

export function aiIncidentSummary(id, payload) {
  return http.post(
    `/api/faultcenter/incidents/${encodeURIComponent(id)}/ai/summary`,
    payload || {}
  )
}

