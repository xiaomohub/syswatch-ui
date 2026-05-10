/** @param {number} hour @param {number} minute */
export function toDaySeconds(hour, minute) {
  return hour * 3600 + minute * 60
}

export const WEEK_OPTIONS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
]

/** @param {number} total */
export function secondsToHourMinute(total) {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  return { hour: h, minute: m }
}
