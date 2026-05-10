import http from '@/utils/http'
import { W8T_BASE, unwrapW8t } from '@/api/faultcenter'

const json = { headers: { 'Content-Type': 'application/json' } }

/** @param {Record<string, unknown>} [params] */
export async function getDatasourceList(params) {
  const res = await http.get(`${W8T_BASE}/datasource/dataSourceList`, { params })
  const data = unwrapW8t(res)
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.list)) return data.list
  if (data && Array.isArray(data.items)) return data.items
  return []
}

/** @param {Record<string, string|undefined>} params query: key=value */
export async function getDatasource(params) {
  const res = await http.get(`${W8T_BASE}/datasource/dataSourceGet`, { params })
  return unwrapW8t(res)
}

/** @param {Record<string, unknown>} body */
export async function createDatasource(body) {
  const res = await http.post(`${W8T_BASE}/datasource/dataSourceCreate`, body, json)
  return unwrapW8t(res)
}

/** @param {Record<string, unknown>} body */
export async function updateDatasource(body) {
  const res = await http.post(`${W8T_BASE}/datasource/dataSourceUpdate`, body, json)
  return unwrapW8t(res)
}

/** @param {{ id: string, name: string }} body */
export async function deleteDatasource(body) {
  const res = await http.post(`${W8T_BASE}/datasource/dataSourceDelete`, body, json)
  return unwrapW8t(res)
}

/** @param {Record<string, unknown>} body */
export async function datasourcePing(body) {
  const res = await http.post(`${W8T_BASE}/datasource/dataSourcePing`, body, json)
  return unwrapW8t(res)
}

/** @param {Record<string, unknown>} body */
export async function elasticSearchData(body) {
  const res = await http.post(`${W8T_BASE}/datasource/esSearch`, body, json)
  return unwrapW8t(res)
}

/** @param {Record<string, unknown>} body */
export async function searchViewLogsContent(body) {
  const res = await http.post(`${W8T_BASE}/datasource/searchViewLogsContent`, body, json)
  return unwrapW8t(res)
}

/** @param {Record<string, unknown>} params */
export async function queryMetrics(params) {
  const res = await http.get(`${W8T_BASE}/datasource/queryMetrics`, { params })
  return unwrapW8t(res)
}

/**
 * Prometheus / VictoriaMetrics 即时查询（后端代理）
 * @param {{ datasourceIds: string, query: string }} params
 */
export async function promQuery(params) {
  const res = await http.get(`${W8T_BASE}/datasource/promQuery`, { params })
  return unwrapW8t(res)
}

/**
 * Prometheus / VictoriaMetrics 范围查询（后端代理）
 * @param {{ datasourceIds: string, query: string, startTime: number, endTime: number, step: number|string }} params
 */
export async function promQueryRange(params) {
  const res = await http.get(`${W8T_BASE}/datasource/promQueryRange`, { params })
  return unwrapW8t(res)
}
