/**
 * Prometheus HTTP API：/-/reload（需进程带 --web.enable-lifecycle）。
 * 从浏览器直连时可能受 CORS 限制，需 Prometheus 或反向代理放行。
 */

/** 由数据源「查询 URL」推导默认 lifecycle 地址（支持带 path 前缀的部署） */
export function prometheusReloadUrlFromQueryUrl(queryUrl: string): string {
  const u = new URL(String(queryUrl || '').trim())
  const path = u.pathname.replace(/\/$/, '')
  if (!path || path === '/') {
    return `${u.origin}/-/reload`
  }
  return `${u.origin}${path}/-/reload`
}

function basicAuthHeader(user: string, pass: string): string {
  const s = `${user}:${pass}`
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return `Basic ${btoa(bin)}`
}

export type PrometheusReloadOptions = {
  /** 覆盖默认推导；否则由 queryBaseUrl 推导 */
  reloadUrl?: string
  queryBaseUrl: string
  timeoutMs: number
  basicUser?: string
  basicPass?: string
  /** 与数据源 HTTP 请求头一致（如反向代理鉴权） */
  extraHeaders?: Record<string, string>
}

/**
 * POST /-/reload
 * @returns HTTP 状态码与 ok
 */
export async function postPrometheusLifecycleReload(
  opts: PrometheusReloadOptions
): Promise<{ ok: boolean; status: number; statusText: string }> {
  const reloadUrl = (opts.reloadUrl || '').trim() || prometheusReloadUrlFromQueryUrl(opts.queryBaseUrl)
  const headers = new Headers()
  const u = String(opts.basicUser ?? '').trim()
  const p = String(opts.basicPass ?? '')
  if (u && p) {
    headers.set('Authorization', basicAuthHeader(u, p))
  }
  if (opts.extraHeaders && typeof opts.extraHeaders === 'object') {
    for (const [k, v] of Object.entries(opts.extraHeaders)) {
      const key = String(k || '').trim()
      if (!key) continue
      headers.set(key, String(v ?? ''))
    }
  }

  const ctrl = new AbortController()
  const t = window.setTimeout(() => ctrl.abort(), Math.max(1000, Number(opts.timeoutMs) || 30000))
  try {
    const res = await fetch(reloadUrl, { method: 'POST', headers, signal: ctrl.signal })
    return { ok: res.ok, status: res.status, statusText: res.statusText || '' }
  } finally {
    window.clearTimeout(t)
  }
}
