# 活跃告警「一键静默」— 后端对接说明

本能力**不新增 HTTP 路径**：与「告警静默」管理页相同，调用 **`POST /api/w8t/silence/silenceCreate`**。前端在 **活跃告警**（`EventCurrent.vue`）为每条事件提供 **「静默」**，用快捷时长或 `datetime-local` 自定义起止区间，提交后写入与 WatchAlert 一致的静默策略。

---

## 1. 接口与信封

| 项 | 说明 |
|----|------|
| 方法 / 路径 | `POST /api/w8t/silence/silenceCreate` |
| 鉴权 / 租户 | 与现有静默写操作一致（Auth、Permission、`TenantID` 等，以 Go/Java 网关为准） |
| 响应 | `{ code: 200 \| 0, data, msg }`（`unwrapW8t`） |

前端请求体在 **`faultCenterId` 与 `fault_center_id` 上双写**（与事件接口策略一致），便于 Java 只认 snake_case 的场景。

---

## 2. 请求体（与静默管理页对齐）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 静默名称；前端默认 `静默 · {规则名}`，用户可改 |
| `labels` | array | 是 | 标签匹配条件，元素含 `key`、`value`、`operator` |
| `startsAt` | number | 是 | 开始时间，**Unix 秒** |
| `endsAt` | number | 是 | 结束时间，**Unix 秒**，须 **大于** `startsAt` |
| `faultCenterId` | string | 是 | 故障中心 ID（与 `fault_center_id` 同义） |
| `fault_center_id` | string | 否* | 与上同值；前端会附带 |
| `comment` | string | 否 | 前端会写入 `自活跃告警创建 · fp={fingerprint}` 便于审计 |

`labels[].operator` 与静默表单一致，允许：`==`、`=`、`!=`、`=~`、`!~`。**多条条件为逻辑与（AND）**；匹配语义须与 WatchAlert 静默引擎一致。

**示例：**

```json
{
  "name": "静默 · HighCPU",
  "labels": [
    { "key": "alertname", "value": "HighCPU", "operator": "==" }
  ],
  "startsAt": 1735689600,
  "endsAt": 1735696800,
  "faultCenterId": "fc-demo",
  "fault_center_id": "fc-demo",
  "comment": "自活跃告警创建 · fp=abc123..."
}
```

---

## 3. 前端如何生成 `labels`（联调要点）

1. **优先**使用活跃事件对象上的 **`labels`**：若为对象，则对每个键值生成 `operator: "=="` 的匹配项；值为非字符串时转为字符串。若 `labels` 为 JSON 字符串，前端会先 `JSON.parse`。
2. **若无可用 labels**：用规则名生成一条 **`alertname == {rule_name}`**（兼容字段 `ruleName`）。这与 Prometheus 风格告警命名常见约定一致。
3. **若规则名也为空**：前端不自动填有效条件，操作员须在弹窗内**手工填写**键值；后端应返回可读错误（如「至少一条 matcher」）。

**建议后端在 `GET /api/w8t/event/curEvent` 列表项中返回 `labels` 对象**（与 Redis 中事件 / 通知评估使用的标签一致），这样「一键静默」与真实告警匹配最稳；仅依赖 `alertname` 可能在多规则重名或别名场景下偏宽或偏窄。

---

## 4. 时间与产品行为

- **快捷时长**：前端将「当前时刻」设为 `startsAt`，将「当前 + N 小时」设为 `endsAt`（N ∈ {1,2,4,8,12,24,48,72,168}）。
- **自定义**：用户通过浏览器 **`datetime-local`** 修改 `startsAt` / `endsAt`，适合跨天、长周期维护窗；**无时区选择器**，为浏览器本地时区；后端以 Unix 秒存储，注意与租户/业务时区解释一致。

静默生效后，**通知链路抑制**等行为与手动创建的静默相同；**不会**自动删除 Redis 活跃事件（与「删除事件」独立）。

---

## 5. 权限与审计

- 建议与 **`silenceCreate`** 其它入口相同：**写权限 + 审计日志**（操作者、故障中心、`name`、`labels` 摘要、时间窗、`comment`）。
- 若网关对静默接口按 Path 授权，路径仍为 **`POST /api/w8t/silence/silenceCreate`**。

---

## 6. 前端索引

| 说明 | 路径 |
|------|------|
| 活跃告警页 | `src/views/alert-mgmt/EventCurrent.vue` |
| 标签推导 | `src/views/alert-mgmt/silenceUtils.js` → `eventRowToSilenceLabelRows` |
| API | `src/api/w8tAlert.js` → `silenceCreate`（含 `fault_center_id` 双写） |
| 静默 CRUD 参考 | `src/views/alert-mgmt/SilenceList.vue`、`SilenceForm.vue` |

总览与检查单仍见 [`alert-management-backend-plan.md`](./alert-management-backend-plan.md) §4.4；Java 命名约定见 [`w8t-java-backend.md`](./w8t-java-backend.md) §4。
