/**
 * 智能诊断后端 API（告警根因、日志巡检、历史）
 */
import http from '@/utils/http'

/** @param {Record<string, unknown>} payload */
export function analyzeRca(payload) {
  return http.post('/api/aiops/rca/analyze', payload)
}

/**
 * 分页与后端一致：query `pageNum`、`pageSize`（从 1 起）
 * @param {{ pageNum?: number, pageSize?: number }} [params]
 */
export function fetchRcaHistory(params) {
  return http.get('/api/aiops/rca/history', { params })
}

/** @param {string|number} id */
export function fetchRcaHistoryDetail(id) {
  return http.get(`/api/aiops/rca/history/${id}`)
}

export function fetchInspectionSchedules() {
  return http.get('/api/aiops/inspections/schedules')
}

/**
 * 手动/立即触发一次日志（或其它源）检测；后端应拉取日志 API 再归因
 * @param {{ scheduleId?: number|string, timeFrom?: string, timeTo?: string, queryHint?: string, sourceType?: string }} payload
 */
export function triggerInspectionRun(payload) {
  return http.post('/api/aiops/inspections/run', {
    sourceType: 'log',
    ...payload
  })
}

/** @param {{ pageNum?: number, pageSize?: number, scheduleId?: string|number }} [params] */
export function fetchInspectionRuns(params) {
  return http.get('/api/aiops/inspections/runs', { params })
}

/** @param {string|number} id run id（业务 runId 或主键，与后端约定） */
export function fetchInspectionRunDetail(id) {
  return http.get(`/api/aiops/inspections/runs/${id}`)
}

export function unwrapItems(data) {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.items)) return data.items
  if (Array.isArray(data.records)) return data.records
  if (Array.isArray(data.list)) return data.list
  return []
}

export function unwrapTotal(data) {
  if (data == null) return 0
  if (typeof data.total === 'number') return data.total
  if (typeof data.totalElements === 'number') return data.totalElements
  return unwrapItems(data).length
}

/** @param {unknown} data */
export function normalizeRcaResult(data) {
  if (!data || typeof data !== 'object') return null
  const d = data
  const rawCauses = Array.isArray(d.rootCauses)
    ? d.rootCauses
    : Array.isArray(d.causes)
      ? d.causes
      : []
  const rootCauses = rawCauses.map((c) =>
    typeof c === 'string' ? { title: c } : c
  )
  return {
    requestId: d.requestId ?? d.id,
    summary: d.summary ?? d.conclusion,
    rootCauses,
    recommendations: Array.isArray(d.recommendations)
      ? d.recommendations
      : Array.isArray(d.actions)
        ? d.actions
        : typeof d.recommendations === 'string'
          ? [d.recommendations]
          : [],
    analysis: typeof d.analysis === 'string' ? d.analysis : d.content,
    disclaimer: d.disclaimer ?? d.notice
  }
}
