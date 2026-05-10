/** WatchAlert 规则数据源类型（与创建表单、列表筛选一致） */
export const ALERT_DATASOURCE_TYPES = [
  'Prometheus',
  'VictoriaMetrics',
  'Loki',
  'AliCloudSLS',
  'Jaeger',
  'CloudWatch',
  'KubernetesEvent',
  'ElasticSearch',
  'VictoriaLogs',
  'ClickHouse'
]

export const DEFAULT_ALERT_DATASOURCE_TYPE = 'Prometheus'
