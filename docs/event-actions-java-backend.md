# 活跃告警 — 评论 / 认领 / 删除（Java 后端对接）

本文档**仅**描述「活跃告警」页上的 **评论**、**认领**、**删除** 四条接口，与前端 `src/api/w8tAlert.js`、`EventCurrent.vue` 实际请求一致。  
完整 `/api/w8t` 说明见 [`w8t-java-backend.md`](./w8t-java-backend.md)。

**Java SysWatch 认领（JWT、`action: "claim"`、Redis 字段）** 详见 **[`event-claim-java-syswatch.md`](./event-claim-java-syswatch.md)**；**活跃 / 历史列表列与 JSON 键对齐** 见 **[`w8t-event-claim-list-alignment.md`](./w8t-event-claim-list-alignment.md)**。

---

## 1. 通用约定

| 项 | 说明 |
|----|------|
| 前缀 | `/api/w8t` |
| 鉴权 | `Authorization: Bearer <token>` |
| 租户 | 可选请求头 `TenantID`（与前端 `http.js` 一致） |
| 响应 | `{ "code": 200 或 0, "data": ..., "msg": "..." }`；失败时读 `msg` |

---

## 2. 字段命名（必读）

前端对 **POST body** 与 **部分 GET query** 采用 **camelCase + snake_case 双写**（同一值），便于对接 WatchAlert（Go）与 Java（snake_case）：

| 语义 | camelCase | snake_case |
|------|-----------|------------|
| 故障中心 ID | `faultCenterId` | `fault_center_id` |
| 一批事件指纹 | `fingerprints` | `event_ids`（字符串数组，元素即 fingerprint） |
| 单条指纹 | `fingerprint` | `event_id`（与 fingerprint 同值） |

Java 建议：`@JsonAlias` 同时接收两套键名，或网关统一映射；**勿只绑定一种却校验另一种为「必填」**。

---

## 3. 认领

**`POST /api/w8t/event/process`**

**Content-Type**: `application/json`

**鉴权**：须带 **`Authorization: Bearer <JWT>`**；Java SysWatch 在认领意图下用 JWT 补全认领人；匿名则往往只合并字段、**无**展示名。

**Body**（与前端 `payloadEventProcess` 一致）：

| 字段 | 说明 |
|------|------|
| `faultCenterId` / `fault_center_id` | 双写 |
| `fingerprints` / `event_ids` | 数组；单条认领长度 1 |
| `eventId` / `event_id` | 与指纹一致；前端由首元素自动双写 |
| **`action`** | 默认 **`"claim"`**（Java：无 `patch` 时依赖此字段才会走认领补全） |
| `patch` | 可选，浅合并进事件 JSON |

**示例**：

```json
{
  "fault_center_id": "fc-xxx",
  "faultCenterId": "fc-xxx",
  "fingerprints": ["<fingerprint>"],
  "event_ids": ["<fingerprint>"],
  "event_id": "<fingerprint>",
  "eventId": "<fingerprint>",
  "action": "claim"
}
```

**`GET /api/w8t/event/curEvent` 列表**：指纹列用 **`pickEventFingerprint`**（`fingerprint` / `_redisField` / `event_id`）；「首次触发」**优先** `first_trigger_time`（Unix 秒）；「认领」列用 **`pickConfirmDisplay` + `pickClaimUserName`**，副行展示 **`confirm_time` / `confirmTime`**（见 `w8tEventDisplay.js` 与 [`w8t-event-claim-list-alignment.md`](./w8t-event-claim-list-alignment.md)）。若仍无认领人，请核对 Redis JSON 与 JWT。

---

## 4. 删除（活跃事件）

**`POST /api/w8t/event/delete`**

**Body**：与 **认领** 完全相同（`fault_center_id` + `event_ids` 及驼峰镜像）。

**说明**：从 **Redis** 删除该活跃事件实例，**不是**删历史库记录。

---

## 5. 评论

### 5.1 列表

**`GET /api/w8t/event/listComments`**

**Query**（前端实际会带）：

| 参数 | 说明 |
|------|------|
| `tenantId` | 可选，本地有则传 |
| `fingerprint` / `event_id` | 同一指纹，双写 |
| `faultCenterId` / `fault_center_id` | 打开弹窗时带当前行故障中心 |

响应 `data`：数组，或 `{ list / records: [...] }`（以后端为准）。列表项常见：`commentId`/`id`、`username`/`userId`、`content`/`text`。

---

### 5.2 新增

**`POST /api/w8t/event/addComment`**

**Body 示例**：

```json
{
  "fault_center_id": "fc-xxx",
  "faultCenterId": "fc-xxx",
  "fingerprint": "<fingerprint>",
  "event_id": "<fingerprint>",
  "event_ids": ["<fingerprint>"],
  "content": "评论正文"
}
```

---

### 5.3 删除单条评论

**`POST /api/w8t/event/deleteComment`**

**Body**：

```json
{ "commentId": "<评论主键>" }
```

若 Java DTO 仅支持 `comment_id`，请用 `@JsonAlias("commentId")` 或网关映射。

---

## 6. 前端索引

| 能力 | API 封装 | 页面 |
|------|-----------|------|
| 认领 / 删活跃 / 评论 | `src/api/w8tAlert.js` | `src/views/alert-mgmt/EventCurrent.vue` |
