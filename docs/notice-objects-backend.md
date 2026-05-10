# 通知对象（Notice Object）— 后端实现与 SysWatch 前端对齐说明

本文档描述 **通知对象** 模块与当前仓库 Vue 前端的 **HTTP/JSON 契约**，供 Java / Go 等服务实现或迁移时对照。路径与信封约定与 **故障中心 / 值班中心** 一致：业务前缀 **`/api/w8t`**，统一响应 **`{ code, data, msg }`**。

---

## 1. 统一约定

### 1.1 响应信封

前端通过 `unwrapW8t` 解析（见 `src/api/faultcenter.js`）：

- 成功：`code === 200` 或 `code === 0`，业务数据在 **`data`**。
- 失败：其它 `code`，错误信息优先取 **`msg`** / **`message`**。

**列表接口特例：**

- **`noticeList`**：当前前端 **`data` 必须为数组**（`Array.isArray(data)`，否则列表为空）；与 `dutyManageList` 等「数组或 `{ list }` 二选一」的兼容逻辑不同。若后端只能返回 `{ list }`，需先改 `noticeList` 的解析逻辑再对接。
- **`noticeRecordList`**：`data` 为分页对象，见第 5 节。

### 1.2 租户与鉴权

与 WatchAlert 一致：租户 ID 建议由网关或中间件注入。创建时前端可能传 **`tenantId: "default"`**；更新时可能带 **`tenantId`**（可为占位），**后端应以租户上下文为准覆盖**。  
更新时前端还会传 **`updateBy: "current_user"`**（占位字符串），**建议后端用真实登录用户覆盖**。

### 1.3 RBAC（与 Go Permission 中间件对齐）

JWT 权限为 **`"METHOD 完整path"`** 字符串集合；前端匹配逻辑见 `src/composables/useNoticePerm.js`、`src/constants/noticeApiPaths.js`。

| 能力 | Method | Path | 说明 |
|------|--------|------|------|
| 列表 | GET | `/api/w8t/notice/noticeList` | 需权限 |
| 创建 | POST | `/api/w8t/notice/noticeCreate` | 需权限 |
| 更新 | POST | `/api/w8t/notice/noticeUpdate` | 需权限 |
| 删除 | POST | `/api/w8t/notice/noticeDelete` | 需权限 |
| 通知记录列表 | GET | `/api/w8t/notice/noticeRecordList` | 需权限 |
| 通知统计 | GET | `/api/w8t/notice/noticeRecordMetric` | **无** Path 权限，登录即可（与 Go 一致） |
| 测试发送 | POST | `/api/w8t/notice/noticeTest` | **无** Path 权限，登录即可 |

---

## 2. 资源路径一览

基础路径：**`/api/w8t/notice`**。  
写接口：**`Content-Type: application/json`**，**POST**。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/notice/noticeList` | 通知对象列表 |
| POST | `/notice/noticeCreate` | 创建 |
| POST | `/notice/noticeUpdate` | 更新 |
| POST | `/notice/noticeDelete` | 删除 |
| GET | `/notice/noticeRecordList` | 通知发送记录（分页） |
| GET | `/notice/noticeRecordMetric` | 近 7 日按等级统计 |
| POST | `/notice/noticeTest` | 按渠道试发 |

---

## 3. 通知对象实体与路由（routes）

### 3.1 列表项字段（`noticeList` 返回的每条）

前端展示与编辑回显使用的字段（见 `NoticeObjectsPage.vue`、`NoticeList.vue`、`noticeObjectFormUtils.js`）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `uuid` | string | 业务主键；删除、更新、记录筛选均依赖 |
| `name` | string | 名称；前端会去掉空格后提交 |
| `dutyId` | string \| null | 关联值班表；可为 **逗号分隔** 多 ID（列表用 `split(',')` 展示多个值班表名）；空表示未绑定 |
| `routes` | array | 通知路由策略列表，见 3.2；旧数据可能无 `routes` 而在顶层平铺单条路由字段，前端会归一（见 `rowToRoutes`） |
| `updateAt` | number | 建议 **Unix 秒**；若用毫秒，前端对 `>= 1e12` 会按毫秒解析（与值班中心一致） |
| `updateBy` | string | 操作人展示名 |
| `tenantId` | string | 可选 |
| `id` | string | 可选；与 `uuid` 二选一时列表 `key` 会兜底 |

**兼容旧结构（无 `routes` 数组时）**：单条路由可能平铺在对象顶层，包括 `noticeType`、`noticeTmplId`、`severitys`、`hook`、`sign`、`subject`、`to`、`cc`、`email`（对象，含 `subject`/`to`/`cc`）、`effectiveTime` 等；前端 `normalizeRoute` 会合并 `email` 与顶层字段。

### 3.2 路由项 `Route`（创建/更新 body 内 `routes[]`）

前端提交结构见 `NoticeObjectFormDrawer.vue` 中 `buildRoutesPayload()`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `noticeType` | string | `FeiShu` \| `Email` \| `DingDing` \| `WeChat` \| `Slack` \| `WebHook`（见 `src/views/notice-objects/noticeTypes.js`） |
| `severitys` | string[] | 至少一项；取值为 **`P0` / `P1` / `P2`** |
| `hook` | string | 非 Email 时一般为 WebHook URL；**前端校验**以 `http://` 或 `https://` 开头 |
| `sign` | string | 飞书/钉钉等可选签名密钥 |
| `subject` | string | Email 主题 |
| `to` | string[] | Email 收件人邮箱列表 |
| `cc` | string[] | Email 抄送 |
| `noticeTmplId` | string | **除 `WebHook` 外** 必填；关联通知模板 ID（与 `noticeTemplate` 模块一致） |
| `effectiveTime` | object | 生效时间窗口，见下表 |

**`effectiveTime`：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `week` | string[] | 星期；取值为 **`Monday` … `Sunday`**（英文枚举，见 `src/utils/noticeTime.js`）。**空数组表示全天候** |
| `startTime` | number | 当日开始：**从 0 点起的秒数**（`hour * 3600 + minute * 60`） |
| `endTime` | number | 当日结束：同上 |

前端默认时间控件为 `00:00`，对应 `0`。跨午夜策略由后端定义（前端仅传当日秒数）。

### 3.3 列表查询 `GET noticeList`

**Query（可选）：**

| 参数 | 说明 |
|------|------|
| `query` | 关键词（名称等），见通知中心列表与「通知对象」页搜索 |
| `noticeTmplId` | 按模板 ID 过滤（见 `NoticeList.vue`） |

**响应 `data`：** **`NoticeObject[]` 数组**（见上文列表接口特例）。

---

## 4. 写操作

### 4.1 创建 `POST noticeCreate`

**Body（前端实际发送）：**

```json
{
  "tenantId": "default",
  "name": "通知对象名称",
  "dutyId": "duty表ID或null",
  "routes": [ /* Route[], 见 3.2 */ ]
}
```

- `name`：必填，无空格（前端已 strip）。
- `dutyId`：可选；未选时前端传 **`null`**。
- `routes`：至少一条策略；每条校验规则见前端 `validate()`。

### 4.2 更新 `POST noticeUpdate`

**Body：**

```json
{
  "uuid": "对象uuid",
  "tenantId": "default或来自记录",
  "updateBy": "current_user",
  "name": "名称",
  "dutyId": "dutyId或null",
  "routes": [ /* Route[] */ ]
}
```

### 4.3 删除 `POST noticeDelete`

**Body：**

```json
{
  "uuid": "对象uuid",
  "name": "名称"
}
```

前端文案提示：若已被告警规则绑定可能删除失败。

### 4.4 测试发送 `POST noticeTest`

**Body（与 `src/api/notice.js` 注释一致）：**

```json
{
  "noticeType": "FeiShu",
  "hook": "https://...",
  "sign": "",
  "email": {
    "subject": "主题",
    "to": ["a@b.com"],
    "cc": []
  }
}
```

- 不持久化通知对象，仅用于抽屉内「通知测试」。
- Email 类型时主要使用 `email`；其它类型使用 `hook`/`sign`。

---

## 5. 通知记录 `GET noticeRecordList`

**Query：**

| 参数 | 说明 |
|------|------|
| `eventId` | 事件 ID |
| `severity` | 等级 |
| `status` | 状态（前端：`0` 展示为成功，非 `0` 为失败） |
| `uuid` | 通知对象 uuid；内嵌记录抽屉会固定传当前对象 |
| `query` | 关键词 |
| `index` | 页码（从 1 开始，与前端一致） |
| `size` | 每页条数 |

**响应 `data`（前端读取方式见 `NoticeRecords.vue`）：**

```json
{
  "list": [ /* 见下表 */ ],
  "total": 100,
  "index": 1,
  "size": 20
}
```

**单条记录建议字段：**

| 字段 | 说明 |
|------|------|
| `eventId` | 事件 ID |
| `createAt` | 时间戳；前端兼容秒或毫秒 |
| `ruleName` | 规则名 |
| `nType` | 渠道类型（与 `noticeType` 展示一致） |
| `nObj` | 通知对象标识（常为 uuid 或名称） |
| `severity` | P0/P1/P2 |
| `status` | 数值；**0 成功** |
| `alarmMsg` | 告警摘要 |
| `errMsg` | 失败时的错误信息 |

---

## 6. 通知统计 `GET noticeRecordMetric`

**无 Query。**  
**响应 `data`（前端 `NoticeMetrics.vue`）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `date` | string[] | 横轴日期标签 |
| `series` | object | `p0` / `p1` / `p2` 为与 `date` 等长的 **数值数组**（近 7 日按等级发送条数） |

---

## 7. 关联：通知模板（节选）

路由中的 `noticeTmplId` 对应 **通知模板** 模块，前缀 **`/api/w8t/noticeTemplate`**，例如：

- `GET /noticeTemplate/noticeTemplateList`（支持按 `noticeType` 筛选，见 `getNoticeTmplList`）

完整路径见 `src/constants/noticeApiPaths.js` 中 `NOTICE_TMPL_API`。

---

## 8. 前端参考文件

| 说明 | 路径 |
|------|------|
| HTTP 封装 | `src/api/notice.js` |
| Path / RBAC | `src/constants/noticeApiPaths.js` |
| 权限组合函数 | `src/composables/useNoticePerm.js` |
| 列表与抽屉 | `src/views/notice-objects/NoticeObjectsPage.vue`、`NoticeObjectFormDrawer.vue` |
| 路由归一化 | `src/views/notice-objects/noticeObjectFormUtils.js` |
| 通知类型枚举 | `src/views/notice-objects/noticeTypes.js` |
| 记录与统计页 | `src/views/notice/NoticeRecords.vue`、`NoticeMetrics.vue` |
