import http from '@/utils/http'
import { W8T_BASE, unwrapW8t } from '@/api/faultcenter'

const json = { headers: { 'Content-Type': 'application/json' } }

/** @param {Record<string, unknown>} params */
export async function ruleGroupList(params) {
  const res = await http.get(`${W8T_BASE}/ruleGroup/ruleGroupList`, { params })
  return unwrapW8t(res)
}

/** @param {{ name: string }} body */
export async function ruleGroupCreate(body) {
  const res = await http.post(`${W8T_BASE}/ruleGroup/ruleGroupCreate`, body, json)
  return unwrapW8t(res)
}

/** @param {{ id: string, name: string }} body */
export async function ruleGroupUpdate(body) {
  const res = await http.post(`${W8T_BASE}/ruleGroup/ruleGroupUpdate`, body, json)
  return unwrapW8t(res)
}

/** @param {{ id: string }} body */
export async function ruleGroupDelete(body) {
  const res = await http.post(`${W8T_BASE}/ruleGroup/ruleGroupDelete`, body, json)
  return unwrapW8t(res)
}

/** @param {Record<string, unknown>} params */
export async function ruleList(params) {
  const res = await http.get(`${W8T_BASE}/rule/ruleList`, { params })
  return unwrapW8t(res)
}

/** @param {Record<string, unknown>} params */
export async function ruleSearch(params) {
  const res = await http.get(`${W8T_BASE}/rule/ruleSearch`, { params })
  return unwrapW8t(res)
}

/** @param {Record<string, unknown>} body */
export async function ruleCreate(body) {
  const res = await http.post(`${W8T_BASE}/rule/ruleCreate`, body, json)
  return unwrapW8t(res)
}

/** @param {Record<string, unknown>} body */
export async function ruleUpdate(body) {
  const res = await http.post(`${W8T_BASE}/rule/ruleUpdate`, body, json)
  return unwrapW8t(res)
}

/** @param {{ ruleId: string }} body */
export async function ruleDelete(body) {
  const res = await http.post(`${W8T_BASE}/rule/ruleDelete`, body, json)
  return unwrapW8t(res)
}

/** @param {Record<string, unknown>} body */
export async function ruleImport(body) {
  const res = await http.post(`${W8T_BASE}/rule/import`, body, json)
  return unwrapW8t(res)
}

/** @param {Record<string, unknown>} body */
export async function ruleChangeStatus(body) {
  const res = await http.post(`${W8T_BASE}/rule/ruleChangeStatus`, body, json)
  return unwrapW8t(res)
}

/**
 * 批量变更（字段名下划线）
 * @param {{ rule_ids: string[], change: Record<string, unknown> }} body
 */
export async function ruleBatchChange(body) {
  const res = await http.post(`${W8T_BASE}/rule/change`, body, json)
  return unwrapW8t(res)
}

/** @param {Record<string, unknown>} params */
export async function curEventList(params) {
  const res = await http.get(`${W8T_BASE}/event/curEvent`, { params })
  return unwrapW8t(res)
}

/** @param {Record<string, unknown>} params */
export async function hisEventList(params) {
  const res = await http.get(`${W8T_BASE}/event/hisEvent`, { params })
  return unwrapW8t(res)
}

/** @param {{ faultCenterId: string, fingerprints: string[] }} body */
export async function eventProcess(body) {
  const res = await http.post(`${W8T_BASE}/event/process`, body, json)
  return unwrapW8t(res)
}

/** @param {{ faultCenterId: string, fingerprints: string[] }} body */
export async function eventDelete(body) {
  const res = await http.post(`${W8T_BASE}/event/delete`, body, json)
  return unwrapW8t(res)
}

/** @param {Record<string, unknown>} params */
export async function eventListComments(params) {
  const res = await http.get(`${W8T_BASE}/event/listComments`, { params })
  return unwrapW8t(res)
}

/** @param {{ faultCenterId: string, fingerprint: string, content: string }} body */
export async function eventAddComment(body) {
  const res = await http.post(`${W8T_BASE}/event/addComment`, body, json)
  return unwrapW8t(res)
}

/** @param {{ commentId: string }} body */
export async function eventDeleteComment(body) {
  const res = await http.post(`${W8T_BASE}/event/deleteComment`, body, json)
  return unwrapW8t(res)
}

/** @param {Record<string, unknown>} params */
export async function silenceList(params) {
  const res = await http.get(`${W8T_BASE}/silence/silenceList`, { params })
  return unwrapW8t(res)
}

/** @param {Record<string, unknown>} body */
export async function silenceCreate(body) {
  const res = await http.post(`${W8T_BASE}/silence/silenceCreate`, body, json)
  return unwrapW8t(res)
}

/** @param {Record<string, unknown>} body */
export async function silenceUpdate(body) {
  const res = await http.post(`${W8T_BASE}/silence/silenceUpdate`, body, json)
  return unwrapW8t(res)
}

/** @param {Record<string, unknown>} body */
export async function silenceDelete(body) {
  const res = await http.post(`${W8T_BASE}/silence/silenceDelete`, body, json)
  return unwrapW8t(res)
}
