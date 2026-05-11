/**
 * Build a compact list of page numbers and ellipsis markers for numbered pagination.
 * @param {number} current 1-based current page
 * @param {number} totalPages total page count (>= 1)
 * @returns {(number | 'ellipsis')[]}
 */
export function buildPagerSlots(current, totalPages) {
  if (totalPages <= 1) return []
  const c = Math.min(Math.max(1, Math.floor(current)), totalPages)
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const boundary = new Set([1, 2, totalPages - 1, totalPages])
  const around = new Set([c - 1, c, c + 1].filter((p) => p >= 1 && p <= totalPages))
  const merged = new Set([...boundary, ...around])
  const arr = [...merged].sort((a, b) => a - b)
  /** @type {(number | 'ellipsis')[]} */
  const out = []
  for (let i = 0; i < arr.length; i++) {
    if (i > 0 && arr[i] - arr[i - 1] > 1) out.push('ellipsis')
    out.push(arr[i])
  }
  return out
}
