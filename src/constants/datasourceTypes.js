/** 数据源管理页类型卡片 value 与列表「数据源类型」展示一致 */

export const DATASOURCE_TYPE_CARDS = [
  { value: 'Prometheus', label: 'Prometheus' },
  { value: 'VictoriaMetrics', label: 'VictoriaMetrics' },
  { value: 'AliCloudSLS', label: '阿里云SLS' },
  { value: 'Jaeger', label: 'Jaeger' },
  { value: 'Loki', label: 'Loki' },
  { value: 'CloudWatch', label: 'CloudWatch' },
  { value: 'Kubernetes', label: 'Kubernetes' },
  { value: 'ElasticSearch', label: 'ElasticSearch' },
  { value: 'VictoriaLogs', label: 'VictoriaLogs' },
  { value: 'ClickHouse', label: 'ClickHouse' }
]

/** 走 HTTP 配置块（url / timeout / headers / auth）的类型 */
export const DATASOURCE_HTTP_TYPES = new Set([
  'Prometheus',
  'VictoriaMetrics',
  'Loki',
  'VictoriaLogs',
  'Jaeger',
  'ElasticSearch'
])

export function datasourceTypeLabel(value) {
  const row = DATASOURCE_TYPE_CARDS.find((x) => x.value === value)
  return row ? row.label : value || '—'
}

/** HTTP URL：禁止尾斜杠 */
export const DATASOURCE_HTTP_URL_RE = /^(https?):\/\/.+[^/]$/i
