# 告警规则与规则组 — Java 后端开发说明

本文档面向 **Java（Spring Boot）** 实现或 BFF 转发，与 **WatchAlert** 现有契约及本仓库前端（`src/api/w8tAlert.js`、`RuleList.vue`、`RuleForm.vue`）对齐。  
更宏观的路线与检查单见 [alert-management-backend-plan.md](./alert-management-backend-plan.md)。  
**事件 / 静默 / 故障中心** 的 Java 契约与 query、body 双写说明见 [w8t-java-backend.md](./w8t-java-backend.md)。

---

## 1. 目标与边界

| 项 | 说明 |
|----|------|
| API 前缀 | `/api/w8t` |
| 契约 | 路径、HTTP 方法、请求/响应 JSON 字段与现网 WatchAlert 一致；Java 侧用 `@JsonProperty` 兼容 **snake_case**（如批量变更 `rule_ids`） |
| 多租户 | 请求头 `TenantID`（与前端 `http` 拦截器一致）；所有读写必须带租户隔离 |
| 权限 | Go 版对部分接口未挂 Permission，生产环境应在 **网关或 Spring Security** 补齐（见 §8） |
| 与评估引擎 | 规则 **启用** 时需通知 Leader 加载协程；集群用 **Redis Pub/Sub** 同步重载（见 §7） |

**本文范围**：规则组 CRUD、规则 CRUD/列表/搜索/导入/启停/批量变更及对应 **库表设计要点**。事件、静默见总方案文档。

---

## 2. 统一约定

### 2.1 响应信封

成功示例：

```json
{ "code": 200, "data": { }, "msg": "success" }
```

前端 `unwrapW8t` 将 `code === 200` 或 `code === 0` 视为成功；失败时 `code` 为 4xx/5xx，`data` 常为错误文案字符串。

### 2.2 请求头

| 头 | 说明 |
|----|------|
| `Authorization` | JWT（或与现网一致的鉴权） |
| `TenantID` | 租户 ID，必填（解析后放入 `TenantContext`） |

### 2.3 分页

- 查询参数：`index`（**从 1 开始**）、`size`（每页条数，建议默认 20，且 **禁止 `size <= 0`** 进入分页逻辑）。
- 列表响应：`list` 或 `records`（前端 `normalizeListPayload` 二者都认）、`total`、`index`、`size`。

### 2.4 命名策略

- 规则表单、创建/更新等多为 **camelCase**（如 `ruleGroupId`、`faultCenterId`）。
- **批量变更** `/rule/change` 请求体为 **snake_case**：`rule_ids`、`change.rule_group_id`、`change.fault_center_id`、`change.datasource_ids`、`change.enabled`。

建议在 Java 中拆 DTO，显式 `@JsonProperty("rule_ids")` 等，避免全局命名策略误伤。

---

## 3. 规则组 `ruleGroup`

### 3.1 接口一览

| 方法 | Path | 说明 |
|------|------|------|
| `GET` | `/api/w8t/ruleGroup/ruleGroupList` | 分页列表，支持按名称搜索 |
| `POST` | `/api/w8t/ruleGroup/ruleGroupCreate` | 创建 |
| `POST` | `/api/w8t/ruleGroup/ruleGroupUpdate` | 更新 |
| `POST` | `/api/w8t/ruleGroup/ruleGroupDelete` | 删除 |

写操作建议：`Auth` + `Permission`（按完整 path）+ 租户解析 + 审计日志。

### 3.2 请求/响应（与前端对齐）

**ruleGroupList（GET）**

查询参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| `query` | string | 可选，规则组名称模糊搜索（前端侧栏搜索） |
| `index` | int | 页码，从 1 |
| `size` | int | 页大小 |

响应 `data`：分页对象，含 `list`（或 `records`）。列表项至少包含：

| 字段 | 说明 |
|------|------|
| `id` | 规则组 ID |
| `name` | 显示名 |

**ruleGroupCreate（POST）**

```json
{ "name": "生产环境" }
```

**ruleGroupUpdate（POST）**

```json
{ "id": "<规则组ID>", "name": "新名称" }
```

**ruleGroupDelete（POST）**

```json
{ "id": "<规则组ID>" }
```

业务规则建议：

- 删除前校验：组内是否仍存在规则；若存在可禁止删除或级联策略（与产品一致）。
- `id` 创建时可由服务端生成（UUID/雪花），保证租户内唯一。

---

## 4. 告警规则 `rule`

### 4.1 接口一览

| 方法 | Path | 说明 |
|------|------|------|
| `GET` | `/api/w8t/rule/ruleList` | 某规则组下分页列表 |
| `GET` | `/api/w8t/rule/ruleSearch` | 按组+规则 ID 查单条（编辑页） |
| `POST` | `/api/w8t/rule/ruleCreate` | 创建 |
| `POST` | `/api/w8t/rule/ruleUpdate` | 更新 |
| `POST` | `/api/w8t/rule/ruleDelete` | 删除 |
| `POST` | `/api/w8t/rule/import` | 批量导入（默认未启用） |
| `POST` | `/api/w8t/rule/ruleChangeStatus` | 单条启停 |
| `POST` | `/api/w8t/rule/change` | 批量变更 |

### 4.2 ruleList（GET）

前端调用（`RuleList.vue`）：

| 参数 | 说明 |
|------|------|
| `ruleGroupId` | 必填 |
| `datasourceType` | 可选：`Prometheus` / `Loki` / `Kubernetes` |
| `query` | 可选，规则名称搜索 |
| `status` | 可选：`all` / `enabled` / `disabled`（与前端 tab 一致） |
| `index`, `size` | 分页 |

**已知限制**：当前前端 **未** 传 `faultCenterId`；「仅当前故障中心」在浏览器端对 `faultCenterId` 过滤（`displayRows`）。Java 实现可保留兼容，或扩展可选参数 `faultCenterId` 做服务端过滤（需前后端约定）。

列表行字段（前端表格使用）包括但不限于：

| 字段 | 类型 | 说明 |
|------|------|------|
| `ruleId` | string | 规则主键 |
| `ruleGroupId` | string | 所属规则组 |
| `faultCenterId` | string | 故障中心 |
| `datasourceType` | string | 数据源类型 |
| `datasourceId` | string[] | 数据源 ID 列表 |
| `ruleName` | string | 规则名 |
| `severity` | string | 严重级别 |
| `enabled` | boolean | 是否启用 |
| 其他 | | 评估间隔、描述等可按需返回 |

### 4.3 ruleSearch（GET）

编辑页加载单条，前端传：

| 参数 | 说明 |
|------|------|
| `ruleGroupId` | 路径/上下文中的组 ID |
| `ruleId` | 规则 ID |

响应为 **单个规则对象**（非列表），字段需满足表单回显：

- `ruleId`, `ruleGroupId`, `faultCenterId`, `datasourceType`, `datasourceId`（数组）  
- `ruleName`, `severity`, `evalInterval`, `repeatNoticeInterval`, `description`, `enabled`  
- `prometheusConfig`：对象（JSON），前端 `JSON.stringify` 展示  
- `effectiveTime`：可选对象  

### 4.4 ruleCreate / ruleUpdate（POST）

前端提交体（`RuleForm.vue`）核心字段：

```json
{
  "ruleGroupId": "",
  "faultCenterId": "",
  "datasourceType": "Prometheus",
  "datasourceId": ["id1", "id2"],
  "ruleName": "",
  "evalInterval": 60,
  "repeatNoticeInterval": 300,
  "description": "",
  "severity": "warning",
  "enabled": true,
  "prometheusConfig": { },
  "effectiveTime": { }
}
```

- `effectiveTime` 可省略。  
- **更新**时增加 `ruleId`。

服务层建议逻辑（与 Go WatchAlert 行为对齐）：

1. 校验租户、规则组存在且属于本租户。  
2. 校验 `faultCenterId` 存在且可访问（若平台有该约束）。  
3. **配额**（若产品有 `GetQuota` 一类限制）：创建前检查。  
4. 持久化后：若 `enabled` 且当前节点为 Leader → 提交评估任务；否则发布 **规则重载** 消息（§7）。  
5. 更新/删除：清理 Redis 中与本规则相关的事件指纹、停止旧协程等（与现网一致）。

### 4.5 ruleDelete（POST）

前端：

```json
{ "ruleId": "<规则ID>" }
```

删除后应清理 Redis 活跃事件中相关数据（与现网提示一致）。

### 4.6 ruleChangeStatus（POST）

前端：

```json
{
  "ruleId": "",
  "ruleGroupId": "",
  "faultCenterId": "",
  "enabled": true
}
```

用于单条启停；需触发与创建类似的加载/卸载与 Pub 通知。

### 4.7 import（POST）

前端（`RuleImport.vue`）：

```json
{
  "ruleGroupId": "",
  "faultCenterId": "",
  "datasourceType": "Prometheus",
  "datasourceIdList": ["a", "b"],
  "importType": 0,
  "rules": "<YAML 或 JSON 文本>"
}
```

| `importType` | 含义 |
|--------------|------|
| 0 | Prometheus YAML（`groups[].rules`） |
| 1 | WatchAlert JSON 数组 |

**产品约定**：导入批量创建的规则 **默认 `enabled = false`**。

### 4.8 change — 批量变更（POST）

请求体（注意 snake_case）：

```json
{
  "rule_ids": ["id1", "id2"],
  "change": {
    "rule_group_id": "可选",
    "fault_center_id": "可选",
    "datasource_ids": ["x", "y"],
    "enabled": true
  }
}
```

`change` 中 **仅允许** 上述字段（与 Go 侧一致）；未传字段表示不修改。

每条规则变更后应走与单条更新相同的引擎通知与 Redis 清理逻辑。

---

## 5. 数据库设计（MySQL 建议）

以下表名、字段以 **与 GORM/现网 WatchAlert 对齐** 为目标；Java 可用 JPA `@Table` / MyBatis 显式列名映射。实际迁移时以 Go `internal/models` 为准。

### 5.1 规则组表 `rule_groups`（示例）

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | varchar(64) PK | 主键 |
| `tenant_id` | varchar(64) | 租户，索引 |
| `name` | varchar(255) | 名称 |
| `created_at` / `updated_at` | datetime | 审计 |

唯一建议：`UNIQUE(tenant_id, name)` 或按产品仅唯一 `id`。

### 5.2 规则表 `rules`（示例）

| 列 | 类型 | 说明 |
|----|------|------|
| `rule_id` | varchar(64) PK | 规则 ID |
| `tenant_id` | varchar(64) | 索引 |
| `rule_group_id` | varchar(64) | 外键逻辑关联 `rule_groups.id` |
| `fault_center_id` | varchar(64) | 索引 |
| `datasource_type` | varchar(32) | Prometheus / Loki / Kubernetes |
| `datasource_ids` | json / text | 存 JSON 数组字符串 |
| `rule_name` | varchar(512) | |
| `severity` | varchar(32) | |
| `eval_interval` | int | 秒 |
| `repeat_notice_interval` | int | 秒 |
| `description` | text | |
| `enabled` | tinyint(1) | |
| `prometheus_config` | json | 评估用配置（如 promQL） |
| `effective_time` | json | 可空 |
| `created_at` / `updated_at` | datetime | |

索引建议：

- `(tenant_id, rule_group_id)` — 列表查询  
- `(tenant_id, fault_center_id)` — 若服务端支持按故障中心过滤  
- 可选全文或 `rule_name` 前缀索引（视数据量）

### 5.3 JSON 列

- `prometheus_config`、`effective_time`、`datasource_ids` 在 Java 中可用 `JsonNode`、`Map<String,Object>` 或强类型 DTO + `AttributeConverter`。  
- 序列化与 Go 端一致，避免浮点/整型与前端展示不一致。

---

## 6. Spring Boot 分层建议

```
com.example.w8t
├── web
│   ├── RuleGroupController   // 路径与 §3、§4 完全一致
│   └── RuleController
├── service
│   ├── RuleGroupService
│   └── RuleService           // 配额、事务、发布重载
├── domain / repository
│   ├── RuleGroupEntity
│   └── RuleEntity
├── integration
│   ├── RedisRuleReloadPublisher
│   └── AlertEvaluationBridge // 若仍调 Go 侧 HTTP/gRPC
└── security
    └── TenantFilter
```

- **事务**：单条 CRUD 在 `@Transactional` 内完成写库 + 发 Redis 消息（注意：与外部引擎的最终一致可接受短暂延迟）。  
- **幂等**：`rule_id` 生成策略固定；导入接口可对重复 `ruleName`+组 做去重或报错（与产品一致）。

---

## 7. Redis 与集群

| 通道 | 用途 |
|------|------|
| `w8t:rule:reload` | 规则创建/更新/删除/启停后通知 Leader 重载 |

消息体结构与 Go `ReloadMessage` 一致（`action`、`id`、`tenantId`、`name` 等），Java 重写时必须与 `pkg/tools/redis_pubsub.go` **字节级兼容** 方可与现有 Leader 共存。

活跃事件缓存 key 前缀与 **故障中心** 文档中约定一致（如 `BuildAlertEventCacheKey`），**禁止** Java 侧私自改前缀。

---

## 8. 权限与安全补充

Go 路由中部分接口未注册 Permission（如 `import`、`ruleChangeStatus`、`change`）。若 Java 全量接管：

- 在 `SecurityFilterChain` 中为 `/api/w8t/rule/import`、`ruleChangeStatus`、`change` 配置与写操作相当的权限或角色。  
- 批量变更需校验 `rule_ids` 均属于当前 `tenant_id`，防止水平越权。

---

## 9. 实现阶段建议

1. **只读**：`ruleGroupList`、`ruleList`、`ruleSearch` — 验证分页与 JSON 字段。  
2. **规则组写**：Create/Update/Delete + 库表。  
3. **规则写**：Create/Update/Delete + Redis Pub/Sub +（可选）调用现有 Go 评估服务。  
4. **导入与批量** + 网关限流。  
5. 输出 **OpenAPI 3**，与前端字段对齐后可生成 TS 类型，减少漂移。

---

## 10. 与前端文件的对应关系

| 前端 | 说明 |
|------|------|
| `src/api/w8tAlert.js` | 所有路径与 HTTP 方法 |
| `src/views/alert-mgmt/RuleList.vue` | 规则组列表参数 `query`；规则列表参数；批量 `rule_ids` + `change` |
| `src/views/alert-mgmt/RuleForm.vue` | 创建/更新 body |
| `src/views/alert-mgmt/RuleImport.vue` | `import` body |
| `src/utils/w8tPage.js` | `list`/`records`、`index` 从 1 |

**联调验收依据**：真实 WatchAlert 返回 JSON + 本仓库上述调用点；Java 上线前建议契约测试覆盖 `unwrapW8t` 成功码与分页字段。
