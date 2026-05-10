# 告警管理 — 后端开发方案（WatchAlert 对齐）

本文档在 **WatchAlert Go 实现为事实来源** 的前提下，整理 **告警管理** 子域的后端能力边界、接口与数据流，并给出 **可落地的开发方案**（沿用 Go / Java BFF / Java 全量替换的分阶段路径）。  
与 **SysWatch Vue** 的联调入口见 **§8**；技术细节与 Go 源码索引与《告警管理模块 — 后端实现说明（Go + Java）》一致处不再重复展开，以本文 **§2～§5** 为实施检查单。

**Java 对接（事件 query/body、snake_case 与前端双写、静默与故障中心路径索引）**：[`w8t-java-backend.md`](./w8t-java-backend.md)。

---

## 1. 目标与范围

| 目标 | 说明 |
|------|------|
| 契约稳定 | 路径、方法、JSON 字段与 WatchAlert `/api/w8t` 对齐，前端可零改或仅改 `baseURL`。 |
| 多租户 | `TenantID` 请求头 + 解析租户；与现有 `ParseTenant` 行为一致。 |
| 权限可演进 | 与 Go 一致：Permission 按**完整 Path** 白名单；无 Permission 的接口在网关层补策略（见 §5.3）。 |
| 与故障中心协同 | 规则/活跃事件/静默均绑定 `faultCenterId`；Redis 活跃事件 key 与故障中心文档一致。 |

**范围内子域**：规则组、告警规则（含导入/启停/批量变更）、活跃/历史事件、事件评论、静默。  
**范围外（引用）**：通知对象、数据源详情、评估引擎内部算法 —— 以 WatchAlert 源码为准。

---

## 2. 架构与数据流（概念）

```
┌─────────────┐    评估(Leader)     ┌──────────────┐    消费(Leader)    ┌─────────┐
│ MySQL 规则   │ ────────────────► │ Redis 活跃事件 │ ────────────────► │ 通知发送 │
│ 规则组/静默  │                    │ (按故障中心)   │                  └─────────┘
└─────────────┘                    └──────────────┘
        │                                    │
        │                                    ▼
        │                            历史事件落库(MySQL)
        └────────────────────────────────────────────
```

- 规则持久化在 MySQL；**启用**时由 Leader 启动评估协程，命中条件写入 Redis（租户 + 故障中心维度）。
- 消费者按间隔读 Redis 事件并发送通知；静默在发送链路与列表展示中生效。
- 历史事件落库，供 `hisEvent` 查询。
- 集群下非 Leader 的变更经 **Redis Pub/Sub** 通知 Leader 重载（§6）。

---

## 3. 公共约定

### 3.1 HTTP 与响应信封

- 前缀：`/api/w8t`
- 成功：`{ "code": 200, "data": ..., "msg": "success" }`（前端兼容 `code === 0`）
- 失败：`code` 4xx/5xx，`data` 常为错误信息字符串

### 3.2 中间件（Go 参考）

| 能力 | 说明 |
|------|------|
| Auth | JWT 或 `X-API-Key` |
| ParseTenant | 头 `TenantID`，校验租户存在 |
| Permission | 角色表 **完整 URL Path** 与请求 path 匹配 |
| AuditingLog | 写操作审计 |

各路由挂载组合以 `internal/routers/v1/api.go` 及 `api/rule.go`、`api/ruleGroups.go`、`api/event.go`、`api/silence.go` 为准。

### 3.3 分页

- 模型：`Index`、`Size`、`Total`（**Index 从 1 起**）。
- 仓储：`Offset((Index - 1) * Size)`。
- **活跃事件 `curEvent`**：`pageSlice` 在 Go 中存在 `size <= 0` 时对 `index` 处理不当的隐患；**Java 或二次开发时建议：`size` 默认 10～20，且禁止 `size <= 0` 进入异常分支。**

---

## 4. 模块与接口清单（实施检查单）

### 4.1 规则组 `ruleGroup`

| 方法 | Path | 中间件（Go） |
|------|------|----------------|
| POST | `/ruleGroup/ruleGroupCreate` | Auth, Permission, ParseTenant, AuditingLog |
| POST | `/ruleGroup/ruleGroupUpdate` | 同上 |
| POST | `/ruleGroup/ruleGroupDelete` | 同上 |
| GET | `/ruleGroup/ruleGroupList` | Auth, Permission, ParseTenant |

实现索引：`api/ruleGroups.go`，`internal/services/rule_groups.go`，`internal/types/ruleGroups.go`，`internal/models/rule_groups.go`。

### 4.2 规则 `rule`

| 方法 | Path | Permission | Auditing |
|------|------|------------|----------|
| POST | `/rule/ruleCreate` | ✓ | ✓ |
| POST | `/rule/ruleUpdate` | ✓ | ✓ |
| POST | `/rule/ruleDelete` | ✓ | ✓ |
| GET | `/rule/ruleList` | ✓ | - |
| GET | `/rule/ruleSearch` | ✓ | - |
| POST | `/rule/import` | - | - |
| POST | `/rule/ruleChangeStatus` | - | - |
| POST | `/rule/change` | - | - |

**行为摘要（服务层）**

- **Create**：配额 `GetQuota`；落库；`enabled` 时 Leader `Submit` 否则 Pub `ChannelRuleReload`。
- **Update / Delete / ChangeStatus**：涉及 Redis 指纹清理、协程 Submit/Stop、Pub 消息 —— 与 `internal/services/rule.go` 保持一致。
- **Import**：`importType` 0 = Prometheus YAML，1 = JSON 数组；批量创建 **默认 enabled = false**。
- **Change（批量）**：请求体 `rule_ids` + `change`，仅允许 `rule_group_id`、`datasource_ids`、`fault_center_id`、`enabled`。

**已知产品限制**：`ruleList` **无** `faultCenterId` 查询参数 —— 由前端过滤或后端扩展 Query（与现网 Vue 一致）。

### 4.3 事件 `event`

| 方法 | Path | Permission（Go） |
|------|------|-------------------|
| POST | `/event/delete` | ✓ |
| POST | `/event/addComment` | ✓ |
| GET | `/event/listComments` | ✓ |
| POST | `/event/deleteComment` | ✓ |
| POST | `/event/process` | - |
| GET | `/event/curEvent` | - |
| GET | `/event/hisEvent` | - |

- **ListCurrentEvent**：Redis 全量取事件 → 过滤（含 `faultCenterId` 子串匹配、`scope` 天数、`query`、`status`、静默）→ 排序 → 分页。
- **ListHistoryEvent**：仓储强制 `tenant_id` + `fault_center_id`，时间等筛选见 `internal/repo/event.go`。
- **认领 / 删除活跃**：`process`、`delete` 操作 Redis 内事件；非删历史表。

### 4.4 静默 `silence`

写操作：Auth + Permission + ParseTenant + AuditingLog；列表：Auth + Permission + ParseTenant。  
模型含 `Labels`（key/value/operator）、时间窗、`FaultCenterId`、`Status`（0/1/2）。

---

## 5. 后端开发方案（分阶段）

### 5.1 阶段 A — 直接沿用 WatchAlert Go（推荐基线）

**交付物**

- 部署 WatchAlert 或与 SysWatch 网关合并路由，保证 `/api/w8t` 下上述 Path 可用。
- 配置 JWT、`TenantID`、MySQL、Redis 与 Permission 表（Path 与 Go 注册完全一致）。
- 联调 SysWatch：`unwrapW8t`、规则列表分页、`curEvent` 传正数 `size`。

**验收**

- 前端「告警管理」各页：规则组 CRUD、规则 CRUD/导入/启停/批量、活跃/历史、评论、静默 CRUD 无 4xx 契约错误。

### 5.2 阶段 B — Java Spring Boot 作为 BFF（转发 + 统一鉴权）

**适用**：希望在 Java 网关集中做审计、限流、Permission 补齐（尤其 `import` / `ruleChangeStatus` / `change` / `process` / `curEvent` / `hisEvent`）。

**交付物**

- Controller 路径与 Go **逐字一致**，`ApiResult` 信封与 WatchAlert 一致。
- `TenantID`、`Authorization` 过滤器 → `TenantContext`。
- 下游转发到 Go 服务或 sidecar；** body 不下划线/驼峰混改 **（批量变更保持 `rule_ids`）。

**风险**

- 双跳延迟与超时；需在 BFF 层与 Go 层重复或统一鉴权策略，避免绕过。

### 5.3 阶段 C — Java 实现管理 API + 存储对齐（中长期）

**适用**：团队以 Java 为主维护 CRUD，评估仍可在 Go，或逐步迁移。

**交付物**

- JPA/MyBatis 表结构与 GORM **表名、主键、JSON 列**对齐，便于双写或迁移。
- Redis **key 与序列化**与 `BuildAlertEventCacheKey` 等一致，否则与 Go 消费者/评估无法共存。
- 规则变更继续向 `w8t:rule:reload` 发与 Go `ReloadMessage` 兼容的消息（若仍由 Go Leader 消费）。

**里程碑建议**

1. 规则组 + 规则只读（List/Search）+ 历史事件只读。  
2. 规则写路径 + Redis Pub/Sub 联调。  
3. 活跃事件只读（Redis）与认领/删除。  
4. 静默 + 评论。  
5. 导入与批量变更 + 网关 Permission 收口。

---

## 6. Redis 与集群

| 通道 | 用途 |
|------|------|
| `w8t:rule:reload` | 规则创建/更新/删除/启停 → Leader 重载 |
| `w8t:faultcenter:reload` | 故障中心变更（通知链） |

消息体 `ReloadMessage`：`action`、`id`、`tenantId`、`name` —— 与 `pkg/tools/redis_pubsub.go` 一致。

活跃事件 key 与故障中心文档中 `BuildAlertEventCacheKey` 一致，**不可在 Java 侧私自改前缀**。

---

## 7. 已知实现注意点（迁移清单）

1. **`event` 分页**：`size <= 0` 时 Go 侧行为异常，Java/新实现应修正默认 `size`。  
2. **规则列表**：无服务端 `faultCenterId` 过滤 —— 接受前端过滤或扩展 API。  
3. **无 Permission 接口**：`import`、`ruleChangeStatus`、`change`、`process`、`curEvent`、`hisEvent` —— 生产必须在网关或 Spring Security 层补权限。  
4. **JSON 命名**：响应可能 snake_case 与 camelCase 混排，BFF 可统一 DTO（`@JsonProperty`）再给 Vue。

---

## 8. 与 SysWatch 前端（本仓库）的对应关系

| 前端 | 说明 |
|------|------|
| 路由 | `/alert-mgmt/*`（规则组、规则、活跃、历史、静默）。 |
| API 封装 | `src/api/w8tAlert.js`，前缀 `/api/w8t`。 |
| 响应解包 | `unwrapW8t`（`src/api/faultcenter.js`），成功码 `200` / `0`。 |
| 租户 | `http` 拦截器：存在 `localStorage.tenantId` 时带 `TenantID`；登录 `user.tenantId` 写入本地。 |
| 故障中心上下文 | Pinia `faultCenterContext` + `faultCenterList`；规则列表可按中心客户端过滤；活跃/历史/静默请求带 `faultCenterId`。 |
| 分页参数 | `index`、`size`（1-based），与 §3.3 一致。 |
| 批量变更 | 请求体字段名 **下划线**：`rule_ids`、`change.rule_group_id` 等。 |

建议在后端仓库补充 **OpenAPI 3**，与本前端字段对齐后可用 `openapi-typescript` 生成类型，减少手写漂移。

---

## 9. 扩展：记录规则

预计算类 **Recording Rule**：`/api/w8t/recordingRule/*`，通道 `w8t:recordingrule:reload`。若产品归入「告警管理」菜单，可按 §5.2～5.3 同样做 BFF 或 Java 服务拆分。

---

## 10. 文档关系

| 文档 | 用途 |
|------|------|
| 本文 `alert-management-backend-plan.md` | **后端实施路线 + 检查单 + 与前端映射**。 |
| `fault-center-backend.md` | 故障中心专用：缓存 key、消费者、SLO 等。 |
| `faultcenter-api.md` | 故障中心前端对接。 |
| （可选）`alert-management-frontend.md` | Vue 路由、页面、权限、字段说明专篇；可与 §8 合并维护。 |

**联调最终依据**：WatchAlert **Go 源码 + 实际响应 JSON**；Java 重写后应以契约测试或 OpenAPI 固定行为。
