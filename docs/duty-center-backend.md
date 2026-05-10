# 值班中心（Duty Center）— 后端实现与 SysWatch 前端对齐说明

本文档描述 **值班中心** 模块与当前仓库 Vue 前端的 **HTTP/JSON 契约**，供 Java / Go 等服务实现或迁移时对照。路径与信封约定与 **故障中心** 一致：业务前缀 **`/api/w8t`**，统一响应 **`{ code, data, msg }`**。

---

## 1. 统一约定

### 1.1 响应信封

前端通过 `unwrapW8t` 解析（见 `src/api/faultcenter.js`）：

- 成功：`code === 200` 或 `code === 0`，业务数据在 **`data`**。
- 失败：其它 `code`，错误信息优先取 **`msg`** / **`message`**。

列表类接口：`data` 可为 **数组**，或 **`{ list: [...] }`**；前端对两者均兼容。

### 1.2 租户与鉴权

与 WatchAlert / 故障中心一致：租户 ID 建议由网关或中间件注入（如 Gin Context `TenantID`），**不必**依赖前端在 body 里传 `tenantId`（更新时前端可能带 `tenantId`，可为空字符串，后端可按租户上下文覆盖）。

### 1.3 用户字段命名

前端对用户对象同时兼容：

- `userid` / `userId`
- `username` / `userName`

值班负责人、日历人员均建议返回 **`userid` + `username`**（小写 `userid` 优先，与现有映射一致）。

---

## 2. 值班表管理（dutyManage）

基础路径：**`/api/w8t/dutyManage`**。  
写接口：**`Content-Type: application/json`**，**POST**。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/dutyManage/dutyManageList` | 值班表列表 |
| POST | `/dutyManage/dutyManageCreate` | 创建 |
| POST | `/dutyManage/dutyManageUpdate` | 更新 |
| POST | `/dutyManage/dutyManageDelete` | 删除 |

### 2.1 列表 `GET dutyManageList`

**响应 `data`：** 数组，或 `{ list: DutyManagerRow[] }`。

单条 **`DutyManagerRow`** 建议字段（前端展示与映射见 `src/api/duty.js`）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 主键；可与 `dutyId` 二选一返回，前端会归一为 `id` |
| `dutyId` | string | 与 `id` 等价别名 |
| `name` | string | 展示名；别名 `dutyName` |
| `description` | string | 可选 |
| `manager` | object \| null | 负责人 `{ userid, username }` |
| `curDutyUser` | array | **今日/当前值班**用户列表，元素 `{ userid, username }` |
| `updateAt` | number \| string | 更新时间，Unix **秒** 或毫秒均可（前端对小于 `1e12` 的数值按秒处理） |
| `updateBy` | string | 操作人展示名 |
| `tenantId` | string | 可选 |

### 2.2 创建 `POST dutyManageCreate`

**Body（前端实际发送，见 `DutyFormModal.vue`）：**

```json
{
  "name": "值班表名称",
  "description": "可选，可省略",
  "manager": { "userid": "...", "username": "..." }
}
```

- `name`：前端会去掉空格后提交，必填。
- `manager`：必填；`userid` 为业务主键（前端可能用用户名兜底填在 `userid` 里，后端应以账号体系为准校验）。

**响应：** 成功即可，`data` 可为新建实体或空；前端只关心是否抛错。

### 2.3 更新 `POST dutyManageUpdate`

**Body：**

```json
{
  "id": "值班表ID",
  "tenantId": "可选",
  "name": "...",
  "description": "...",
  "manager": { "userid": "...", "username": "..." }
}
```

- `id`：必填，与列表中的 `id` 一致。

### 2.4 删除 `POST dutyManageDelete`

**Body（见 `DutyManageList.vue`）：**

```json
{
  "id": "值班表ID",
  "name": "可选，展示用"
}
```

- 后端应以 **`id`** 为准删除；`name` 可忽略或用于审计日志。

---

## 3. 值班日历（calendar）

基础路径：**`/api/w8t/calendar`**。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/calendar/calendarSearch` | 按值班表 + 时间范围查询已发布日程 |
| POST | `/calendar/calendarCreate` | 发布日程（前端「发布日程」） |
| POST | `/calendar/calendarUpdate` | 更新日程（**前端暂未调用**，预留） |
| GET | `/calendar/getCalendarUsers` | 按值班表取可选用户（**前端暂未调用**，预留） |

### 3.1 查询 `GET calendarSearch`

**Query：**

| 参数 | 必填 | 说明 |
|------|------|------|
| `dutyId` | 是 | 值班表 ID |
| `time` | 否 | 月份字符串，格式 **`YYYY-M`**（**月份不补零**），例如 `2026-5` 表示 2026 年 5 月 |

前端由 `<input type="month">` 得到 `YYYY-MM`，再转为 `YYYY-M`（见 `src/views/duty/dutyUtils.js` 的 `monthInputToApiParam`）。

**响应 `data`：** 数组，或 `{ list: [...] }`。

单条日程建议形状（前端 `DutyCalendarPage.vue`）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `time` | string \| number | 该条对应的日期/时间；前端用 `new Date(time)` 展示，支持 ISO 字符串或时间戳 |
| `users` | array | 见下 |

**`users` 两种形态（前端均已支持）：**

1. **扁平**：`[{ "userid": "...", "username": "..." }, ...]` — 多人同组同日。
2. **轮值分组**：`[[{...}], [{...}]]` — 外层每组一天一轮；前端展示为「组1：…；组2：…」。

### 3.2 发布 `POST calendarCreate`

**Body（前端 `publish()` 当前发送）：**

```json
{
  "dutyId": "值班表ID",
  "month": "2026-5",
  "dutyPeriod": 1,
  "dateType": "day",
  "userGroup": [
    [{ "userid": "a", "username": "A" }, { "userid": "b", "username": "B" }]
  ],
  "status": "Formal",
  "scheduleMode": "together",
  "selectedDates": ["2026-5-6", "2026-5-7", "2026-5-8"],
  "dutyTime": { "start": "09:00", "end": "18:00" }
}
```

语义说明：

- **`month`**：与查询相同，**`YYYY-M`**。
- **`dutyPeriod`**：前端固定 **`1`**（按日）；若后端支持其它粒度，需与前端约定后再改。
- **`dateType`**：前端固定 **`"day"`**。
- **`status`**：前端固定 **`"Formal"`**（正式）；若存在草稿态，可扩展枚举并与前端联调。
- **`userGroup`**：
  - **同组值班**（`scheduleMode: "together"`）：`userGroup` 为 **一个**元素，内含 **一组**用户，例如 `[ [ u1, u2, u3 ] ]`。
  - **按人轮值**（`scheduleMode: "rotation"`）：每人单独成组，例如 `[ [u1], [u2], [u3] ]`，与 **按日轮流** 的展开规则配合使用（见下）。
- **`scheduleMode`**：`"together"` | `"rotation"`，与 `userGroup` 形状一致；后端可用于校验或审计。
- **`selectedDates`**：**必填（前端已校验）**。字符串数组，**本地日历日** **`YYYY-M-D`**（**月、日不补零**），且应落在 `month` 对应自然月内。仅对这些日期生成/更新排班记录。
- **`dutyTime`**：**可选但建议持久化**。`start` / `end` 为 **`HH:mm`**（24 小时制，前端补零为两位）。表示每个值班日的班次起止（**默认按自然日、不跨午夜**；若需跨午夜需另扩字段或约定 `end` 为次日）。

前端限制：**至少 1 名**值班人员（人数上限由后端校验）；**结束时间须晚于开始时间**；后端应再次校验 `selectedDates` 非空、日期合法、与 `month` 一致。

#### 后端展开建议（实现要点）

1. **解析 `month` + `selectedDates`**  
   将每条 `selectedDates[i]` 解析为年月日，过滤掉与 `month` 不一致的项，排序后去重。

2. **同组 `together`**  
   对每个选中日 `d`，写入一条（或等价结构）排班：**当日值班人员 = `userGroup[0]` 整组**；若需存时间，将 `dutyTime.start` / `dutyTime.end` 与租户时区组合为当日时间戳或 `time` 字段（见查询返回）。

3. **轮值 `rotation`**  
   设 `groups = userGroup`（形如 `[ [u1], [u2], [u3] ]`），长度为 `n`，选中日排序后为 `D[0..k-1]`。  
   **推荐语义：** 第 `i` 个选中日由 `groups[i % n]` 值班（与旧版「按日轮流」一致）。  
   若产品希望「每人连续值若干天再换下一人」，可另加 `rotationSpan` 等字段，当前前端不传。

4. **与旧客户端兼容**  
   若历史请求**没有** `selectedDates`，后端可回退为：在 `month` 内按原规则整月生成（例如全月或仅工作日），以便平滑升级；**新前端始终发送 `selectedDates`**。

5. **幂等与覆盖**  
   建议对 `(dutyId, month)` 或 `(dutyId, date)` 做覆盖策略：同一月再次发布时，先删该月由本接口产生的正式排班再插入，或按主键 upsert。

### 3.3 预留接口

- **`calendarUpdate`**：与 `calendarCreate` 类似的 body 即可；待产品需要「改期/改人」时前端再接。
- **`getCalendarUsers`**：Query `dutyId`；返回该表可选用户列表，形状可与 `userList` 一致，便于替换前端的「全员 joinDuty 列表」筛选逻辑。

---

## 4. 关联：用户列表

值班表单与发布页选人使用 **`GET /api/w8t/user/userList`**，Query：**`joinDuty=true`**（字符串，见 `src/api/user.js`）。

后端应只返回 **可参与值班** 的用户；字段至少包含 `userid`、`username`（或 `userName`），以便与 `manager`、`userGroup` 对齐。

---

## 5. 前端路由（便于联调）

- 列表：`/dutyManage`（name: `DutyManageList`）
- 日历：`/dutyManage/:id`（name: `DutyCalendar`），`id` 为值班表 ID；可选 query `calendarName` 仅用于标题展示。

---

## 6. 自检清单（后端对齐）

1. 所有接口返回 **`{ code: 200|0, data, msg }`**。
2. 列表支持 **`data` 为数组或 `{ list }`**。
3. 值班表字段兼容 **`id`/`dutyId`、`name`/`dutyName`**。
4. 日历月份参数 **`YYYY-M`**（如 `2026-5`），与前端 `monthInputToApiParam` 一致。
5. `calendarSearch` 返回的 `users` 支持 **扁平**与 **分组**两种结构。
6. `calendarCreate` 的 **`userGroup`** 与 **`status: Formal`**、**`dateType: day`**、**`dutyPeriod: 1`** 语义与实现一致。
7. **`selectedDates`** 与 **`dutyTime`** 与 `DutyCalendarPage.vue` 的 `publish()` 一致；旧客户端未传 `selectedDates` 时定义兼容回退策略。

---

## 7. 代码索引（本仓库）

| 用途 | 路径 |
|------|------|
| API 封装 | `src/api/duty.js` |
| 列表/删除页 | `src/views/duty/DutyManageList.vue` |
| 创建/编辑表单 | `src/views/duty/DutyFormModal.vue` |
| 日历与发布 | `src/views/duty/DutyCalendarPage.vue` |
| 月份参数 | `src/views/duty/dutyUtils.js` |
| 响应解包 | `src/api/faultcenter.js`（`W8T_BASE`、`unwrapW8t`） |
