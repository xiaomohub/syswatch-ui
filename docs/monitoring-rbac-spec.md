# 监控 RBAC：路由、接口字段与后端对齐说明

本文档供 **SysWatch 前端** 与 **后端 / 网关** 对齐使用：路由与权限码一一对应、接口字段以实际前端调用为准，并列出实现与验收要点。

---

## 1. 目标与原则

- 普通用户**仅通过平台内嵌页**看大盘；**不**依赖前端拼接 Grafana 根地址（RBAC 模式下嵌入 URL 只来自后端）。
- **权限字符串**与前端 `src/constants/rbac.js` 中 `PERM` **完全一致**（大小写、冒号分段一致）。
- **授权以服务端为准**：JWT 校验 + 权限判定；前端菜单/路由只做体验层拦截。

---

## 2. 前端路由与权限对照（后端需理解）

基座：`createWebHistory()`，浏览器路径为 **绝对路径**（无前缀）。

| 路径 | Vue Router `name` | 需登录 | `meta.permission`（无则仅登录即可） | 说明 |
|------|-------------------|--------|----------------------------------------|------|
| `/login` | `Login` | 否 | — | 已带 token 访问时，前端会重定向到「首个有权限菜单」（见 §5） |
| `/` | `Layout` | 是 | — | 默认 `redirect` 为 `/dashboard`；若用户无 `menu:dashboard` 权限，仍可能先进入 `/dashboard` 再被守卫重定向到 `/forbidden`，**建议后端登录后首页与前端 `defaultHomePath` 策略一致时，由产品约定是否改默认子路由** |
| `/dashboard` | `Dashboard` | 是 | `menu:dashboard` | 监控面板；内嵌 Grafana 另需 `monitor:embed`（见 §4） |
| `/alert` | `Alert` | 是 | `menu:alert` | |
| `/aiops-rca` | `AiopsRca` | 是 | `menu:aiops:rca` | AIOps 告警根因分析 |
| `/alertconfig` | `AlertConfig` | 是 | `menu:alertconfig` | |
| `/alertsilence` | `AlertSilence` | 是 | `menu:alertsilence` | |
| `/logquery` | `LogQuery` | 是 | `menu:logquery` | |
| `/roleadmin` | `RoleAdmin` | 是 | `admin:role:manage` | 角色权限管理页 |
| `/forbidden` | `Forbidden` | 是 | — | 无 `meta.permission`；用于无权限时跳转 |

**未登录**访问需登录页：跳转到 `/login?redirect=<原始 fullPath>`（URL 编码由浏览器处理）。

**无菜单权限**访问子路由：守卫重定向到 `/forbidden`（`replace: true`）。

---

## 3. 权限码清单（必须与后端一致）

与前端常量一一对应（勿改拼写）：

| 权限码 | 含义 |
|--------|------|
| `menu:dashboard` | 进入监控面板路由 / 侧栏「监控面板」 |
| `menu:alert` | 告警统计 |
| `menu:aiops:rca` | AIOps 智能根因分析页 / 侧栏「智能根因」 |
| `menu:alertconfig` | 告警配置 |
| `menu:alertsilence` | 告警静默 |
| `menu:logquery` | 日志查询 |
| `monitor:embed` | 调用内嵌大盘 URL 接口、展示 iframe（RBAC 模式） |
| `monitor:grafana:direct` | 新开标签访问 Grafana（高敏） |
| `admin:role:manage` | 角色列表、改角色权限 |

**说明**：仅有 `menu:dashboard` 而无 `monitor:embed` 时，用户可进入大盘页，但**不展示**内嵌 Grafana 区域（前端行为）；统计卡片等其它能力若仍直连 Prometheus，应由网关或后续改造收口到 `/api`（见 §8）。

---

## 4. 前端调用方式（HTTP 头）

- 带登录态的请求：前端使用 `src/utils/http.js`，自动附加  
  **`Authorization: Bearer <token>`**  
  其中 `<token>` 与登录响应中的 `token` 字段相同（JWT 或兼容旧格式均可，只要网关与后端约定一致）。
- **登录接口** `POST /api/auth/login` **不需要** Bearer。

后端建议：**所有**除登录、健康检查外的业务接口统一校验 Bearer，避免部分接口仅依赖 Cookie 而部分依赖 Header 造成绕过。

---

## 5. 登录与兼容模式（字段约定）

### `POST /api/auth/login`

**Request**（`Content-Type: application/json`）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `username` | string | 是 | 登录名 |
| `password` | string | 是 | 密码 |

**Response** `200` `application/json`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `token` | string | 是 | 前端存入 `localStorage.token` 并用于 Bearer |
| `user` | object | 否 | 展示用；建议新系统始终返回 |
| `user.username` | string | 建议 | 账号 |
| `user.displayName` | string | 否 | 展示名；缺省时前端可用 `username` |
| `user.roles` | array | 否 | `{ "code": string, "name": string }[]` |
| `permissions` | string[] | **语义必填见下** | 最终生效权限列表（已展开角色） |

**`permissions` 语义（与前端 `userStore.setSession` 对齐）**

- 若响应 JSON **不存在** `permissions` 这个 key：前端进入 **legacy 兼容模式**（视为旧后端）——**全部权限放行**，且大盘仍可使用前端内置 Grafana 地址逻辑。
- 若存在 `permissions` 且为数组（含空数组 `[]`）：**严格 RBAC**，仅数组内权限生效；空数组会导致几乎无菜单，仅可能进入 `/forbidden`。

**错误响应**（建议统一结构，便于前端展示）

| HTTP | 说明 |
|------|------|
| 401 | 用户名密码错误或未认证 |
| 403 | 账号锁定等（按需） |

建议 Body 形态（示例，字段名可与现有后端统一，但需前后端约定）：

```json
{ "message": "用户名或密码错误" }
```

---

## 6. 监控嵌入 / 直达 Grafana（字段约定）

### `GET /api/monitoring/grafana-embed`

**鉴权**：Bearer 必填。  
**权限**：用户须具备 `monitor:embed`，否则 **403**。

**Query**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `from` | string | 是 | Grafana 时间下界，如 `now-24h`、`now-15m` |
| `to` | string | 是 | 一般为 `now` |

**Response** `200` `application/json`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `embedUrl` | string | 建议 | iframe `src`；**推荐主字段** |
| `url` | string | 否 | 兼容别名；前端读取顺序为 `embedUrl ?? url` |

任一为非空字符串即可；若均为空，前端会提示「未返回嵌入地址」。

### `GET /api/monitoring/grafana-open`

**鉴权**：Bearer 必填。  
**权限**：用户须具备 `monitor:grafana:direct`，否则 **403**。

**Query**：同 `grafana-embed`（`from`、`to`）。

**Response** `200` `application/json`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `url` | string | 是 | 新开标签的跳转地址（短期签名或网关跳转） |

**安全**：响应中不得包含长期 API Key、密码；URL 建议短有效期 + 绑定用户/会话。

---

## 7. RBAC 管理接口（角色管理页对齐）

以下均由 **`src/views/admin/RoleAdmin.vue`** 调用；需 **`admin:role:manage`**，否则 **403**。

### `GET /api/rbac/roles`

**Response** `200` — 支持两种形态（前端均已适配）：

1. 顶层数组：`[{ ... }, ...]`
2. 对象包装：`{ "items": [{ ... }, ...] }`

**单条角色对象建议字段**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | number / string | **保存时必填** | 主键；`PUT .../permissions` 路径参数使用 |
| `code` | string | 建议 | 角色编码，唯一 |
| `name` | string | 建议 | 展示名 |
| `permissionCodes` | string[] | 建议 | 当前角色已绑定的权限码，与 §3 一致 |

若缺少 `id`，前端「保存」会提示无法提交（需后端补全）。

### `GET /api/rbac/permissions`

**Response** `200` — 支持：

- 数组：`[{ "code", "name" }, ...]`
- 或 `{ "items": [...] }` / `{ "permissions": [...] }`

**单条权限**

| 字段 | 类型 | 必填 |
|------|------|------|
| `code` | string | 是 |
| `name` | string | 否（缺省前端可显示 code） |

若接口 **404**，前端仍展示本地静态权限表，仅作预览；**不影响**其它菜单（会提示后端未实现）。

### `PUT /api/rbac/roles/{roleId}/permissions`

**Path**

| 参数 | 说明 |
|------|------|
| `roleId` | 与列表中的 `id` 一致 |

**Request** `application/json`

| 字段 | 类型 | 必填 |
|------|------|------|
| `permissionCodes` | string[] | 是（可为空数组表示清空） |

**Response**：`200` 或 `204`；错误时建议返回 `message` 便于展示。

---

## 8. JWT 建议载荷（与网关对齐）

| Claim | 说明 |
|-------|------|
| `sub` | 用户唯一标识 |
| `exp` | 过期时间 |
| `permissions` 或 `perm` | 权限字符串数组（与 §3 一致），或与 `perm_ver` 组合服务端查缓存 |
| `perm_ver` | 可选；权限变更后递增，用于作废旧 JWT 或配合服务端校验 |

网关可基于 `permissions` 做粗粒度路径前缀拦截；细粒度仍以各 Controller 为准。

---

## 9. 表结构（关系型示例）

```sql
CREATE TABLE rbac_permission (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  code        VARCHAR(64) NOT NULL UNIQUE,
  name        VARCHAR(128) NOT NULL,
  module      VARCHAR(32) NOT NULL COMMENT '如 monitor / admin',
  description VARCHAR(255) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rbac_role (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  code        VARCHAR(64) NOT NULL UNIQUE,
  name        VARCHAR(128) NOT NULL,
  built_in    TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=系统内置不可删',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE rbac_role_permission (
  role_id       BIGINT NOT NULL,
  permission_id BIGINT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES rbac_role(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES rbac_permission(id) ON DELETE CASCADE
);

CREATE TABLE rbac_user_role (
  user_id BIGINT NOT NULL,
  role_id BIGINT NOT NULL,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES rbac_role(id) ON DELETE CASCADE
);
```

---

## 10. 后端对齐清单（验收）

- [ ] 登录返回 **`permissions` 数组**（新环境）；或明确依赖 **省略 `permissions` 的 legacy 模式**（旧环境）。
- [ ] 权限码与 §3 **逐字一致**；角色变更后，新登录或 `perm_ver` 策略生效。
- [ ] `GET /api/monitoring/grafana-embed`：仅 `monitor:embed`，返回 **`embedUrl` 或 `url`**。
- [ ] `GET /api/monitoring/grafana-open`：仅 `monitor:grafana:direct`，返回 **`url`**。
- [ ] RBAC 管理三接口：`roles` 含 **`id` + `permissionCodes`**；`PUT` 接收 **`permissionCodes`**。
- [ ] 全站受保护 API 校验 **`Authorization: Bearer`**（与前端 `http.js` 一致）。
- [ ] 401 / 403 Body 建议含 **`message`**（字符串），便于前端统一展示。
- [ ] **审计**（建议）：记录 `grafana-embed`、`grafana-open` 的用户、时间、目标资源标识。
- [ ] **Prometheus 等内网地址**：逐步改为后端代理接口，避免浏览器直连（与监控 RBAC 目标一致）。
- [ ] `POST /api/aiops/rca/analyze`：需登录（Bearer）；建议仅 `menu:aiops:rca` 可调用；返回结构见 §12。

---

## 11. 登录后首页路径（与前端一致）

前端 `defaultHomePath` 按顺序命中第一个**已有权限**的菜单：

1. `/dashboard` → `menu:dashboard`  
2. `/alert` → `menu:alert`  
3. `/aiops-rca` → `menu:aiops:rca`  
4. `/alertconfig` → `menu:alertconfig`  
5. `/alertsilence` → `menu:alertsilence`  
6. `/logquery` → `menu:logquery`  
7. `/roleadmin` → `admin:role:manage`  

若皆无：进入 **`/forbidden`**。

若 URL 带 `?redirect=`，登录成功后优先跳转该路径（仍受路由守卫权限校验，无权限则进 `/forbidden`）。

---

## 12. AIOps 告警根因分析（前端已接入）

### 12.1 页面与入口

- 路由：`/aiops-rca`（`menu:aiops:rca`）。
- 「告警统计」列表行内、告警详情弹窗内提供快捷入口：将告警字段写入 `sessionStorage` 键 `aiops_rca_prefill` 后跳转该页（避免 URL 过长）。

### 12.2 `POST /api/aiops/rca/analyze`

**鉴权**：`Authorization: Bearer`。**建议权限**：`menu:aiops:rca`（与菜单一致，服务端强校验）。

**Request** `application/json`（字段均可选，但至少应有一种上下文可供模型分析；前端要求 `summary`、`description`、`alertName` 至少一项非空）

| 字段 | 类型 | 说明 |
|------|------|------|
| `alertId` | string | 审计与关联 |
| `alertName` | string | 规则名 / 告警名 |
| `summary` | string | 摘要 |
| `description` | string | 描述、指标、栈等 |
| `startsAt` | string | 触发时间（ISO8601 或可读文本） |
| `extraContext` | string | 变更、关联服务、人工备注 |

**Response** `200` `application/json`（前端 `normalizeResult` 兼容下列字段）

| 字段 | 类型 | 说明 |
|------|------|------|
| `requestId` / `id` | string | 请求追踪 |
| `summary` / `conclusion` | string | 结论摘要 |
| `rootCauses` / `causes` | array | 元素可为 `{ title?, likelihood?, evidence?, reasoning? }` |
| `recommendations` / `actions` | array 或 string | 处置建议 |
| `analysis` / `content` | string | 无结构化字段时的长文分析 |
| `disclaimer` / `notice` | string | 免责声明 |

**错误**：401 / 403 / 5xx；Body 建议 `{ "message": "..." }`。
