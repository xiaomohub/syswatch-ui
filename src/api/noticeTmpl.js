import http from '@/utils/http'
import { W8T_BASE, unwrapW8t } from '@/api/faultcenter'

/** @param {{ noticeType?: string, query?: string }} [params] */
export async function getNoticeTmplList(params) {
  const res = await http.get(`${W8T_BASE}/noticeTemplate/noticeTemplateList`, { params })
  const data = unwrapW8t(res)
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.list)) return data.list
  return []
}

/** @param {Record<string, unknown>} body */
export async function createNoticeTmpl(body) {
  const res = await http.post(`${W8T_BASE}/noticeTemplate/noticeTemplateCreate`, body)
  return unwrapW8t(res)
}

/** @param {Record<string, unknown>} body */
export async function updateNoticeTmpl(body) {
  const res = await http.post(`${W8T_BASE}/noticeTemplate/noticeTemplateUpdate`, body)
  return unwrapW8t(res)
}

/** @param {{ id: string, name: string }} body */
export async function deleteNoticeTmpl(body) {
  const res = await http.post(`${W8T_BASE}/noticeTemplate/noticeTemplateDelete`, body)
  return unwrapW8t(res)
}
