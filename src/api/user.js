import http from '@/utils/http'
import { W8T_BASE, unwrapW8t } from '@/api/faultcenter'

/** @param {{ joinDuty?: string }} [params] */
export async function getUserList(params) {
  const res = await http.get(`${W8T_BASE}/user/userList`, { params })
  const data = unwrapW8t(res)
  const raw = Array.isArray(data) ? data : data?.list
  if (!Array.isArray(raw)) return []
  return raw.map((u) => ({
    userid: String(u.userid ?? u.userId ?? u.id ?? ''),
    username: u.username ?? u.userName ?? u.name ?? '',
    userName: u.userName ?? u.name ?? '',
    userEmail: u.userEmail ?? u.email ?? ''
  }))
}
