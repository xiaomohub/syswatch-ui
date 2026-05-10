/**
 * 统一解析 WatchAlert / 网关分页列表响应
 * @param {unknown} data
 */
export function normalizeListPayload(data) {
  if (!data || typeof data !== 'object') {
    return { list: [], total: 0, index: 1, size: 20 }
  }
  const list = data.list ?? data.records ?? data.List ?? data.Records ?? []
  const totalRaw = data.total ?? data.Total ?? data.count ?? data.totalCount
  const indexRaw = data.index ?? data.Index
  const sizeRaw = data.size ?? data.Size
  return {
    list: Array.isArray(list) ? list : [],
    total: Number(totalRaw) || 0,
    index: Math.max(1, Number(indexRaw) || 1),
    size: Math.max(1, Number(sizeRaw) || 20)
  }
}

/** @param {number} current @param {number} totalPages */
export function buildPageList(current, totalPages) {
  const tp = Math.max(1, totalPages)
  const cur = Math.min(Math.max(1, current), tp)
  if (tp <= 7) {
    return Array.from({ length: tp }, (_, i) => i + 1)
  }
  const pages = new Set([1, tp, cur, cur - 1, cur + 1])
  const out = []
  for (let p = 1; p <= tp; p++) {
    if (pages.has(p)) out.push(p)
    else if (out[out.length - 1] !== '...') out.push('...')
  }
  return out
}
