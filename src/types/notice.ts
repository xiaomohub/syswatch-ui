/** 周几：与 Go time.Weekday.String() 一致 */
export type WeekdayString = string

export interface EffectiveTime {
  week: WeekdayString[]
  /** 当日秒内偏移，0=0:00；hour*3600+minute*60 */
  startTime: number
  endTime: number
}

export interface NoticeRoute {
  noticeType: string
  noticeTmplId: string
  severitys: string[]
  hook: string
  sign: string
  subject: string
  to: string[]
  cc: string[]
  effectiveTime: EffectiveTime
}

export interface AlertNotice {
  tenantId: string
  uuid: string
  name: string
  dutyId: string | null
  routes: NoticeRoute[]
  updateAt: number
  updateBy: string
}

export interface NoticeRecord {
  eventId: string
  date: string
  createAt: number
  tenantId: string
  ruleName: string
  nType: string
  nObj: string
  severity: string
  status: number
  alarmMsg: string
  errMsg: string
}

export interface NoticeRecordListResponse {
  list: NoticeRecord[]
  total: number
  index: number
  size: number
}

export interface NoticeRecordMetric {
  date: string[]
  series: {
    p0: number[]
    p1: number[]
    p2: number[]
  }
}

export interface NoticeTestPayload {
  noticeType: string
  hook: string
  sign: string
  email: { subject: string; to: string[]; cc: string[] }
}
