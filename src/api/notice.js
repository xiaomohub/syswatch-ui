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

/** @param {{ eventId?: string, severity?: string, status?: string, uuid?: string, query?: string, index?: number, size?: number }} params */
export async function noticeRecordList(params) {
  const res = await http.get(`${prefix}/noticeRecordList`, { params })
  return unwrapW8t(res)
}

export async function noticeRecordMetric() {
  const res = await http.get(`${prefix}/noticeRecordMetric`)
  return unwrapW8t(res)
}

/** @param {{ noticeType: string, hook: string, sign: string, email: { subject: string, to: string[], cc: string[] } }} body */
export async function noticeTest(body) {
  const res = await http.post(`${prefix}/noticeTest`, body, json)
  return unwrapW8t(res)
}
