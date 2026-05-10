import http from '@/utils/http'
import { W8T_BASE, unwrapW8t } from '@/api/faultcenter'

const json = { headers: { 'Content-Type': 'application/json' } }
const prefix = `${W8T_BASE}/notice`

/** @param {{ noticeTmplId?: string, query?: string }} [params] */
export async function noticeList(params) {
  const res = await http.get(`${prefix}/noticeList`, { params })
  return unwrapW8t(res)
}

/** @param {{ name: string, dutyId?: string|null, routes: unknown[] }} body */
export async function noticeCreate(body) {
  const res = await http.post(`${prefix}/noticeCreate`, body, json)
  return unwrapW8t(res)
}

/** @param {{ uuid: string, name: string, dutyId?: string|null, routes: unknown[] }} body */
export async function noticeUpdate(body) {
  const res = await http.post(`${prefix}/noticeUpdate`, body, json)
  return unwrapW8t(res)
}

/** @param {{ uuid: string, name: string }} body */
export async function noticeDelete(body) {
  const res = await http.post(`${prefix}/noticeDelete`, body, json)
  return unwrapW8t(res)
}

/** @param {{ eventId?: string, severity?: string, status?: string, uuid?: string, query?: string, index?: number, size?: number }} params 列表项可含可选字段 alarmDetail，见 docs/notice-record-alarm-detail.md */
export async function noticeRecordList(params) {
  const res = await http.get(`${prefix}/noticeRecordList`, { params })
  return unwrapW8t(res)
}

export async function noticeRecordMetric() {
  const res = await http.get(`${prefix}/noticeRecordMetric`)
  return unwrapW8t(res)
}

/**
 * 按事件指纹拉取完整告警事件（列表仅摘要时）。
 * Query 同时带 camelCase / snake_case，兼容网关与 Java 风格。
 * @param {{ eventId?: string, event_id?: string, faultCenterId?: string, fault_center_id?: string }} params
 */
export async function noticeRecordAlarmDetail(params) {
  const eid = String(params?.eventId ?? params?.event_id ?? '').trim()
  const fc = String(params?.faultCenterId ?? params?.fault_center_id ?? '').trim()
  const q = {}
  if (eid) {
    q.eventId = eid
    q.event_id = eid
  }
  if (fc) {
    q.faultCenterId = fc
    q.fault_center_id = fc
  }
  const res = await http.get(`${prefix}/noticeRecordAlarmDetail`, { params: q })
  return unwrapW8t(res)
}

/** @param {{ noticeType: string, hook: string, sign: string, email: { subject: string, to: string[], cc: string[] } }} body */
export async function noticeTest(body) {
  const res = await http.post(`${prefix}/noticeTest`, body, json)
  return unwrapW8t(res)
}
