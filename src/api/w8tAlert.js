import http from '@/utils/http'
import { W8T_BASE, unwrapW8t } from '@/api/faultcenter'
import { getDatasourceList } from '@/api/datasource'

const json = { headers: { 'Content-Type': 'application/json' } }

/**
 * WatchAlert Go 常用 camelCase；Java BFF 常绑定 snake_case。
 * 双写避免「fault_center_id / event_ids 必填」类校验失败。
 */
function mergeFaultCenterQuery(params) {
  const p = { ...params }
  const fc = p.faultCenterId ?? p.fault_center_id
  if (fc != null && String(fc).trim() !== '') {
    p.faultCenterId = p.faultCenterId ?? fc
    p.fault_center_id = p.fault_center_id ?? fc
  }
  return p
}

/**
 * Java `hisEvent`：时间过滤为 `startTime`/`endTime`（及 `start_time`/`end_time`），Unix 秒。
 * 同时保留 `startAt`/`endAt` 以兼容旧 Go 网关。
 */
function mergeHisEventQuery(params) {
  const p = mergeFaultCenterQuery({ ...params })
  const start = p.startAt ?? p.startTime ?? p.start_time
  if (start != null && start !== '') {
    const n = Number(start)
    if (Number.isFinite(n)) {
      p.startTime = p.startTime ?? n
      p.start_time = p.start_time ?? n
      p.startAt = p.startAt ?? n
    }
  }
  const end = p.endAt ?? p.endTime ?? p.end_time
  if (end != null && end !== '') {
    const n = Number(end)
    if (Number.isFinite(n)) {
      p.endTime = p.endTime ?? n
      p.end_time = p.end_time ?? n
      p.endAt = p.endAt ?? n
    }
  }
  return p
}

/** @param {{ faultCenterId?: string, fault_center_id?: string, fingerprints?: string[], event_ids?: string[] }} body */
function payloadEventFingerprints(body) {
  const fc = body.faultCenterId ?? body.fault_center_id
  const raw = body.fingerprints ?? body.event_ids
  const ids = Array.isArray(raw) ? raw : raw != null && raw !== '' ? [String(raw)] : []
  return {
    fault_center_id: fc,
    event_ids: ids,
    faultCenterId: fc,
    fingerprints: ids
  }
}

/**
 * 认领等写操作：Java SysWatch 需 `action: "claim"` 才会按 JWT 补全认领人；并双写 event_id。
 * @param {Record<string, unknown>} body
 */
function payloadEventProcess(body) {
  const base = payloadEventFingerprints(body)
  const ids = base.event_ids
  const first = ids.length ? ids[0] : ''
  const eid = String(body.event_id ?? body.eventId ?? first ?? '').trim()
  /** @type {Record<string, unknown>} */
  const out = {
    ...base,
    /** 不传则默认 claim；Java SysWatch 依赖此字段才会按 JWT 补全认领人 */
    action: body.action !== undefined ? body.action : 'claim'
  }
  if (eid) {
    out.event_id = eid
    out.eventId = body.eventId ?? body.event_id ?? eid
  }
  if (body.patch != null && typeof body.patch === 'object') {
    out.patch = body.patch
  }
  return out
}

/**
 * 按类型筛选的数据源列表（告警规则等使用）
 * @param {{ datasourceType?: string, query?: string } & Record<string, unknown>} [params]
 */
export async function datasourceList(params) {
  const { datasourceType, ...rest } = params || {}
  const raw = await getDatasourceList(rest)
  const list = Array.isArray(raw) ? raw : []
  if (datasourceType) {
    return list.filter((x) => x && x.type === datasourceType)
  }
  return list
}

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
  const res = await http.get(`${W8T_BASE}/event/curEvent`, { params: mergeFaultCenterQuery(params) })
  return unwrapW8t(res)
}

/** @param {Record<string, unknown>} params */
export async function hisEventList(params) {
  const res = await http.get(`${W8T_BASE}/event/hisEvent`, { params: mergeHisEventQuery(params) })
  return unwrapW8t(res)
}

/** @param {Record<string, unknown>} body 认领可只传 faultCenterId + fingerprints；默认带 action: claim */
export async function eventProcess(body) {
  const res = await http.post(`${W8T_BASE}/event/process`, payloadEventProcess(body), json)
  return unwrapW8t(res)
}

/** @param {{ faultCenterId?: string, fault_center_id?: string, fingerprints?: string[], event_ids?: string[] }} body */
export async function eventDelete(body) {
  const res = await http.post(`${W8T_BASE}/event/delete`, payloadEventFingerprints(body), json)
  return unwrapW8t(res)
}

/** @param {Record<string, unknown>} params */
export async function eventListComments(params) {
  const p = mergeFaultCenterQuery(params)
  const fp = p.fingerprint ?? p.event_id
  if (fp != null && String(fp).trim() !== '') {
    p.fingerprint = p.fingerprint ?? fp
    p.event_id = p.event_id ?? fp
  }
  const res = await http.get(`${W8T_BASE}/event/listComments`, { params: p })
  return unwrapW8t(res)
}

/** @param {{ faultCenterId?: string, fault_center_id?: string, fingerprint?: string, event_id?: string, content: string }} body */
export async function eventAddComment(body) {
  const fc = body.faultCenterId ?? body.fault_center_id
  const fp = body.fingerprint ?? body.event_id
  const ids = fp != null && String(fp).trim() !== '' ? [String(fp)] : []
  const payload = {
    fault_center_id: fc,
    faultCenterId: fc,
    fingerprint: fp,
    event_id: fp,
    event_ids: ids,
    content: body.content
  }
  const res = await http.post(`${W8T_BASE}/event/addComment`, payload, json)
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
function mergeSilenceBody(body) {
  const b = { ...body }
  const fc = b.faultCenterId ?? b.fault_center_id
  if (fc != null && String(fc).trim() !== '') {
    b.faultCenterId = b.faultCenterId ?? fc
    b.fault_center_id = b.fault_center_id ?? fc
  }
  return b
}

/** @param {Record<string, unknown>} body */
export async function silenceCreate(body) {
  const res = await http.post(`${W8T_BASE}/silence/silenceCreate`, mergeSilenceBody(body), json)
  return unwrapW8t(res)
}

/** @param {Record<string, unknown>} body */
export async function silenceUpdate(body) {
  const res = await http.post(`${W8T_BASE}/silence/silenceUpdate`, mergeSilenceBody(body), json)
  return unwrapW8t(res)
}

/** @param {Record<string, unknown>} body */
export async function silenceDelete(body) {
  const res = await http.post(`${W8T_BASE}/silence/silenceDelete`, mergeSilenceBody(body), json)
  return unwrapW8t(res)
}
