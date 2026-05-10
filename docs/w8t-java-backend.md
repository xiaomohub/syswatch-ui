# WatchAlert `/api/w8t` — Java 后端对接说明

本文档面向 **Java（Spring Boot）** 实现网关、BFF 或与 **WatchAlert（Go）** 并存时的契约对齐，与本仓库前端实际请求一致。  
**仅活跃告警：评论 / 认领 / 删除** 的精简契约见 [**`event-actions-java-backend.md`**](./event-actions-java-backend.md)。  
实现细节、Redis、消费者等见 [`fault-center-backend.md`](./fault-center-backend.md)；路线与检查单见 [`alert-management-backend-plan.md`](./alert-management-backend-plan.md)。

**规则组 / 规则 / 导入 / 批量变更** 的字段级说明见：**[`alert-rules-java-backend.md`](./alert-rules-java-backend.md)**（本文不重复规则域）。

---

## 1. 全局约定

| 项 | 说明 |
|----|------|
| 前缀 | `/api/w8t`；仪表盘相关另有 `/api/system`（如 `getDashboardInfo`） |
| 鉴权 | 请求头 `Authorization: Bearer <token>` |
| 租户 | 若登录后本地存有 `tenantId`，前端会带请求头 **`TenantID`**（见 `src/utils/http.js`） |
| 响应信封 | `{ "code": 200 \| 0, "data": ..., "msg": "..." }`；失败时 `code` 非 200/0，`msg` 为可读原因 |

分页（列表类）：查询参数 **`index` 从 1 开始**、`size` > 0；`data` 中含 `list` 或 `records`、`total`、`index`、`size`（前端 `normalizeListPayload` 兼容二者）。

---

## 2. JSON / Query 命名与前端行为

WatchAlert（Go）历史接口多为 **camelCase**；Java 侧若使用 **snake_case** DTO 或校验注解，仅认 `fault_center_id`、`event_ids` 等时，会出现「字段必填」但实际请求已带驼峰名的现象。

**当前前端策略**（`src/api/w8tAlert.js`）对 **事件** 相关读写做了 **双写**（同一语义两套键名），便于 Go 与 Java 共存联调：

| 语义 | camelCase（Go 常见） | snake_case（Java 常见） |
|------|----------------------|-------------------------|
| 故障中心 ID | `faultCenterId` | `fault_center_id` |
| 活跃事件指纹列表 | `fingerprints` | `event_ids`（元素为 fingerprint 字符串） |
| 单条指纹 | `fingerprint` | `event_id`（评论等场景下与 fingerprint 同义） |

**Java 建议**：

- 在 DTO 上使用 **`@JsonAlias`** 同时接收两套名称；或  
- 统一使用一种命名并在网关做键名映射；避免只校验 snake_case 而忽略 camelCase 导致联调失败。

---

## 3. 事件 `event`

### 3.1 活跃列表 `GET /api/w8t/event/curEvent`

**用途**：Redis 中当前活跃事件，分页与筛选。

**Query（前端会传，含双写故障中心）**：

| 参数 | 说明 |
|------|------|
| `faultCenterId` / `fault_center_id` | 必填其一（前端会同时带） |
| `query` | 可选，检索串 |
| `severity` | 可选 |
| `datasourceType` | 可选 |
| `status` | 可选 |
| `scope` | 近 N 天，数字 |
| `sortOrder` | `ascend` / `descend` |
| `index` | 页码，从 1 |
| `size` | 每页条数 |

**响应**：分页对象；列表项常见字段含 `fingerprint`、`rule_name` / `ruleName`、`severity`、`status`、`faultCenterId` 等。

**首次触发时间（列表「首次触发」列）**：前端会依次识别 `first_trigger_time`、`firstTriggerTime`、`startsAt`、`createTime`、`triggerTime` 等（见 `src/utils/w8tEventDisplay.js` `pickFirstTriggerTime`）。时间值支持 Unix 秒/毫秒（数字或纯数字字符串）及 ISO-8601 字符串。

**认领状态（「认领」列）**：前端会识别嵌套对象 `confirmState` / `confirm_state`，字段 `isOk` / `is_ok` 与 `confirmUsername` / `confirm_username`；也支持顶层 `claimed`、`confirm_username`、`confirmedBy` 等（见 `pickConfirmDisplay`）。认领接口应对 Redis/库中的事件写入与列表一致的字段，否则刷新后仍显示「—」。

---

### 3.2 历史列表 `GET /api/w8t/event/hisEvent`

**用途**：读库表 `w8t_his_event`，分页返回已归档告警（Java SysWatch）。

**Query（时间过滤）**：服务端常用 **`startTime` / `endTime`**（及 `start_time` / `end_time`），值为 Unix **秒**。前端在请求前由 `mergeHisEventQuery`（`src/api/w8tAlert.js`）对 `startAt`/`endAt` 与 `startTime`/`start_time`、`endTime`/`end_time` **双写**，兼容旧参数名。

**其它 Query**：`faultCenterId`/`fault_center_id`（必填）、`query`、`status`、`index`、`size`；另可传 `ruleId`、`ruleName`、`fingerprint`、`datasourceType`、`severity`、`sortOrder` 等（视网关/Go 实现是否识别）。

**列表行（与 `EventHistory.vue` 对齐）**：

| 列 | 字段 |
|----|------|
| 规则 | **`ruleName`**（勿用 `title` 当规则名） |
| 数据源 | **`datasourceName`**（空则回退 `datasourceType` / `datasourceId`） |
| 首次触发 | **`firstTriggerTime`**（Unix 秒，优先于 `first_trigger_time`） |

---

### 3.3 认领（处理）`POST /api/w8t/event/process`

**Body（JSON）**：在 `fault_*` / `event_ids` / `fingerprints` 双写基础上，前端默认还带 **`action: "claim"`**、**`event_id` / `eventId`**（等于指纹），以匹配 **Java SysWatch** 认领补全逻辑（须带 JWT）。可选 **`patch`** 浅合并。

```json
{
  "fault_center_id": "<故障中心 ID>",
  "faultCenterId": "<同上>",
  "event_ids": ["<fingerprint>"],
  "fingerprints": ["<同上>"],
  "event_id": "<fingerprint>",
  "eventId": "<同上>",
  "action": "claim"
}
```

语义：对 Redis 中该指纹的活跃事件认领；列表展示字段见 §3.1（`confirmState`、`duty_user_name` 等）。

---

### 3.4 删除活跃事件 `POST /api/w8t/event/delete`

**Body**：与 `process` 相同结构（`fault_center_id` + `event_ids` 及驼峰镜像）。

语义：从 Redis 移除该活跃事件（非删历史表）。

---

### 3.5 评论列表 `GET /api/w8t/event/listComments`

**Query**：前端会传 `tenantId`（若本地有）、`fingerprint` / `event_id`（双写同值）、以及 `faultCenterId` / `fault_center_id`（打开评论弹窗时带当前行故障中心）。

---

### 3.6 发表评论 `POST /api/w8t/event/addComment`

**Body（JSON，前端发送）**：

```json
{
  "fault_center_id": "<故障中心 ID>",
  "faultCenterId": "<同上>",
  "fingerprint": "<fingerprint>",
  "event_id": "<同上>",
  "event_ids": ["<同上>"],
  "content": "<评论正文>"
}
```

---

### 3.7 删除评论 `POST /api/w8t/event/deleteComment`

**Body**：`{ "commentId": "<id>" }`（camelCase；若 Java 用 `comment_id` 需自行做别名或映射）。

---

## 4. 静默 `silence`

路径与 WatchAlert 一致（前端 `src/api/w8tAlert.js`）：

| 方法 | Path |
|------|------|
| GET | `/api/w8t/silence/silenceList` |
| POST | `/api/w8t/silence/silenceCreate` |
| POST | `/api/w8t/silence/silenceUpdate` |
| POST | `/api/w8t/silence/silenceDelete` |

请求体以 **camelCase** 为主（与表单页一致）；Java 实现请以现网 WatchAlert 或抓包为准对齐字段。

---

## 5. 故障中心 `faultCenter`

与前端 `src/api/faultcenter.js` 一致（RBAC 的 API 路径需配 **完整 Path**）：

| 方法 | Path |
|------|------|
| GET | `/api/w8t/faultCenter/faultCenterList` |
| GET | `/api/w8t/faultCenter/faultCenterSearch` |
| POST | `/api/w8t/faultCenter/faultCenterCreate` |
| POST | `/api/w8t/faultCenter/faultCenterUpdate` |
| POST | `/api/w8t/faultCenter/faultCenterDelete` |
| POST | `/api/w8t/faultCenter/faultCenterReset` |
| GET | `/api/w8t/faultCenter/slo` |

详情页通知配置等字段见产品需求与 [`fault-center-backend.md`](./fault-center-backend.md)。

---

## 6. 权限与中间件（生产建议）

Go 版对部分接口未挂 `Permission`；Java 网关建议在 **路径级** 补齐鉴权与审计，至少覆盖：`rule/import`、`ruleChangeStatus`、`rule/change`、`event/process`、`event/curEvent`、`event/hisEvent` 等（详见 [`alert-management-backend-plan.md`](./alert-management-backend-plan.md) §5–6）。

---

## 7. 前端源码索引（联调时对照）

| 模块 | 文件 |
|------|------|
| 事件 / 静默 / 规则 API | `src/api/w8tAlert.js` |
| 故障中心 API | `src/api/faultcenter.js` |
| 活跃告警页 | `src/views/alert-mgmt/EventCurrent.vue` |
| 历史告警页 | `src/views/alert-mgmt/EventHistory.vue` |
