/**
 * 大盘指标：对 Prometheus / VictoriaMetrics 执行 instant query，供
 * - Vite 开发中间件
 * - scripts/dashboard-overview-api.mjs
 *
 * 环境变量：SYSWATCH_VM_QUERY_URL
 * 例：单节点 VM http://127.0.0.1:8428
 * 例：集群 select 前缀 http://10.0.0.1:8481/select/0/prometheus
 */
import { buildDashboardOverviewPayload } from '../src/constants/dashboardPromql.js'

/**
 * @param {string} vmBase
 * @param {string} promql
 * @returns {Promise<unknown>}
 */
export async function instantQuery(vmBase, promql) {
  const root = `${vmBase.replace(/\/+$/, '')}/`
  const u = new URL('api/v1/query', root)
  u.searchParams.set('query', promql)
  const r = await fetch(u.href, { headers: { Accept: 'application/json' } })
  const text = await r.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`VM 返回非 JSON（HTTP ${r.status}）：${text.slice(0, 240)}`)
  }
  if (!r.ok) {
    throw new Error(json.error || json.message || `HTTP ${r.status}`)
  }
  if (json.status === 'error') {
    throw new Error(json.error || 'query error')
  }
  return json
}

/**
 * @param {unknown} json Prometheus instant vector
 * @param {'avg' | 'sum'} mode
 */
export function aggregateInstantVector(json, mode) {
  const results = json?.data?.result
  if (!Array.isArray(results) || results.length === 0) return null
  const vals = []
  for (const item of results) {
    const v = parseFloat(item?.value?.[1])
    if (!Number.isNaN(v)) vals.push(v)
  }
  if (vals.length === 0) return null
  if (mode === 'sum') return vals.reduce((a, b) => a + b, 0)
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

function clampPct(x) {
  if (x == null || Number.isNaN(x)) return null
  return Math.max(0, Math.min(100, x))
}

/**
 * @param {string} [vmBase] SYSWATCH_VM_QUERY_URL
 * @param {object} [postBody] POST JSON，可含 promql 覆盖
 */
export async function buildOverviewMetrics(vmBase, postBody) {
  const defaults = buildDashboardOverviewPayload()
  const promql = { ...defaults.promql, ...(postBody?.promql && typeof postBody.promql === 'object' ? postBody.promql : {}) }

  const asOf = new Date().toISOString()
  if (!vmBase || typeof vmBase !== 'string') {
    return {
      cpuPercent: null,
      memoryPercent: null,
      networkBps: null,
      diskPercent: null,
      asOf,
      message:
        '未配置 SYSWATCH_VM_QUERY_URL。在 .env.development 或环境变量中设置 Prometheus/VM 的查询根地址（含 /select/.../prometheus 如需）。'
    }
  }

  const [cpuJ, memJ, netJ] = await Promise.all([
    instantQuery(vmBase, promql.cpu),
    instantQuery(vmBase, promql.memory),
    instantQuery(vmBase, promql.network)
  ])

  return {
    cpuPercent: clampPct(aggregateInstantVector(cpuJ, 'avg')),
    memoryPercent: clampPct(aggregateInstantVector(memJ, 'avg')),
    networkBps: aggregateInstantVector(netJ, 'sum'),
    diskPercent: null,
    asOf
  }
}
