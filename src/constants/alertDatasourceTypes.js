/** WatchAlert 规则数据源类型（与创建表单、列表筛选一致；与数据源新建可选类型对齐） */
export const ALERT_DATASOURCE_TYPES = [
  'Prometheus',
  'VictoriaMetrics',
  'ElasticSearch',
  'Kubernetes',
  'Loki'
]

export const DEFAULT_ALERT_DATASOURCE_TYPE = 'Prometheus'
