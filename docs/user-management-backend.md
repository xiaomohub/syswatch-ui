# 用户管理与 RBAC 后端对接说明

本文档描述 **SysWatch 前端**（`src/api/rbacAdmin.js`、`UserAdminList.vue`、`RoleAdmin.vue`）所依赖的 HTTP 契约，供后端实现或联调时对齐。

## 通用约定

- **Base URL**：与现有代理一致，路径前缀为 `/api`（开发环境由 Vite 转发到后端，如 `http://localhost:8080`）。
- **鉴权**：请求头携带 `Authorization: Bearer <token>`；多租户场景下与现有接口一致可带 `TenantID`（见 `src/utils/http.js`）。
- **权限**：上述接口仅允许具备 **`admin:role:manage`**（见 `src/constants/rbac.js` 中 `PERM.ADMIN_ROLE_MANAGE`）的管理员调用；具体由后端在网关或 Controller 上校验。
- **响应体**：前端兼容以下两种常见包装（优先读内层对象）：
  - 直接 JSON 对象；
  - `{ "data": { ... } }`（列表可为 `{ "data": { "items": [], "total": 0 } }`）。

## 已有接口（角色 / 权限）

前端已在「角色与权限」页使用，请保持兼容。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/rbac/roles` | 角色列表 |
| GET | `/api/rbac/permissions` | 权限定义列表（可选；404 时前端用本地字典兜底） |
| PUT | `/api/rbac/roles/{roleId}/permissions` | 更新某角色的权限集合 |

### GET `/api/rbac/roles`

- **响应**：角色数组，或 `{ "items": [ ... ] }`。
- **角色对象建议字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string / number | **必填**，与用户-角色绑定一致 |
| `code` | string | 角色编码 |
| `name` | string | 展示名 |
| `permissionCodes` | string[] | 已绑定的权限码 |

### PUT `/api/rbac/roles/{roleId}/permissions`

- **请求体**：

```json
{
  "permissionCodes": ["menu:dashboard", "admin:role:manage"]
}
```

- **语义**：覆盖式写入该角色的权限集合。

---

## 新增：用户 CRUD 与用户-角色

### 1. 用户列表

**GET** `/api/rbac/users`

- **Query（可选）**：

| 参数 | 说明 |
|------|------|
| `keyword` | 按用户名、显示名、邮箱等模糊搜索（可选实现） |
| `page` | 页码，从 1 开始（可选） |
| `size` | 每页条数（可选） |

- **响应**（任选一种形态，前端均已解析）：
  - 用户对象数组：`User[]`；
  - 或 `{ "items": User[], "total": number }`；
  - 或 `{ "list": User[], "total": number }`。

**User 对象建议字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string / number | **必填** |
| `username` | string | 登录名，唯一 |
| `displayName` | string | 展示名，可选 |
| `email` | string | 可选 |
| `enabled` | boolean | 是否启用；若无该字段，可用 `status`：`active` / `disabled` 等与前端约定（当前前端兼容 `enabled`、`status`、`disabled` 等常见写法） |
| `roles` | `{ id, code, name }[]` | 可选，用于列表展示 |
| `roleIds` | (string \| number)[] | 可选；若无则前端根据 `roles` 推导 |

---

### 2. 用户详情（预留）

**GET** `/api/rbac/users/{userId}`

- 前端 `rbacAdmin.js` 中已封装，当前「用户列表」页未强依赖；若列表已含完整角色信息，可不实现。
- **响应**：单个 `User` 对象（或包在 `data` 内）。

---

### 3. 创建用户

**POST** `/api/rbac/users`

- **请求体**：

```json
{
  "username": "zhangsan",
  "displayName": "张三",
  "email": "zhangsan@example.com",
  "password": "初始密码",
  "enabled": true
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `username` | 是 | 创建后建议不可修改（前端编辑时禁用） |
| `password` | 是 | 初始密码 |
| `displayName` | 否 | |
| `email` | 否 | |
| `enabled` | 否 | 默认 `true` |

- **响应**：返回完整 `User`，或至少包含新建用户的 **`id`**（前端据此再调「绑定角色」接口）。

---

### 4. 更新用户

**PATCH** `/api/rbac/users/{userId}`

（若团队统一使用 **PUT** 全量更新，可将路径与方法改为 PUT，并同步修改前端 `rbacAdmin.js` 中的 `updateUser`。）

- **请求体**（字段均可选，按「有则更新」语义）：

```json
{
  "displayName": "张三",
  "email": "zhangsan@example.com",
  "password": "新密码",
  "enabled": true
}
```

- **说明**：`password` 仅在传入且非空时修改密码；前端编辑时留空表示不修改。
- **响应**：更新后的 `User`，或空 body（前端会再次拉列表刷新展示）。

---

### 5. 删除用户

**DELETE** `/api/rbac/users/{userId}`

- **语义**：物理删除或逻辑停用由后端决定；删除当前登录用户应返回 **4xx** 并提示（前端已禁止删除与当前登录用户名一致的行，仍建议后端校验）。

---

### 6. 用户角色绑定（覆盖式）

**PUT** `/api/rbac/users/{userId}/roles`

- **请求体**：

```json
{
  "roleIds": [1, 2, 3]
}
```

- **语义**：**覆盖**该用户拥有的角色集合（非增量 patch）。`roleIds` 元素类型与 `GET /api/rbac/roles` 返回的 `id` 类型保持一致（支持 string 或 number，与 UUID 兼容）。
- **调用时机**：前端在「新建用户」「编辑用户」保存时，在创建/更新用户成功后 **始终** 调用本接口，以保证角色与表单勾选一致。

---

## 错误与 HTTP 状态码建议

| 场景 | 建议 |
|------|------|
| 未登录 / token 无效 | 401 |
| 无 `admin:role:manage` | 403 |
| 用户名冲突 | 409 或 400，body 带 `message` |
| 资源不存在 | 404 |
| 业务错误 | 400，body 带可读 `message`（前端会展示） |

---

## 与登录 / JWT 的关系（建议）

- 用户被分配的 **角色 → 权限码** 应与登录接口签发的 **JWT `permissions` 声明**（或等价字段）一致，否则修改角色后需重新登录或后端支持刷新令牌，才能在菜单与路由上生效（见 `src/store/user.js`、`src/utils/loginPermissions.js`）。
- 权限码字符串需与 `src/constants/rbac.js` 中 `PERM` 常量一致。

---

## 前端文件索引

| 文件 | 说明 |
|------|------|
| `src/api/rbacAdmin.js` | 用户/角色/权限 API 封装 |
| `src/views/admin/UserAdminList.vue` | 用户列表与 CRUD、角色多选 |
| `src/views/admin/RoleAdmin.vue` | 角色权限矩阵 |
| `src/views/admin/PersonnelLayout.vue` | 人员管理子导航 |
| `src/router/index.js` | `/roleadmin/users`、`/roleadmin/roles` |

联调完成后，请将 `src/constants/rbac.js` 中 **`RBAC_RELAX_ALL`** 设为 `false`，以便在生产环境启用菜单与路由级权限校验。
