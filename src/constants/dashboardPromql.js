/**
 * 与后端 DashboardOverviewServiceImpl 默认 PromQL 对齐，供 POST /api/dashboard/overview 覆盖联调。
 * 网络为 receive 速率（Bps）；多 series 由后端聚合（百分比类平均，网络 sum）。
 */

export const DASHBOARD_PROMQL = {
  cpu: '100 - (avg by (instance)(rate(node_cpu_seconds_total{instance=~"node_exporter:9100", mode="idle"}[1m0s])) * 100)',
  memory:
    '(1 - node_memory_MemAvailable_bytes{instance=~"node_exporter:9100"} / node_memory_MemTotal_bytes{instance=~"node_exporter:9100"}) * 100',
  disk: '(1 - node_filesystem_avail_bytes{instance=~"node_exporter:9100", fstype!~"tmpfs|overlay|devtmpfs"} / node_filesystem_size_bytes{instance=~"node_exporter:9100", fstype!~"tmpfs|overlay|devtmpfs"}) * 100',
  network:
    'rate(node_network_receive_bytes_total{instance=~"node_exporter:9100", device=~"(eth0|lo)"}[1m0s])'
}

/** 预留；后端当前为 instant query，不读取 step */
export const DASHBOARD_PROMQL_STEP = {
  cpu: '20s',
  memory: '20s',
  disk: '20s',
  network: '15s'
}

/** @returns {{ promql: typeof DASHBOARD_PROMQL, step: typeof DASHBOARD_PROMQL_STEP }} */
export function buildDashboardOverviewPayload() {
  return {
    promql: { ...DASHBOARD_PROMQL },
    step: { ...DASHBOARD_PROMQL_STEP }
  }
}
