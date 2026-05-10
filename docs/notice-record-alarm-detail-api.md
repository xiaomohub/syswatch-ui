# 通知记录 — 告警详情（与列表 `alarmMsg` 摘要对照）

通知列表接口 `noticeRecordList` 中单条 **`alarmMsg`** 为短摘要；完整事件（规则名、labels、message、聚合信息、投递错误上下文等）体积大，**不放在列表里**。

## 接口

| 方法 | 路径 |
|------|------|
| GET | `/api/w8t/notice/noticeRecordAlarmDetail` |

**Query：**

| 参数 | 必填 | 说明 |
|------|------|------|
| `event_id` / `eventId` | 是 | 与通知记录字段 **`eventId` 相同**（通常为 Redis 指纹，如 `j:rl-...`） |
| `fault_center_id` / `faultCenterId` | 否 | 指定后只查该故障中心 Redis + 该 FC 下历史；**不传**则在租户内依次尝试各 FC 的活跃事件，再按租户+fingerprint 查最近一条历史 |

**Header：** `TenantID`、`Authorization: Bearer <JWT>`（与 `noticeRecordList` 同级 RBAC：`GET /api/w8t/notice/noticeRecordAlarmDetail`）。

## 响应 `data`（`NoticeRecordAlarmDetailVO`）

| 字段 | 说明 |
|------|------|
| `source` | `active`：Redis 活跃事件；`history`：`w8t_his_event` 归档；`unknown`：未找到 |
| `faultCenterId` | 命中的故障中心 ID（尽力填充） |
| `eventId` | 请求中的指纹 |
| `event` | **完整事件对象**（与 `curEvent` 单条结构一致）；`unknown` 时为 null |
| `message` | 仅 `unknown` 时人类可读原因 |
| `historyId` / `historyStatus` / `firstTriggerTime` | 仅 `history` 时有值 |

前端在通知记录行点击「详情」时，用当前行的 **`eventId`**（及可选 **`faultCenterId`**：列表若返回则带上，否则用全局当前故障中心）请求本接口，在抽屉中渲染 `event`（JSON）。

**前端实现：** `src/api/notice.js` 的 `noticeRecordAlarmDetail`、`src/views/notice/NoticeRecords.vue`。
