# 活跃 / 历史告警列表与认领字段对齐（前端绑定）

本文与 **`src/utils/w8tEventDisplay.js`**、`EventCurrent.vue`、`EventHistory.vue` 一致，说明表格列应解析的 **JSON 键**，便于 Java SysWatch 与 WatchAlert（Go）混跑时 Redis / 库表字段对齐。

**认领请求体**（`POST /api/w8t/event/process`）见 **[`event-claim-java-syswatch.md`](./event-claim-java-syswatch.md)**。

---

## 1. 活跃告警 `GET /api/w8t/event/curEvent`

| 列 | 前端解析 |
|----|-----------|
| 指纹 | `pickEventFingerprint`：`fingerprint` → `_redisField` → `event_id` / `eventId`（与 Redis field / process 入参一致） |
| 规则 | `rule_name` / `ruleName` |
| 首次触发 | `pickFirstTriggerTime`：**优先** `first_trigger_time`（Unix 秒），再 `firstTriggerTime` / `FirstTriggerTime` 等 |
| 认领（人） | `pickConfirmDisplay`：`confirmState === 1` 或嵌套 `confirmState`；认领人见 `pickClaimUserName` |
| 认领（时间） | `formatConfirmTimeCell`：`confirm_time`（Unix 秒）或 `confirmTime` / `ConfirmTime`（字符串） |

认领、删除、评论、静默等写操作均以 **`pickEventFingerprint(row)`** 作为指纹，与 **`fingerprints` / `event_ids` / `event_id`** 对齐。

---

## 2. 历史告警 `GET /api/w8t/event/hisEvent`

| 列 | 前端解析 |
|----|-----------|
| 指纹 | 同 `pickEventFingerprint` |
| 规则 | `pickHisEventRuleName`：`ruleName` / `rule_name` |
| 首次触发 | 同 `pickFirstTriggerTime` |
| 恢复时间 | `pickRecoverTime`：`recoverTime`、`recover_time`、`endsAt` 等 |
| 认领人 | `formatHisEventClaimCell`：先 `pickClaimUserName`，再 `pickConfirmDisplay` |
| 认领时间 | 同 `formatConfirmTimeCell` |

**说明**：`process` **只更新 Redis 活跃事件**；历史行是否含认领字段取决于**归档落库**时是否拷贝上述键。若历史列表认领为空，属存储策略问题，而非活跃列表解析错误。

---

## 3. 认领人顶层键（`pickClaimUserName`）

按顺序尝试：`duty_user_name`、`DutyUserName`、`dutyUserName`、`claimUser`、`claim_user`、`confirmUser`、`ConfirmUser`、`confirm_user`、`confirmUsername`、`confirm_username`、`confirmedBy`、`confirmed_by`、`processor`。

---

## 4. 与 Java 文档的关系

| 文档 | 内容 |
|------|------|
| [`event-claim-java-syswatch.md`](./event-claim-java-syswatch.md) | `event/process`  body、JWT、`action: "claim"`、常见故障 |
| [`event-actions-java-backend.md`](./event-actions-java-backend.md) | 评论 / 认领 / 删除与前端封装索引 |
| [`w8t-java-backend.md`](./w8t-java-backend.md) | `/api/w8t` 总览 |
