import { secondsToHourMinute, toDaySeconds, WEEK_OPTIONS } from '@/utils/noticeTime'

export { WEEK_OPTIONS }

export const WEEK_LABELS = {
  Monday: '周一',
  Tuesday: '周二',
  Wednesday: '周三',
  Thursday: '周四',
  Friday: '周五',
  Saturday: '周六',
  Sunday: '周日'
}

/** @param {Record<string, unknown>} r */
export function normalizeRoute(r) {
  const em = r.email && typeof r.email === 'object' ? r.email : {}
  const sev = r.severitys
  let severitys = []
  if (Array.isArray(sev)) severitys = [...sev]
  else if (sev) severitys = [sev]
  if (severitys.length === 0) severitys = ['P0']

  return {
    noticeType: r.noticeType || 'FeiShu',
    noticeTmplId: r.noticeTmplId || '',
    severitys,
    hook: r.hook || '',
    sign: r.sign || '',
    subject: r.subject ?? em.subject ?? '',
    to: Array.isArray(r.to) ? [...r.to] : Array.isArray(em.to) ? [...em.to] : [],
    cc: Array.isArray(r.cc) ? [...r.cc] : Array.isArray(em.cc) ? [...em.cc] : [],
    effectiveTime: {
      week: Array.isArray(r.effectiveTime?.week) ? [...r.effectiveTime.week] : [],
      startTime: r.effectiveTime?.startTime ?? 0,
      endTime: r.effectiveTime?.endTime ?? 0
    }
  }
}

/** @param {Record<string, unknown>|null|undefined} record */
export function rowToRoutes(record) {
  if (!record) return [defaultRoute()]
  if (record.routes?.length) {
    return record.routes.map((x) => normalizeRoute(x))
  }
  return [
    normalizeRoute({
      noticeType: record.noticeType,
      noticeTmplId: record.noticeTmplId,
      severitys: record.severitys,
      hook: record.hook,
      sign: record.sign,
      subject: record.subject,
      to: record.to,
      cc: record.cc,
      email: record.email,
      effectiveTime: record.effectiveTime
    })
  ]
}

export function defaultRoute() {
  return normalizeRoute({
    noticeType: 'FeiShu',
    severitys: ['P0'],
    noticeTmplId: '',
    hook: '',
    sign: '',
    subject: '',
    to: [],
    cc: [],
    effectiveTime: { week: [], startTime: 0, endTime: 0 }
  })
}

/** @param {number} sec */
export function secondsToTimeStr(sec) {
  const { hour, minute } = secondsToHourMinute(sec)
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

/** @param {string} s */
export function timeStrToSeconds(s) {
  const parts = String(s || '00:00').split(':').map((x) => parseInt(x, 10))
  const h = parts[0] ?? 0
  const m = parts[1] ?? 0
  return toDaySeconds(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0)
}

export function splitEmails(s) {
  return String(s || '')
    .split(/[,;\s]+/)
    .map((x) => x.trim())
    .filter(Boolean)
}
