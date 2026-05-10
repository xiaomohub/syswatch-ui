import http from '@/utils/http'
import { W8T_BASE, unwrapW8t } from '@/api/faultcenter'

/**
 * @typedef {Object} DutyManagerRow
 * @property {string} id
 * @property {string} name
 * @property {string} [description]
 * @property {{ username?: string, userid?: string } | null} [manager]
 * @property {Array<{ username?: string, userid?: string }>} [curDutyUser]
 * @property {number|string} [updateAt] Unix 秒
 * @property {string} [updateBy]
 * @property {string} [tenantId]
 */

/** @returns {Promise<DutyManagerRow[]>} */
export async function getDutyManagerList() {
  const res = await http.get(`${W8T_BASE}/dutyManage/dutyManageList`)
  const data = unwrapW8t(res)
  const raw = Array.isArray(data) ? data : data?.list
  if (!Array.isArray(raw)) return []
  return raw.map((d) => ({
    id: String(d.id ?? d.dutyId ?? ''),
    name: d.name ?? d.dutyName ?? String(d.id ?? d.dutyId ?? ''),
    description: d.description ?? '',
    manager:
      d.manager && typeof d.manager === 'object'
        ? {
            username: d.manager.username ?? d.manager.userName ?? '',
            userid: String(d.manager.userid ?? d.manager.userId ?? '')
          }
        : null,
    curDutyUser: Array.isArray(d.curDutyUser) ? d.curDutyUser : [],
    updateAt: d.updateAt,
    updateBy: d.updateBy ?? '',
    tenantId: d.tenantId != null ? String(d.tenantId) : ''
  }))
}

/** @param {Record<string, unknown>} body */
export async function createDutyManager(body) {
  const res = await http.post(`${W8T_BASE}/dutyManage/dutyManageCreate`, body, {
    headers: { 'Content-Type': 'application/json' }
  })
  return unwrapW8t(res)
}

/** @param {Record<string, unknown>} body */
export async function updateDutyManager(body) {
  const res = await http.post(`${W8T_BASE}/dutyManage/dutyManageUpdate`, body, {
    headers: { 'Content-Type': 'application/json' }
  })
  return unwrapW8t(res)
}

/** @param {{ id: string, name?: string }} body */
export async function deleteDutyManager(body) {
  const res = await http.post(`${W8T_BASE}/dutyManage/dutyManageDelete`, body, {
    headers: { 'Content-Type': 'application/json' }
  })
  return unwrapW8t(res)
}

/** @param {{ dutyId: string, time?: string }} params */
export async function searchCalendar(params) {
  const res = await http.get(`${W8T_BASE}/calendar/calendarSearch`, { params })
  const data = unwrapW8t(res)
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.list)) return data.list
  return []
}

/** @param {Record<string, unknown>} body */
export async function createCalendar(body) {
  const res = await http.post(`${W8T_BASE}/calendar/calendarCreate`, body, {
    headers: { 'Content-Type': 'application/json' }
  })
  return unwrapW8t(res)
}

/** @param {Record<string, unknown>} body */
export async function updateCalendar(body) {
  const res = await http.post(`${W8T_BASE}/calendar/calendarUpdate`, body, {
    headers: { 'Content-Type': 'application/json' }
  })
  return unwrapW8t(res)
}

/** @param {{ dutyId: string }} params */
export async function getCalendarUsers(params) {
  const res = await http.get(`${W8T_BASE}/calendar/getCalendarUsers`, { params })
  return unwrapW8t(res)
}
