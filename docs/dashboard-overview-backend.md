# 监控大盘 `/api/dashboard/overview` 后端开发规范

本文是**主后端**实现首页「资源监控」卡片的契约说明：路由、请求体、响应体、Prometheus / VictoriaMetrics 查询方式，以及与前端常量的对齐关系。

---

## 0. 开发联调（前端仓库 `npm run dev`）

- 浏览器访问的是 Vite 开发服（如 `http://localhost:5173`），前端请求 `/api/dashboard/overview` 为**同源相对路径**。
- Vite 将 **`/api` 整段代理**到主后端（默认 `http://localhost:8080`，见前端 `vite.config.ts` 的 `server.proxy`）。
- **本接口必须由该后端提供**；浏览器与 Vite **不**直连 Prometheus / VictoriaMetrics。
- 主后端未就绪时，可在前端仓库用 `npm run dashboard-api` 起参考 Node 服务（默认 `127.0.0.1:8090`），并把 Vite 的 proxy `target` 临时改为该地址；参考实现见 `scripts/dashboard-overview-core.mjs`。

---

## 1. 背景与职责划分

- 浏览器**不**直连 Prometheus / VictoriaMetrics（VM），由**后端**代查并聚合成扁平指标。
- 前端通过 `POST /api/dashboard/overview` 下发默认 PromQL（及可选 `step`）；若后端暂不支持 POST，前端会回退 `GET`（见 `src/api/dashboard.js`）。
- 默认 PromQL 与步长与前端常量**同源**，便于前后端一致；生产环境后端可写死相同字符串，或读取配置中心。

**前端参考路径**

| 内容 | 路径 |
|------|------|
| 默认 PromQL / step | `src/constants/dashboardPromql.js` |
| 调用与解包 | `src/api/dashboard.js` |
| 字段消费与展示 | `src/views/dashboard/dashboard.vue`（`applyMetrics`） |
| 参考实现（instant query，Node） | `scripts/dashboard-overview-core.mjs`、`scripts/dashboard-overview-api.mjs` |

### 1.1 本地联调异常排查

| 现象 | 可能原因 |
|------|----------|
| 浏览器 / Network 里 `/api/dashboard/overview` **502 / 连接被拒绝** | 代理 target 上的后端未启动，或端口与 `vite.config.ts` 不一致。 |
| **404 / 405** | 后端未注册该路由；POST 不可用时前端会尝试 GET。 |
| 200 但 `cpuPercent` 等全为 `null` | 上游 VM/Prometheus 无匹配 series，或 `QUERY_BASE` / 标签（如 `instance`）与集群实际不一致。 |
| 502 且 body 含上游错误 | 后端到 VM 的网络、认证或 URL 配置问题。 |

后端侧需在配置中提供 **查询根地址** `QUERY_BASE`（见第 3 节），**不要**依赖前端 `.env` 传入 VM 地址。

---

## 2. HTTP 接口

### 2.1 路径与方法

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/dashboard/overview` | **推荐**：请求体携带 `promql` / `step`（或仅使用服务端默认）。 |
| `GET` | `/api/dashboard/overview` | 兼容旧实现；服务端使用内置默认 PromQL 即可。 |

认证与租户：与现有 `/api/*` 一致（如 `Authorization: Bearer …`、`TenantID` 等），由网关或业务中间件统一处理。

### 2.2 请求体（POST，JSON）

与 `buildDashboardOverviewPayload()` 输出形状对齐（见 `src/constants/dashboardPromql.js`）。

```json
{
  "promql": {
    "cpu": "100 - (avg by (instance)(rate(node_cpu_seconds_total{instance=~\"node_exporter:9100\", mode=\"idle\"}[1m0s])) * 100)",
    "memory": "(1 - node_memory_MemAvailable_bytes{instance=~\"node_exporter:9100\"} / node_memory_MemTotal_bytes{instance=~\"node_exporter:9100\"}) * 100",
    "network": "rate(node_network_receive_bytes_total{instance=~\"node_exporter:9100\", device=~\"(eth0|lo)\"}[1m0s])"
  },
  "step": {
    "cpu": "20s",
    "memory": "20s",
    "network": "15s"
  }
}
```

字段说明：

| 字段 | 类型 | 说明 |
|------|------|------|
| `promql.cpu` | string | CPU 使用率（0–100）瞬时向量表达式。 |
| `promql.memory` | string | 内存使用率（0–100）。 |
| `promql.network` | string | 网络接收速率（字节/秒）；可能多 series。 |
| `step` | object | 可选；若后端用 **range query**（`/api/v1/query_range`）时按 key 选用步长。当前推荐实现使用 **instant query**（`/api/v1/query`），`step` 可忽略，但建议保留字段以便后续扩展。 |

合并策略：若请求体缺少某个 `promql` 字段，后端应用**服务端默认**补齐（与上表字符串一致即可）。

### 2.3 响应体（JSON）

建议 HTTP 200，body 为**扁平对象**（或与现有网关包装 `{ "data": { ... } }` 一致；前端 `unwrapBody` 会解一层 `data`，见 `src/api/dashboard.js`）。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `cpuPercent` | number \| null | 否 | CPU 使用率 0–100；无数据时为 `null`。兼容别名：`cpu`。 |
| `memoryPercent` | number \| null | 否 | 内存使用率 0–100；兼容别名：`memory`。 |
| `diskPercent` | number \| null | 否 | 磁盘使用率 0–100；兼容别名：`disk`。当前默认 PromQL 未覆盖，可为 `null`。 |
| `networkBps` | number \| null | 否 | 网络速率，单位 **字节/秒**；兼容 `networkBytesPerSec`、`network`。 |
| `asOf` | string \| number | 否 | 数据时间；ISO8601 或可被 `new Date()` 解析的字符串。 |
| `message` | string | 否 | 仅提示（如未配置数据源）；前端可不展示。 |

错误语义：

- 业务上「暂无指标」：仍返回 **200**，上述数值字段为 `null`。
- 上游 VM/Prometheus 不可用：可返回 **502**，body 中带 `error` 字符串；前端当前会静默失败，卡片显示 `—`。

---

## 3. 上游查询（Prometheus / VictoriaMetrics）

### 3.1 查询 URL

在配置项「查询根地址」`QUERY_BASE` 下拼接（与仓库内 `instantQuery` 一致）：

```http
GET {QUERY_BASE}/api/v1/query?query={URL_ENCODED_PROMQL}
```

`QUERY_BASE` 示例：

- 单节点 VictoriaMetrics：`http://127.0.0.1:8428`
- VM 集群 select 前缀：`http://vmselect:8481/select/0/prometheus`（末尾可有或可无 `/`，实现时建议规范化后拼 `api/v1/query`）

### 3.2 响应解析（Prometheus 兼容）

成功时 JSON 形状：

- `status === "success"`
- `data.resultType === "vector"`
- `data.result`：数组，元素含 `value: [unixSeconds, "sampleValueString"]`

对每个 PromQL：

1. 解析 `data.result[*].value[1]` 为浮点数。
2. **CPU / 内存**：多条 series 时建议对样本值取 **算术平均**（与 `scripts/dashboard-overview-core.mjs` 中 `aggregateInstantVector(..., 'avg')` 一致）。
3. **网络**：`network` 表达式按设备维度可能多条 series，建议对速率取 **sum**（总接收 B/s，与参考实现 `sum` 一致）。
4. 将 CPU、内存结果限制在 **0–100**（与前端 `clampPct` 行为一致，避免脏数据撑满进度条）。

### 3.3 Instant query 与 step

- 推荐实现使用 **instant query**（`/api/v1/query`），在服务端以「当前评估时刻」计算表达式；`step` 字段可保留供后续改为 `query_range` 或对齐 Grafana。
- 若改为 range query，需自行约定时间窗口，并与 `step` 对齐。

---

## 4. 实现清单（Go / 其它语言）

1. 注册路由：`POST`（及可选 `GET`）`/api/dashboard/overview`（与网关前缀组合后仍应对浏览器表现为上述路径；若全局挂载在 `/api` 下，则处理器挂在 `/dashboard/overview`）。
2. 从配置读取 `QUERY_BASE`（及 TLS、认证如有）。
3. POST 时解析 body，与默认 `promql` 合并。
4. 并发三次 `GET .../api/v1/query`，分别执行 `cpu` / `memory` / `network` 表达式。
5. 按第三节聚合、填 `cpuPercent`、`memoryPercent`、`networkBps`；`diskPercent` 可置 `null` 或另配 PromQL。
6. 设置 `asOf`（建议 UTC ISO8601）。
7. 返回 JSON；若网关统一包装为 `{ "data": { ... } }`，需与前端 `unwrapBody` 行为一致。

---

## 5. 与前端仓库参考脚本的关系

- **`scripts/dashboard-overview-core.mjs`**：可复制的查询与聚合逻辑（instant query）。
- **`npm run dashboard-api`**：独立进程（默认 `127.0.0.1:8090`），环境变量 `SYSWATCH_VM_QUERY_URL` 作为 `QUERY_BASE`；仅用于本地 mock 或对照实现，**不**作为生产依赖。

生产环境应在**主后端**实现本节契约，或由网关将 `/api/dashboard/overview` 转发至实现该契约的服务。

---

## 6. 变更同步

若调整默认 PromQL 或字段含义，请同时修改：

1. `src/constants/dashboardPromql.js`
2. 后端默认配置或模板
3. 本文档中的示例 JSON

以便联调与文档一致。
