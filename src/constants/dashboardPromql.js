/**
 * 首页大盘 CPU / 内存 / 网络 的 PromQL 与查询步长（供 POST /api/dashboard/overview 下发给后端执行）。
 * 网络为 receive 速率；多 series 时由后端聚合为单一 networkBps（建议 sum）。
 */

export const DASHBOARD_PROMQL = {
  cpu: '100 - (avg by (instance)(rate(node_cpu_seconds_total{instance=~"node_exporter:9100", mode="idle"}[1m0s])) * 100)',
  memory:
    '(1 - node_memory_MemAvailable_bytes{instance=~"node_exporter:9100"} / node_memory_MemTotal_bytes{instance=~"node_exporter:9100"}) * 100',
  network:
    'rate(node_network_receive_bytes_total{instance=~"node_exporter:9100", device=~"(eth0|lo)"}[1m0s])'
}

/** Grafana / VM 查询步长 */
export const DASHBOARD_PROMQL_STEP = {
  cpu: '20s',
  memory: '20s',
  network: '15s'
}

/** @returns {{ promql: typeof DASHBOARD_PROMQL, step: typeof DASHBOARD_PROMQL_STEP }} */
export function buildDashboardOverviewPayload() {
  return {
    promql: { ...DASHBOARD_PROMQL },
    step: { ...DASHBOARD_PROMQL_STEP }
  }
}
