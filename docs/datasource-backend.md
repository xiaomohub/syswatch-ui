# 数据源（Datasource）— 后端实现与 SysWatch 前端对齐说明

本文档描述 **数据源管理** 及关联能力 与当前仓库 Vue 前端的 **HTTP/JSON 契约**，供后端实现或联调对照。路径与 **故障中心 / WatchAlert** 一致：业务前缀 **`/api/w8t`**，统一响应 **`{ code, data, msg }`**。

---

## 1. 统一约定

### 1.1 响应信封

前端通过 `unwrapW8t` 解析（见 `src/api/faultcenter.js`）：

- 成功：`code === 200` 或 `code === 0`，业务数据在 **`data`**。
- 失败：其它 `code`，错误信息优先取 **`msg`** / **`message`**。

### 1.2 列表 `data` 形态

`GET dataSourceList` 的 `data` 可为：

- 对象数组 **`Datasource[]`**；或
- **`{ list: Datasource[] }`**；或
- **`{ items: Datasource[] }`**（前端 `getDatasourceList` 对三者均兼容）。

**注意**：列表分页由 **前端** 在内存中切片（每页 10 条）；后端可返回全量或按需实现服务端过滤，但需与下述 **`query`** 参数语义一致。

### 1.3 鉴权与菜单

- 请求头：`Authorization: Bearer <token>`；多租户与其它 `/api/w8t` 接口一致（见 `src/utils/http.js`）。
- 数据源菜单权限码：**`menu:datasource`**（`src/constants/rbac.js` 中 `PERM.MENU_DATASOURCE`）。具体接口是否要求该权限或其它细粒度权限，由网关在实现期确定。

### 1.4 内容类型

除 **`GET`** 外，本文档所列写接口均为 **`POST`**，且 **`Content-Type: application/json`**。

---

## 2. 路由一览

基础路径：**`/api/w8t/datasource`**。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/datasource/dataSourceList` | 列表（可选关键字过滤） |
| GET | `/datasource/dataSourceGet` | 单条详情（前端已封装，当前页面主要用列表项编辑） |
| POST | `/datasource/dataSourceCreate` | 创建 |
| POST | `/datasource/dataSourceUpdate` | 更新 |
| POST | `/datasource/dataSourceDelete` | 删除 |
| POST | `/datasource/dataSourcePing` | 连接测试（未落库校验） |
| POST | `/datasource/esSearch` | ES 查询（前端 API 已声明，见 §6） |
| POST | `/datasource/searchViewLogsContent` | 视图日志检索（前端 API 已声明，见 §6） |
| GET | `/datasource/queryMetrics` | 指标查询（前端 API 已声明，见 §6） |
| GET | `/datasource/promQuery` | **PromQL 即时查询**（后端代理 Prometheus / VM，见 §5.6） |
| GET | `/datasource/promQueryRange` | **PromQL 范围查询**（同上，见 §5.7） |

---

## 3. 数据源类型（`type`）

与前端常量 `src/constants/datasourceTypes.js` 中 **`DATASOURCE_TYPE_CARDS`** 一致，**`type`** 取值为下列 **英文标识**（大小写敏感建议与下表一致）：

| `type` 值 | 说明 |
|-----------|------|
| `Prometheus` | HTTP + 可选 Remote write |
| `VictoriaMetrics` | HTTP（查询与 Prometheus 兼容的 HTTP API） |
| `AliCloudSLS` | 阿里云 SLS |
| `Jaeger` | HTTP |
| `Loki` | HTTP |
| `CloudWatch` | AWS |
| `Kubernetes` | kubeConfig YAML |
| `ElasticSearch` | HTTP（表单不采集自定义 Headers） |
| `VictoriaLogs` | HTTP |
| `ClickHouse` | 原生地址 + 超时 |

**HTTP 类**（走 `http` / `auth` 块）：`Prometheus`、`VictoriaMetrics`、`Loki`、`VictoriaLogs`、`Jaeger`、`ElasticSearch`。

---

## 4. 实体字段（列表与详情）

列表行展示依赖字段（`DatasourcesPage.vue`）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | **必填**，唯一标识 |
| `name` | string | 名称；**不允许包含空格**（前端校验） |
| `type` | string | 见 §3 |
| `description` | string | 可选 |
| `labels` | object | 键值均为 string 的 **对象**（非数组）；写入告警外部标签；最多 10 对 |
| `enabled` | boolean \| number | 启用；`false` 或 `0` 显示为禁用，否则启用 |
| `updateAt` | number | 建议 **Unix 秒**时间戳；前端用 `Number(text) * 1000` 转本地时间展示 |
| `updateBy` | string | 操作人展示名 |

### 4.1 按类型扩展字段（创建 / 更新 / Ping 请求体）

以下块按 `type` **互斥**出现（与 `DatasourceFormDrawer.vue` 中 `buildPayload` 一致）。

**HTTP 类**（`Prometheus` / `VictoriaMetrics` / `Loki` / `VictoriaLogs` / `Jaeger` / `ElasticSearch`）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `http` | object | **必填** `url`（`http`/`https`，**不得以 `/` 结尾**）、`timeout`（秒，非负整数） |
| `http.headers` | object | 可选；**`ElasticSearch` 类型下前端不提交**该字段 |
| `auth` | object | 可选；`{ "user": "...", "pass": "..." }` |
| `write` | object | 仅 **`Prometheus`**（不含 `VictoriaMetrics`）；`{ "enabled": boolean, "url": string }`，`enabled` 为 false 时 `url` 可为空 |

**`ClickHouse`**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `clickhouseConfig` | object | `addr`（host:port 等）、`timeout`（秒） |
| `auth` | object | 可选；同上 |

**`AliCloudSLS`**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `dsAliCloudConfig` | object | `alicloudEndpoint`、`alicloudAk`、`alicloudSk` |

兼容：详情若扁平返回 `alicloudEndpoint` / `alicloudAk` / `alicloudSk`，前端编辑回填会合并到 `dsAliCloudConfig`。

**`CloudWatch`**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `awsCloudwatch` | object | `region`、`accessKey`、`secretKey` |

**`Kubernetes`**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `kubeConfig` | string | 完整 kubeconfig YAML 文本 |

**`ElasticSearch` 附加**：

- 编辑时若后端返回 **`elasticSearch`** 任意 JSON，前端会 **原样回传**于更新 / Ping 请求体（用于存放后端扩展配置）。新建时前端不主动构造该字段。

### 4.2 创建 / 更新 / Ping 公共请求体

| 字段 | 说明 |
|------|------|
| `name` | 必填 |
| `type` | 必填 |
| `description` | 可选 |
| `labels` | 对象，可 `{}` |
| `enabled` | boolean |

**更新**（`dataSourceUpdate`）：请求体在以上基础上 **必须含 `id`**（字符串）。

**连接测试**（`dataSourcePing`）：

- 创建流程：请求体与创建相同（**无 `id`**）。
- 编辑流程：前端会附加 **`id`**（与更新一致），后端应按 `id` 合并或仅校验连通性，**不落库**。

**响应**：成功时 `data` 可为 `null` 或任意对象；前端只判断 HTTP 层与 `code`，不依赖特定 `data` 结构。

---

## 5. 各接口说明

### 5.1 `GET /datasource/dataSourceList`

- **Query（可选）**

| 参数 | 说明 |
|------|------|
| `query` | 关键字；有值时前端传入。建议按 `name`、`id`、`description` 等模糊匹配（实现可自定） |

- **响应 `data`**：见 §1.2。

### 5.2 `GET /datasource/dataSourceGet`

- **Query**：至少 **`id`**（字符串）；前端封装为 `params` 对象透传。
- **响应 `data`**：单条 `Datasource`，字段需足够支撑编辑回填（§4）。

### 5.3 `POST /datasource/dataSourceCreate`

- **Body**：§4.2 + §4.1 类型块。
- **响应**：可实现返回带 `id` 的完整对象或空 `data`；前端成功后会重新拉列表。

### 5.4 `POST /datasource/dataSourceUpdate`

- **Body**：同创建，且 **含 `id`**。
- **语义**：全量或部分更新以实现为准；前端提交当前表单全量有效字段。

### 5.5 `POST /datasource/dataSourceDelete`

- **Body**（前端固定形态）：

```json
{
  "id": "<数据源 ID>",
  "name": "<数据源名称，用于确认展示>"
}
```

- **响应**：成功即可。

### 5.6 `GET /datasource/promQuery`（PromQL 即时查询 · **待后端实现**）

**用途**：由服务端代查 **Prometheus** 或 **VictoriaMetrics**（与 Prometheus HTTP API 兼容），供 **告警规则编辑页「数据预览」**（`RuleForm.vue` → `PromqlPreviewModal.vue`）展示当前向量/瞬时结果。浏览器 **不** 直连监控上游。

**鉴权 / 租户**：与其它 `/api/w8t` 接口一致；必须按 **`TenantID`（及网关约定）** 解析租户，且仅允许查询 **本租户下**、类型为 `Prometheus` 或 `VictoriaMetrics` 且 **已启用** 的数据源；禁止用请求参数绕过租户隔离。

**Query 参数**（全部通过 URL query 传递）：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `datasourceIds` | string | 是 | 数据源 `id`，**英文逗号**分隔，与 WatchAlert 一致；常见为单个 id |
| `query` | string | 是 | 完整 PromQL；需 URL 编码 |

**上游调用（建议语义）**：

- 对每个 `datasourceId`：读库取 `http.url`、`http.timeout`、`auth`，向 **查询根地址** 发 HTTP GET：
  - **即时向量**：`GET {base}/api/v1/query?query={promql}`  
  - `base` 为数据源配置的 `http.url`（已约定无尾斜杠）；若集群前有统一前缀，由后端与运维约定是否拼接 path。
- **VictoriaMetrics** 单节点通常与上述路径兼容；集群版若使用 `vmselect`，仍以 **Prometheus query API** 兼容端点为准。
- 超时：建议采用数据源 `http.timeout`（秒），并设硬上限（如 60s）防止拖垮网关。
- 认证：若配置了 `auth.user` / `auth.pass`，使用 **Basic** 或上游要求的头（与现有 Ping/其它代理逻辑对齐）。

**成功时响应 `data`（与前端解析契约）**：

前端 `PromqlPreviewModal` 支持两种形态（建议后端固定一种，或两种都支持）：

1. **多数据源（推荐，与历史 WatchAlert 一致）**：`data` 为 **数组**，长度等于成功查询的数据源个数（顺序与 `datasourceIds` 分割顺序一致）。每个元素为 **一次上游 JSON 反序列化后的对象**，且至少满足：存在 `data.result` 为数组（与 Prometheus `query` 响应中 `data.result` 一致）。典型上游完整形态为：
   - `{ "status": "success", "data": { "resultType": "vector" | "scalar" | "string", "result": [ ... ] } }`
2. **单数据源简写**：`data` 直接为上述「单个上游对象」（非数组）；前端同样会按 `data.result` 解析。

**`result` 中单条元素**（即时查询）：与 Prometheus 一致，例如向量：

- `metric`: object  
- `value`: `[ unixTs, "sampleValue" ]`（可选）  
- 或部分实现返回 `values` 数组；前端会取 **最后一个点** 作为展示值。

**错误**：

- 缺少 `datasourceIds` 或 `query`：`code` 非 200，`msg` 说明原因。
- 某 id 不存在、非本租户、类型非 `Prometheus`/`VictoriaMetrics`、或已禁用：对该 id **跳过**或 **整体失败**（二选一，需在实现中固定；建议 **整体失败** 并 `msg` 指明 id，便于排错）。
- 上游 4xx/5xx/超时：非 200，`msg` 含可读摘要；可选将上游 body 截断记入日志，**勿**把密钥写入 `msg`。

**安全与限额（建议）**：

- 限制单次 `datasourceIds` 个数（如 ≤ 10）。
- 限制 `query` 最大长度；可选拒绝明显危险子串（实现自定）。
- 限制单次返回 series 数量，超出则截断并打日志。

---

### 5.7 `GET /datasource/promQueryRange`（PromQL 范围查询 · **待后端实现**）

**用途**：同 §5.6，用于预览 **时间范围矩阵** 并绘制折线图（ECharts）。

**Query 参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `datasourceIds` | string | 是 | 同 §5.6 |
| `query` | string | 是 | 同 §5.6 |
| `startTime` | int64 | 是 | 区间起点 **Unix 秒** |
| `endTime` | int64 | 是 | 区间终点 **Unix 秒**，应 ≥ `startTime` |
| `step` | int 或 string | 是 | 步长（秒）；前端默认数字 `10`；可兼容 `"10s"` 形式，**须与上游 `query_range` 约定一致** |

**上游调用**：

- `GET {base}/api/v1/query_range?query={promql}&start={start}&end={end}&step={step}`  
- `start`/`end`：Prometheus 支持 **Unix 秒**（浮点）；VM 兼容实现需与此对齐。

**成功时响应 `data`**：

- 与 §5.6 相同：**数组（每数据源一项）** 或 **单个对象**。
- 每个对象须含 `data.result` 为 **matrix** 条目列表；每条含 `metric` 与 `values`：
  - `values`: `[ [ unixTs, "value" ], ... ]`（Unix 秒 + 字符串样本值）

**错误**：同 §5.6；额外校验 `endTime >= startTime`、`step > 0`，否则返回明确 `msg`。

---

## 6. 扩展接口（前端已封装，业务按需实现）

下列方法在 `src/api/datasource.js` 中已对接 **`unwrapW8t`**。**§5.6 / §5.7** 已被 **告警规则 PromQL 预览** 使用；其余接口若产品启用再由调用页面约定契约。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/datasource/esSearch` | 请求体、响应体与 ES 场景对齐后由调用方约定 |
| POST | `/datasource/searchViewLogsContent` | 同上 |
| GET | `/datasource/queryMetrics` | Query 参数与指标结果结构需与调用页面约定 |

---

## 7. 与其它模块的关系

- **告警规则**（`src/api/w8tAlert.js`）：`datasourceList` 内部调用 **`dataSourceList`**，并可按 `datasourceType` 在前端过滤；规则里绑定的是数据源 **`id`** 列表。
- **告警规则 PromQL 预览**：`src/views/alert-mgmt/RuleForm.vue` 在数据源类型为 **`Prometheus`** 或 **`VictoriaMetrics`** 时调用 **`promQuery`** + **`promQueryRange`**（见 §5.6、§5.7）；与 **数据源管理** 中配置的 `http.url` / 认证一致。
- **错误提示**：所有失败路径应返回清晰 **`msg`**，前端将 `throw new Error(msg)` 展示给用户。

---

## 8. 前端参考文件

| 文件 | 作用 |
|------|------|
| `src/api/datasource.js` | 路径与 HTTP 方法 |
| `src/api/faultcenter.js` | `W8T_BASE`、`unwrapW8t` |
| `src/views/datasources/DatasourcesPage.vue` | 列表、删除、搜索 |
| `src/views/datasources/DatasourceFormDrawer.vue` | 创建 / 更新 / Ping 请求体构造 |
| `src/constants/datasourceTypes.js` | 类型枚举与 HTTP 类判定 |
| `src/views/alert-mgmt/PromqlPreviewModal.vue` | PromQL 即时 + 范围预览 UI |
| `src/views/alert-mgmt/RuleForm.vue` | 规则表单与「数据预览」入口 |
