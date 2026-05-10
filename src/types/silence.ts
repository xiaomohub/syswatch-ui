export interface SilenceLabel {
  key: string
  value: string
  operator: '==' | '=' | '!=' | '=~' | '!~'
}

export interface AlertSilence {
  tenantId?: string
  id: string
  name: string
  labels: SilenceLabel[]
  startsAt: number
  endsAt: number
  faultCenterId: string
  comment: string
  updateBy?: string
  updateAt?: number
  /** 0 未生效 | 1 进行中 | 2 已失效 */
  status: 0 | 1 | 2
}

export interface SilenceListQuery {
  faultCenterId?: string
  query?: string
  /** `all` 不按状态过滤；否则 `0` / `1` / `2` */
  status?: string
  index: number
  size: number
}

export interface SilenceListResponse {
  list: AlertSilence[]
  total: number
  index: number
  size: number
}
