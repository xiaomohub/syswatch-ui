/** 数据源管理页「步骤 1 选择数据源」卡片（新建仅展示这些；缩写 PR/VI/ES/KU/LO 见 DatasourceFormDrawer typeAbbr） */

export const DATASOURCE_TYPE_CARDS = [
  { value: 'Prometheus', label: 'Prometheus' },
  { value: 'VictoriaMetrics', label: 'VictoriaMetrics' },
  { value: 'ElasticSearch', label: 'ElasticSearch' },
  { value: 'Kubernetes', label: 'Kubernetes' },
  { value: 'Loki', label: 'Loki' }
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
