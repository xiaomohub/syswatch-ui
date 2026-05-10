/** JS 月份 0–11 → 查询参数 `YYYY-M`（月不补零） */
export function formatDutyMonthParam(year, month0to11) {
  return `${year}-${month0to11 + 1}`
}

/** `<input type="month">` 的 `YYYY-MM` → API `YYYY-M` */
export function monthInputToApiParam(ym) {
  const [y, m] = String(ym).split('-').map((x) => parseInt(x, 10))
  if (!y || !m) return ''
  return `${y}-${m}`
}

/** @param {string} ym */
export function parseMonthInput(ym) {
  const [y, m] = String(ym).split('-').map((x) => parseInt(x, 10))
  return { year: y, month: m }
}

/** @param {number} year @param {number} month1to12 */
export function daysInCalendarMonth(year, month1to12) {
  return new Date(year, month1to12, 0).getDate()
}

/** @param {number} year @param {number} month1to12 @param {number} day */
export function isWorkday(year, month1to12, day) {
  const w = new Date(year, month1to12 - 1, day).getDay()
  return w >= 1 && w <= 5
}

/**
 * @param {string|number|Date} time
 * @returns {string|null} Local calendar key `Y-M-D` (no zero pad), or null
 */
export function timeToLocalDayKey(time) {
  if (time == null) return null
  const d = time instanceof Date ? time : new Date(time)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/**
 * Monday-first month grid. Each cell: `{ key, day, inMonth, isWeekend }`.
 * @param {number} year
 * @param {number} month1to12
 */
export function buildMonthCalendarCells(year, month1to12) {
  const first = new Date(year, month1to12 - 1, 1)
  const firstDow = first.getDay()
  const offsetMon = (firstDow + 6) % 7
  const last = daysInCalendarMonth(year, month1to12)
  const prevMonth = month1to12 === 1 ? 12 : month1to12 - 1
  const prevYear = month1to12 === 1 ? year - 1 : year
  const prevLast = daysInCalendarMonth(prevYear, prevMonth)

  /** @type {Array<{ key: string, day: number, inMonth: boolean, isWeekend: boolean }>} */
  const cells = []

  for (let i = 0; i < offsetMon; i++) {
    const day = prevLast - offsetMon + i + 1
    cells.push({
      key: `${prevYear}-${prevMonth}-${day}`,
      day,
      inMonth: false,
      isWeekend: !isWorkday(prevYear, prevMonth, day)
    })
  }
  for (let d = 1; d <= last; d++) {
    cells.push({
      key: `${year}-${month1to12}-${d}`,
      day: d,
      inMonth: true,
      isWeekend: !isWorkday(year, month1to12, d)
    })
  }

  const nextMonth = month1to12 === 12 ? 1 : month1to12 + 1
  const nextYear = month1to12 === 12 ? year + 1 : year
  let nextDay = 1
  while (cells.length % 7 !== 0) {
    cells.push({
      key: `${nextYear}-${nextMonth}-${nextDay}`,
      day: nextDay,
      inMonth: false,
      isWeekend: !isWorkday(nextYear, nextMonth, nextDay)
    })
    nextDay++
  }

  return cells
}
