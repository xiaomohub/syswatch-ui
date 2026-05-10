export const SILENCE_OPERATORS = ['==', '=', '!=', '=~', '!~']

/**
 * @param {unknown} sec
 * @returns {string}
 */
export function formatSilenceDateTime(sec) {
  if (sec == null || sec === '') return '—'
  const n = typeof sec === 'number' ? sec : Number(sec)
  if (Number.isNaN(n)) return String(sec)
  return new Date(n * 1000).toLocaleString()
}

/**
 * @param {number} sec
 * @returns {string}
 */
export function unixToDatetimeLocal(sec) {
  const d = new Date(sec * 1000)
  const pad = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * @param {string} local
 * @returns {number}
 */
export function datetimeLocalToUnix(local) {
  if (!local || !local.trim()) return NaN
  const t = new Date(local).getTime()
  return Number.isNaN(t) ? NaN : Math.floor(t / 1000)
}

export function emptySilenceLabel() {
  return { key: '', value: '', operator: '==' }
}

export function normalizeLabelsInput(raw) {
  if (!Array.isArray(raw)) return [emptySilenceLabel()]
  return raw.length
    ? raw.map((x) => ({
        key: String(x?.key ?? ''),
        value: String(x?.value ?? ''),
        operator: SILENCE_OPERATORS.includes(x?.operator) ? x.operator : '=='
      }))
    : [emptySilenceLabel()]
}

export function labelsForApi(rows) {
  return rows
    .map((r) => ({
      key: r.key.trim(),
      value: r.value.trim(),
      operator: r.operator
    }))
    .filter((r) => r.key.length > 0)
}

/**
 * @param {string} [summary]
 * @returns {string}
 */
export function silenceLabelsSummary(summary) {
  if (!summary) return '—'
  return summary.length > 48 ? `${summary.slice(0, 48)}…` : summary
}

export function buildLabelsSummary(labels) {
  if (!labels?.length) return ''
  return labels
    .filter((l) => l.key)
    .map((l) => `${l.key}${l.operator}${l.value}`)
    .join(', ')
}

/**
 * 从活跃事件行推导静默标签条件（与 SilenceForm / WatchAlert 标签匹配一致）。
 * 优先使用事件上的 `labels` 对象（或 JSON 字符串）；否则用规则名作为 `alertname`。
 *
 * @param {Record<string, unknown>} row curEvent 列表项
 * @returns {{ key: string, value: string, operator: string }[]}
 */
export function eventRowToSilenceLabelRows(row) {
  let labelsObj = row?.labels
  if (typeof labelsObj === 'string') {
    try {
      labelsObj = JSON.parse(labelsObj)
    } catch {
      labelsObj = null
    }
  }
  if (labelsObj && typeof labelsObj === 'object' && !Array.isArray(labelsObj)) {
    const out = []
    for (const [k, v] of Object.entries(labelsObj)) {
      if (v == null || String(k).trim() === '') continue
      const sv =
        typeof v === 'string'
          ? v
          : typeof v === 'number' || typeof v === 'boolean'
            ? String(v)
            : ''
      if (!sv) continue
      out.push({ key: k, value: sv, operator: '==' })
    }
    if (out.length) return out
  }
  const rule = String(row?.rule_name ?? row?.ruleName ?? '').trim()
  if (rule) {
    return [{ key: 'alertname', value: rule, operator: '==' }]
  }
  return []
}
