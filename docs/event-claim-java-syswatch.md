# 活跃告警「认领」— 前端对接说明（Java SysWatch）

本文说明如何调用 **`POST /api/w8t/event/process`**，使认领结果写入 **Redis 活跃事件**（与 `GET /api/w8t/event/curEvent` 列表同源）。适用于与 WatchAlert（Go）共用接口形态的前端。

**存储与活跃/历史列表列对齐**（认领是否落库、`hisEvent` 与 `curEvent` 字段差异、表格应绑定的键）：见 [w8t-event-claim-list-alignment.md](./w8t-event-claim-list-alignment.md)。

---

## 1. 请求约定

| 项 | 说明 |
|----|------|
| 方法 / 路径 | `POST /api/w8t/event/process` |
| 鉴权 | **必须**带 `Authorization: Bearer <JWT>`，否则服务端无法解析当前用户，认领人字段不会自动补全（见 §4）。 |
| 租户 | 与其它 `/api/w8t/*` 一致，建议带 `TenantID`（与后端/网关约定一致即可）。 |
| Content-Type | `application/json` |

---

## 2. Body 字段（与 Go/Java 双写）

| 语义 | 推荐同时传（或至少传其一） | 说明 |
|------|---------------------------|------|
| 故障中心 | `faultCenterId` **与** `fault_center_id` | 与当前详情页/路由中的故障中心 ID 一致。 |
| 单条事件指纹 | `eventId` / `event_id` | 与 Redis Hash 的 field 一致；通常等于列表行里的 `fingerprint` 或 `_redisField`。 |
| 多条指纹 | `fingerprints` **与** `event_ids` | 数组；与上一行同义，认领单条时传长度为 1 的数组即可。 |
| 合并字段 | `patch` | 任意键值对，**浅合并**进事件 JSON（见 §3）。 |
| 仅认领（推荐） | `action`: `"claim"` | **可无 `patch`**：服务端会写入 `confirmState: 1` 并补全认领人、时间（需 JWT）。 |

**最小认领示例（推荐）**：

```json
{
  "faultCenterId": "fc-a160f268bf1b",
  "fault_center_id": "fc-a160f268bf1b",
  "fingerprints": ["j:rl-641ab7114474:27c637052972570d"],
  "event_ids": ["j:rl-641ab7114474:27c637052972570d"],
  "action": "claim"
}
```

**等价写法**（不用 `action`，自行带 patch）：

```json
{
  "faultCenterId": "fc-a160f268bf1b",
  "fault_center_id": "fc-a160f268bf1b",
  "event_id": "j:rl-641ab7114474:27c637052972570d",
  "patch": {
    "confirmState": 1
  }
}
```

`confirmState` 也支持：`confirm_state`、`ConfirmState`；或使用 `claim: true`、`operation: "claim"` 等（见后端 `isClaimIntent` 逻辑）。

---

## 3. 写入 Redis 后列表应读哪些字段？

`process` 使用 **浅合并**：`patch` 里的顶层键直接 `putAll` 到事件对象上（无嵌套归一化）。

认领成功后，在 **已登录 JWT** 且触发认领意图时，Java 会尽量补全以下 **顶层字符串**（仅当对应键尚空时写入），便于表格绑定：

| 键名 | 说明 |
|------|------|
| `duty_user_name` / `DutyUserName` | 认领人展示名（来自 JWT 用户名） |
| `claimUser` / `claim_user` | 同上（多键兼容） |
| `confirm_user` / `ConfirmUser` | 同上 |
| `confirm_time` | Unix 秒（数字） |
| `confirmTime` | 北京时间字符串 `yyyy-MM-dd HH:mm:ss` |

列表「首次触发」建议绑定：

- 数字：`first_trigger_time`（Unix 秒）
- 字符串：`firstTriggerTime` / `FirstTriggerTime`（北京时间）

（若仍为空，需确认规则评估是否已写入事件；旧数据需等下一轮评估刷新 JSON。）

---

## 4. 常见「认领了但前端不显示」原因

1. **未带 JWT**  
   匿名用户下 `confirmState` 等仍会合并，但 **不会**自动填认领人相关字段。

2. **`patch` 为空且未传 `action: "claim"`**  
   服务端认为无需认领补全，事件 JSON 不变。

3. **表格列绑定的字段名与 Redis 不一致**  
   请与上表对齐，或在 `patch` 里自行写入你们 UI 已绑定的字段名（例如某版本只用 `processor`）。

4. **指纹或故障中心与列表行不一致**  
   `event_id` / `fingerprints` 必须与 `curEvent` 该行对应 Redis field **完全一致**（含前缀 `j:rl-...`）。

5. **误用历史接口**  
   认领只改 **活跃事件**（Redis）；历史库 `hisEvent` 不会随 `process` 更新。

---

## 5. 响应与刷新

- 成功：信封内 `data` 为 **合并后的事件对象**（Map，即 Redis 中该条的 JSON）。
- 前端应在成功后 **重新请求** `curEvent`（或依赖你们现有轮询）刷新列表。

---

## 6. cURL 示例

```bash
curl -sS -X POST 'http://localhost:8080/api/w8t/event/process' \
  -H 'Authorization: Bearer <JWT>' \
  -H 'TenantID: default' \
  -H 'Content-Type: application/json' \
  -d '{
    "fault_center_id": "fc-a160f268bf1b",
    "faultCenterId": "fc-a160f268bf1b",
    "fingerprints": ["j:rl-641ab7114474:27c637052972570d"],
    "event_ids": ["j:rl-641ab7114474:27c637052972570d"],
    "action": "claim"
  }'
```

---

## 7. 与评论、删除的差异

| 操作 | 路径 | 要点 |
|------|------|------|
| 认领 | `POST .../event/process` | 改 Redis 事件 JSON |
| 评论 | `POST .../event/addComment` | 落库，需 `fingerprint` / `event_id` / `event_key` 等与指纹对齐 |
| 删除活跃 | `POST .../event/delete` | 从 Redis 删除 field |

更全的 `/api/w8t` 契约见项目内其它 WatchAlert 对接文档（若已引入）。
