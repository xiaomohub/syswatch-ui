/**
 * 活跃/历史事件列表展示：兼容 Go WatchAlert 与 Java BFF 字段差异
 */

/**
 * @param {unknown} v 秒/毫秒时间戳、毫秒数字字符串、ISO 字符串
 */
export function formatEventTs(v) {
  if (v == null || v === '') return '—'
  if (typeof v === 'string') {
    const t = v.trim()
    if (!t) return '—'
    if (/^\d+$/.test(t)) {
      const n = Number(t)
      const ms = n < 1e12 ? n * 1000 : n
      const d = new Date(ms)
      if (!Number.isNaN(d.getTime())) return d.toLocaleString('zh-CN')
    }
    if (t.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(t)) {
      const d = new Date(t)
      if (!Number.isNaN(d.getTime())) return d.toLocaleString('zh-CN')
    }
  }
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  const ms = n < 1e12 ? n * 1000 : n
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('zh-CN')
}

/**
 * @param {Record<string, unknown>} row
 * @returns {unknown}
 */
export function pickFirstTriggerTime(row) {
  if (!row || typeof row !== 'object') return null
  /** Java SysWatch / 对接说明：优先数字 `first_trigger_time`（Unix 秒），再字符串 `firstTriggerTime` / `FirstTriggerTime` */
  const keys = [
    'first_trigger_time',
    'firstTriggerTime',
    'FirstTriggerTime',
    'starts_at',
    'startsAt',
    'start_time',
    'startTime',
    'create_time',
    'createTime',
    'trigger_time',
    'triggerTime',
    'firstAt',
    'first_at'
  ]
  for (const k of keys) {
    if (k in row && row[k] != null && row[k] !== '') return row[k]
  }
  return null
}

/**
 * 历史告警 `hisEvent` 列表：恢复/结束时间（Go/Java 键名不一，多候选）
 * @param {Record<string, unknown>} row
 * @returns {unknown}
 */
export function pickRecoverTime(row) {
  if (!row || typeof row !== 'object') return null
  const keys = [
    'recoverTime',
    'RecoverTime',
    'recover_time',
    'recoveryTime',
    'recovery_time',
    'lastRecoverTime',
    'last_recover_time',
    'resolvedAt',
    'resolved_at',
    'resolvedTime',
    'resolved_time',
    'closeTime',
    'close_time',
    'recoverAt',
    'recover_at',
    'endsAt',
    'ends_at'
  ]
  for (const k of keys) {
    if (k in row && row[k] != null && row[k] !== '') return row[k]
  }
  return null
}

/**
 * 历史告警 `hisEvent` 列表：规则列用 `ruleName`（勿用 `title` 当规则名）
 * @param {Record<string, unknown>} row
 */
export function pickHisEventRuleName(row) {
  if (!row || typeof row !== 'object') return ''
  const v = row.ruleName ?? row.rule_name
  return String(v ?? '').trim()
}

/**
 * 历史告警：数据源列用后端回填的 `datasourceName`
 * @param {Record<string, unknown>} row
 */
export function pickHisEventDatasourceDisplay(row) {
  if (!row || typeof row !== 'object') return ''
  const name = String(row.datasourceName ?? row.datasource_name ?? '').trim()
  if (name) return name
  const type = String(row.datasourceType ?? row.datasource_type ?? '').trim()
  if (type) return type
  const id = row.datasourceId ?? row.datasource_id
  if (id != null && String(id).trim() !== '') return String(id).trim()
  return ''
}

/**
 * Java SysWatch 认领后常见顶层字段（与 POST /event/process 文档一致）
 * @param {Record<string, unknown>} row
 */
export function pickClaimUserName(row) {
  if (!row || typeof row !== 'object') return ''
  return String(
    row.duty_user_name ??
      row.DutyUserName ??
      row.dutyUserName ??
      row.claimUser ??
      row.claim_user ??
      row.confirmUser ??
      row.ConfirmUser ??
      row.confirm_user ??
      row.confirmUsername ??
      row.confirm_username ??
      row.confirmedBy ??
      row.confirmed_by ??
      row.processor ??
      ''
  ).trim()
}

/**
 * @param {Record<string, unknown>} row
 * @returns {{ isOk: boolean, confirmUsername: string }}
 */
export function pickConfirmDisplay(row) {
  if (!row || typeof row !== 'object') {
    return { isOk: false, confirmUsername: '' }
  }
  const csRaw = row.confirmState ?? row.confirm_state ?? row.ConfirmState

  if (csRaw != null && typeof csRaw === 'object' && !Array.isArray(csRaw)) {
    const o = /** @type {Record<string, unknown>} */ (csRaw)
    const ok = o.isOk ?? o.IsOk ?? o.is_ok
    let user = String(
      o.confirmUsername ?? o.ConfirmUsername ?? o.confirm_username ?? o.username ?? o.userName ?? ''
    ).trim()
    if (ok === false || ok === 'false' || ok === 0 || ok === '0') {
      return { isOk: false, confirmUsername: '' }
    }
    if (ok === true || ok === 'true' || ok === 1 || ok === '1') {
      if (!user) user = pickClaimUserName(row)
      return { isOk: true, confirmUsername: user }
    }
    if (user.length > 0) {
      return { isOk: true, confirmUsername: user }
    }
    return { isOk: false, confirmUsername: '' }
  }

  // Java：confirmState 常为数字 1（非嵌套对象），认领人见 duty_user_name / confirm_user 等
  if (csRaw === 1 || csRaw === '1' || csRaw === true || csRaw === 'true') {
    return { isOk: true, confirmUsername: pickClaimUserName(row) }
  }
  if (csRaw === 0 || csRaw === '0' || csRaw === false || csRaw === 'false') {
    return { isOk: false, confirmUsername: '' }
  }

  const okFlat =
    row.confirm_ok ??
    row.isConfirmed ??
    row.claimed ??
    row.is_claimed ??
    row.confirmOk
  const userFlat = pickClaimUserName(row)
  if (okFlat === false || okFlat === 'false' || okFlat === 0 || okFlat === '0') {
    return { isOk: false, confirmUsername: '' }
  }
  if (okFlat === true || okFlat === 'true' || okFlat === 1 || okFlat === '1') {
    return { isOk: true, confirmUsername: userFlat }
  }
  if (userFlat.length > 0) {
    return { isOk: true, confirmUsername: userFlat }
  }
  return { isOk: false, confirmUsername: '' }
}

/**
 * 认领时间：`confirm_time`（Unix 秒）或 `confirmTime`（北京时间字符串等）
 * @param {Record<string, unknown>} row
 */
export function formatConfirmTimeCell(row) {
  if (!row || typeof row !== 'object') return '—'
  const ct = row.confirm_time
  if (ct != null && ct !== '') {
    const formatted = formatEventTs(ct)
    if (formatted !== '—') return formatted
  }
  const s = row.confirmTime ?? row.ConfirmTime
  if (s != null && String(s).trim()) return String(s).trim()
  return '—'
}

/**
 * 列表行指纹 / Redis field（与 `event_id` 同义时后端可能只回其中一种）
 * @param {Record<string, unknown>} row
 */
export function pickEventFingerprint(row) {
  if (!row || typeof row !== 'object') return ''
  const v = row.fingerprint ?? row._redisField ?? row.event_id ?? row.eventId
  return String(v ?? '').trim()
}

/**
 * 历史列表「认领人」列：优先顶层认领人字段，再回退 `pickConfirmDisplay`（与活跃列表一致）
 * @param {Record<string, unknown>} row
 */
export function formatHisEventClaimCell(row) {
  const direct = pickClaimUserName(row)
  if (direct) return direct
  const { isOk, confirmUsername } = pickConfirmDisplay(row)
  if (!isOk) return '—'
  return confirmUsername || '已认领'
}
