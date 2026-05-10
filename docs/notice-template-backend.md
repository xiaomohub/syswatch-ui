# 通知模版（Notice Template）— 后端实现与 SysWatch 前端对齐说明

本文档描述 **通知模版** 模块与当前仓库 Vue 前端的 **HTTP/JSON 契约**，供 Java / Go 等 WatchAlert 侧服务实现或对照。约定与 **值班中心 / 故障中心** 一致：业务前缀 **`/api/w8t`**，统一响应 **`{ code, data, msg }`**。

---

## 1. 统一约定

### 1.1 响应信封

前端通过 `unwrapW8t` 解析（见 `src/api/faultcenter.js`）：

- 成功：`code === 200` 或 `code === 0`，业务数据在 **`data`**。
- 失败：其它 `code`，错误信息优先取 **`msg`** / **`message`**。

列表类接口：`data` 可为 **数组**，或 **`{ list: [...] }`**；前端对两者均兼容（见 `src/api/noticeTmpl.js`）。

### 1.2 租户与鉴权

与 WatchAlert 其它模块一致：请求头携带 **`Authorization: Bearer <token>`**，租户建议由 **`TenantID`** 头或网关注入；列表与 CRUD 均应 **按租户隔离**。

### 1.3 权限（RBAC）

前端权限码为 **`METHOD` + 空格 + 完整 path**（与 `src/constants/noticeApiPaths.js` 中 `NOTICE_TMPL_API` 一致），JWT / 登录响应需下发对应字符串，否则在关闭 `RBAC_RELAX_ALL` 时按钮不可用。

| 能力 | Method | Path |
|------|--------|------|
| 列表 | `GET` | `/api/w8t/noticeTemplate/noticeTemplateList` |
| 创建 | `POST` | `/api/w8t/noticeTemplate/noticeTemplateCreate` |
| 更新 | `POST` | `/api/w8t/noticeTemplate/noticeTemplateUpdate` |
| 删除 | `POST` | `/api/w8t/noticeTemplate/noticeTemplateDelete` |

示例权限串：`GET /api/w8t/noticeTemplate/noticeTemplateList`、`POST /api/w8t/noticeTemplate/noticeTemplateCreate` 等。

### 1.4 与「通知对象」的关系

- 通知对象每条路由可选 **通知模版**，下拉数据来自 **`GET noticeTemplateList`**，常带查询参数 **`noticeType`**，与路由上的通知类型一致（见 `NoticeObjectFormDrawer.vue`）。
- 前端对 **WebHook** 路由 **不展示** 模版选择，但模版类型枚举本身仍只有五类（飞书 / 邮件 / 钉钉 / 企微 / Slack），**不包含 WebHook 模版**。
- 通知对象侧保存的是模版主键（如 **`noticeTmplId`**），应对齐列表项中的 **`id`**（或后端统一为 `uuid`，前端列表与更新兼容 `id` / `uuid` 两种字段名）。

---

## 2. 接口一览

基础路径：**`/api/w8t/noticeTemplate`**。  
写接口：**`Content-Type: application/json`**，**POST**。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/noticeTemplate/noticeTemplateList` | 模版列表（支持关键字、按类型过滤） |
| POST | `/noticeTemplate/noticeTemplateCreate` | 创建 |
| POST | `/noticeTemplate/noticeTemplateUpdate` | 更新 |
| POST | `/noticeTemplate/noticeTemplateDelete` | 删除 |

---

## 3. 列表 `GET /noticeTemplate/noticeTemplateList`

### 3.1 Query 参数（均为可选）

| 参数 | 说明 |
|------|------|
| `query` | 关键字搜索（名称 / 描述等，由后端定义匹配字段） |
| `noticeType` | 按模版类型过滤，取值见 §5；**通知对象**拉下拉时只传该参数、不传 `query` 的情况也存在 |

无参调用表示拉取当前租户下全量（或后端默认分页策略；若后端分页，需与前端约定，当前前端假定返回全量在 `data` 数组或 `data.list` 中）。

### 3.2 响应 `data`：数组或 `{ list: NoticeTemplateRow[] }`

建议单条 **`NoticeTemplateRow`** 字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 主键（**推荐**）；与 `uuid` 二选一时优先 `id` |
| `uuid` | string | 与 `id` 等价别名（可选） |
| `name` | string | 模版名称；**创建后不建议修改**（前端更新页名称禁用，但仍会把原名称放在 body 里） |
| `description` | string | 可选 |
| `noticeType` | string | 见 §5 |
| `template` | string | 普通模版正文（非飞书高级卡片、或非飞书类型时使用） |
| `templateFiring` | string | 飞书高级卡片：**告警触发** 时内容 |
| `templateRecover` | string | 飞书高级卡片：**恢复** 时内容 |
| `enableFeiShuJsonCard` | boolean | 是否启用飞书 JSON 卡片双模版 |
| `updateAt` | number | 更新时间，建议 **Unix 秒**（前端按秒 `* 1000` 展示） |
| `updateBy` | string | 操作人展示名；缺省时前端显示「未知用户」 |

后端应保证：当 `enableFeiShuJsonCard === true` 且 `noticeType === FeiShu` 时，发送通道使用 **`templateFiring` / `templateRecover`**；否则使用 **`template`**。

---

## 4. 创建 `POST /noticeTemplate/noticeTemplateCreate`

### 4.1 Body（前端实际发送，见 `NoticeTemplateFormDrawer.vue`）

**情形 A：飞书 + 高级消息卡片**

```json
{
  "name": "feishu-card",
  "description": "",
  "noticeType": "FeiShu",
  "enableFeiShuJsonCard": true,
  "templateFiring": "{ ... JSON 卡片 ... }",
  "templateRecover": "{ ... JSON 卡片 ... }"
}
```

**情形 B：飞书普通 / 其它类型（单模版）**

```json
{
  "name": "email-basic",
  "description": "可选",
  "noticeType": "Email",
  "enableFeiShuJsonCard": false,
  "template": "正文或 Go template 等"
}
```

字段说明：

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | 是 | 前端会去掉空格后提交；**不要**包含空格 |
| `description` | 否 | 可为空字符串 |
| `noticeType` | 是 | §5 枚举 |
| `enableFeiShuJsonCard` | 是 | 仅当 `noticeType === FeiShu` 时可为 `true`；其它类型前端固定为 `false` |
| `template` | 条件 | `enableFeiShuJsonCard === false` 时必填（前端校验非空） |
| `templateFiring` / `templateRecover` | 条件 | `FeiShu` 且 `enableFeiShuJsonCard === true` 时必填 |

**注意：**

- 创建请求 **不应** 依赖客户端传 `id`；即使误传，后端也应 **忽略** 或 **报错**（勿误用为更新）。
- `enableFeiShuJsonCard === true` 时，前端 **不发送** `template` 字段；后端可将旧 `template` 置空或忽略。

---

## 5. 模版类型 `noticeType` 枚举

与通知对象、前端常量一致（**大小写敏感**）：

| 值 | 含义 |
|----|------|
| `FeiShu` | 飞书 |
| `Email` | 邮件 |
| `DingDing` | 钉钉 |
| `WeChat` | 企业微信 |
| `Slack` | Slack |

不包含 `WebHook`。

---

## 6. 更新 `POST /noticeTemplate/noticeTemplateUpdate`

### 6.1 Body

在 **§4.1** 的字段基础上 **必须** 增加：

| 字段 | 说明 |
|------|------|
| `id` | 必填，与列表返回主键一致（前端兼容 `record.id` 或 `record.uuid`，提交时合并进 body 的字段名为 **`id`**） |

示例：

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "feishu-card",
  "description": "",
  "noticeType": "FeiShu",
  "enableFeiShuJsonCard": true,
  "templateFiring": "...",
  "templateRecover": "..."
}
```

业务建议：

- **`noticeType` 创建后不可改**：前端更新时类型控件禁用，但仍会回传原 `noticeType`；后端应以存储为准或校验与旧值一致。
- **`name` 创建后不可改**：前端更新时名称输入框禁用；后端可忽略 body 中的改名，或仅允许运维接口改名（与产品一致即可）。

模版内容与 `enableFeiShuJsonCard` 切换时，应与 §4 相同规则校验 **`template` vs `templateFiring`/`templateRecover`**。

---

## 7. 删除 `POST /noticeTemplate/noticeTemplateDelete`

### 7.1 Body（前端固定结构，见 `NoticeTemplateListPage.vue`）

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "模版名称"
}
```

- 删除必须以 **`id`** 为准。
- **`name`** 用于确认文案与审计日志，后端可选校验与库中一致。

删除前建议检查：**仍被通知对象引用** 的模版是否允许删除；若不允许，返回明确 `msg`。

---

## 8. 后端实现检查清单

1. **租户隔离**：所有接口按 `TenantID` 过滤。
2. **列表**：支持 `query`、`noticeType`；`updateAt` 使用 Unix **秒** 或与前端约定一致。
3. **飞书双模版**：`enableFeiShuJsonCard` 为 true 时持久化并下发 `templateFiring` / `templateRecover`；告警引擎 firing / resolved 分别选用对应字段。
4. **非飞书或关闭高级卡片**：持久化并下发 `template`；可选清空 firing/recover 避免歧义。
5. **权限**：四个 path 的 METHOD+path 与 §1.3 一致，便于 JWT 授权。
6. **主键**：统一暴露 `id`（或与前端约定 `uuid` 别名），通知对象 `noticeTmplId` 与之对应。

---

## 9. 前端引用索引

| 说明 | 路径 |
|------|------|
| HTTP 封装 | `src/api/noticeTmpl.js` |
| 权限 path 常量 | `src/constants/noticeApiPaths.js`（`NOTICE_TMPL_API`） |
| 列表与删除 | `src/views/notice-template/NoticeTemplateListPage.vue` |
| 创建 / 更新 body | `src/views/notice-template/NoticeTemplateFormDrawer.vue` |
| 通知对象下拉拉取 | `src/views/notice-objects/NoticeObjectFormDrawer.vue`（`getNoticeTmplList`） |

文档版本与仓库前端保持一致；若后端字段命名调整，请同步更新本文档与上述 Vue 文件中的映射。
