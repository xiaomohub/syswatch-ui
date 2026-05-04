#!/usr/bin/env node
/**
 * 独立大盘查询服务（默认 8090）。与主后端 8080 并存时，让 Vite 把
 * /api/dashboard/overview 代理到本服务。
 *
 *   SYSWATCH_VM_QUERY_URL=http://127.0.0.1:8428 SYSWATCH_DASHBOARD_API_PORT=8090 node scripts/dashboard-overview-api.mjs
 */
import http from 'node:http'
import { buildOverviewMetrics } from './dashboard-overview-core.mjs'

const PORT = Number(process.env.SYSWATCH_DASHBOARD_API_PORT || 8090)
const VM_BASE = process.env.SYSWATCH_VM_QUERY_URL || ''

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  const pathOnly = (req.url || '').split('?')[0]
  if (pathOnly !== '/api/dashboard/overview') {
    res.statusCode = 404
    res.end()
    return
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Allow', 'GET, POST')
    res.end()
    return
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8')

  try {
    let postBody = {}
    if (req.method === 'POST') {
      const raw = await readBody(req)
      if (raw && raw.trim()) {
        try {
          postBody = JSON.parse(raw)
        } catch {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'Invalid JSON body' }))
          return
        }
      }
    }
    const body = await buildOverviewMetrics(VM_BASE, postBody)
    res.statusCode = 200
    res.end(JSON.stringify(body))
  } catch (e) {
    res.statusCode = 502
    res.end(JSON.stringify({ error: String(e?.message || e), asOf: new Date().toISOString() }))
  }
})

server.listen(PORT, '127.0.0.1', () => {
   
  console.log(`[dashboard-overview] http://127.0.0.1:${PORT}/api/dashboard/overview  VM=${VM_BASE || '(unset)'}`)
})
