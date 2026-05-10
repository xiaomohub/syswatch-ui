# 三档角色模型（root / admin / user）前后端方案

本文与前端实现（`src/constants/rbac.js`、`src/store/user.js`、`src/router/index.js`、侧栏 `index.vue`）对齐，供后端与联调使用。

## 1. 角色语义

| 档位 | 建议角色编码（`roles[].code`，小写） | 能力边界 |
|------|--------------------------------------|----------|
| **user** | `user` | 仅 **监控面板**（`/dashboard`）及通用页（如 `/forbidden`）。 |
| **admin** | `admin` | **运维使用者**：除「人员管理」外的业务功能（告警、故障中心、值班、通知、数据源、日志、智能诊断等）。**不能**访问用户列表、角色与权限等底层账号治理。 |
| **root** | `root` | **平台超级管理**：在 admin 基础上，可访问 **`/roleadmin/*`**（用户 CRUD、角色绑定、若仍保留的权限矩阵接口）。 |

说明：若同一用户挂载多个角色，**取最高档**（root > admin > user）。兼容别名：`superadmin`/`system` 视为 root 档；`administrator` 视为 admin 档。

## 2. 登录与 JWT 契约

### 2.1 登录响应（推荐）

在现有 `token` 之外，**必须**能通过以下任一方式给出角色（否则空权限且无 roles 时会走前端「旧版 legacy」逻辑，联调期可用 `RBAC_RELAX_ALL` 关闭校验）：

- `user.roles: [{ "code": "admin", "name": "运维" }, ...]`  
- 或顶层 `roles: [...]`（与 `user` 同级）  
- 或在 **JWT payload** 中提供 `roles` 数组，或单字段 `role: "admin"`  

权限字符串 `permissions`（细粒度 menu / API path）**可选**；新模型下可不依赖其做菜单展示，但 **Go 等中间件若仍校验 path 权限**，请继续为 admin/root 下发所需串，或为这些接口改为**按角色**校验。

### 2.2 JWT 建议声明

```json
{
  "sub": "zhangsan",
  "roles": ["admin"],
  "permissions": []
}
```

或：

```json
{
  "role": "root"
}
```

前端会从 body 与 JWT 合并解析角色（见 `src/utils/loginPermissions.js` 的 `extractLoginRoles`）。

## 3. 后端开发要点

1. **用户表 / 角色表**  
   - 至少三个角色定义：`root`、`admin`、`user`（编码与上表一致，便于前端解析）。  
   - 用户与角色多对多或单角色均可；若多角色，后端签发时把**全部角色**写入 JWT，由前端取最高档。

2. **接口授权**  
   - **`/api/rbac/users`、`/api/rbac/users/*`、`/api/rbac/roles/*`（人员与角色治理）**：仅 **root**（或等价 `ROLE_ROOT`）。  
   - **其余业务 API**：**admin 与 root** 允许；**user** 应拒绝写操作，读操作按业务决定（建议 user 仅使用大盘只读数据接口，与前端「仅 dashboard」一致）。  

3. **与旧版兼容**  
   - 若短期内仍下发大量 `menu:*` / path 权限，可保留；前端路由与侧栏已**不再依赖**这些码做菜单显隐（仍以三档为主）。  
   - 若 `permissions` 为空且**无任何 roles 信息**，前端会视为旧环境并可能进入 legacy 全放行（见 `effectiveLoginPermissions`）；生产环境请避免该组合。

4. **安全**  
   - 禁止 **admin** 调用「创建 root」「把任意用户提权为 root」等接口，除非产品明确要求（建议仅 root 可操作）。  
   - 删除用户、修改密码等敏感操作建议仅 **root** 或独立审计策略。

## 4. 前端已实现行为

- **路由 `meta.access`**：`user` | `admin` | `root`，匹配链上取最高要求，与用户 `accessLevel` 比较，不足则进 `/forbidden`。  
- **侧栏**：`user` 只见监控面板；`admin`/`root` 见运维菜单；**仅 root** 见「人员管理」。  
- **`useFaultCenterPerm` / `useNoticePerm` / `useNoticeTmplPerm`**：在非 relax、非 legacy 时，**admin/root** 按钮全放行；**user** 若在将来放开部分页，则偏只读（当前路由下 user 进不了这些页）。  
- **`RoleAdmin` 本地权限字典**已置空；若后端仍提供 `GET /api/rbac/permissions`，可继续用于编辑角色附带串（与菜单解耦）。  

## 5. 新模块接入约定

- **默认**：需要登录的业务页 → 路由挂 **`access: 'admin'`**，后端接口要求 **admin 或 root**。  
- **仅大屏只读**：挂 **`access: 'user'`**，后端只读接口对 **user** 开放。  
- **账号/角色/租户级配置**：路由 **`access: 'root'`**，接口仅 **root**。

## 6. 联调清单

- [ ] 登录响应或 JWT 中带 `roles`（或 `role`），且 `user` / `admin` / `root` 三档可测。  
- [ ] `user` 访问 `/dashboard` 成功，访问 `/fault-center`、`/roleadmin/users` 应 403 或跳转无权限页。  
- [ ] `admin` 可访问运维菜单，不可访问 `/roleadmin/*`。  
- [ ] `root` 可访问 `/roleadmin/*`。  
- [ ] 业务 API 与前端档位一致，避免「前端能点开但接口 403」或相反。
