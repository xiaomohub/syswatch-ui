# 故障中心（Fault Center）— 后端实现说明

本文档供 **SysWatch / WatchAlert 对齐** 的后端开发与二次开发对照使用。  
**§1～§12** 以 WatchAlert 仓库 **Go（Gin + GORM + 自研 Redis 封装）** 为事实来源；**§13** 为 **Java（Spring Boot）** 等价映射建议。**HTTP/JSON 契约与语言无关**，与本仓库 Vue 前端联调说明见文末 **§15**。

---

## 1. 职责概述

- **持久化**：MySQL 表 `w8t_fault_center`（GORM `TableName()`）。
- **运行期配置**：写入 Redis 的故障中心信息键，供评估、恢复等待、消费者等读取。
- **消费者**：Leader 节点为每个故障中心启动 goroutine，周期性从 Redis 拉取该中心下活跃事件，做静默过滤、重复通知判断、聚合、通知发送、升级逻辑等。
- **集群**：非 Leader 节点在增删改后通过 Redis Pub/Sub 通知 Leader 重载消费者（见 §8）。

---

## 2. 数据模型

参考文件：`internal/models/fault_center.go`。

核心结构体 `FaultCenter` 字段（JSON 与 DB 列通过 tag 映射）：

| 字段 | 说明 |
|------|------|
| `TenantId` / `ID` / `Name` / `Description` | 租户、主键（创建时为 `fc-` + 随机 id）、展示名称与描述 |
| `NoticeIds` | 通知对象 ID 列表（JSON 列） |
| `NoticeRoutes` | 按标签路由到多组 `noticeIds`（`NoticeRoute`：`labels` + `noticeIds`） |
| `RepeatNoticeInterval` | `map[string]int`，告警等级 → **重复通知间隔（分钟）**；缺省等级返回 30（`GetRepeatNoticeInterval`） |
| `RecoverNotify` | 指针，nil 当 false（`GetRecoverNotify`） |
| `AggregationType` | 字符串；消费者内 `alarmAggregation`：`Rule` 时按规则聚合，否则保持按 severity 分组 |
| `CreateAt` | Unix 时间戳 |
| `RecoverWaitTime` | 恢复等待，**秒**；为 0 时告警规则侧有默认（见 `alert/eval/alert_rule.go`） |
| `IsUpgradeEnabled` / `UpgradableSeverity` / `UpgradeStrategy` | 升级总开关、可升级等级列表、升级策略（超时、重复间隔、通知对象） |

辅助方法：`GetIsUpgradeEnabled`、`GetSeverityAssessmentResult`、`GetUpgradeNoticeId`、`GetTimeout`、`GetNoticeInterval`、`GetAlarmAggregationType` 等。

**缓存键构造函数**（同文件）：

- 事件：`BuildAlertEventCacheKey` → `w8t:{tenantId}:faultCenter:{faultCenterId}.events`
- 静默：`BuildAlertMuteCacheKey` → `w8t:{tenantId}:faultCenter:{faultCenterId}.mutes`
- 中心信息：`BuildFaultCenterInfoCacheKey` → `w8t:{tenantId}:faultCenter:{faultCenterId}.info`

---

## 3. HTTP API

路由挂在 **`/api/w8t`** 下，控制器：`api/faultCenter.go`。

### 3.1 路由组与中间件

| 子组 | 中间件 | 路由 |
|------|--------|------|
| `faultCenterA` | Auth, Permission, ParseTenant, AuditingLog | `POST faultCenterCreate`、`faultCenterUpdate`、`faultCenterDelete`、`faultCenterReset` |
| `faultCenterB` | Auth, Permission, ParseTenant | `GET faultCenterList`、`faultCenterSearch` |
| `c` | Auth, ParseTenant（**无 Permission，无审计**） | `GET slo` |

完整路径示例：`POST /api/w8t/faultCenter/faultCenterCreate`。

### 3.2 请求类型

定义于 `internal/types/fault_center.go`：

- `RequestFaultCenterCreate` / `RequestFaultCenterUpdate`：与模型字段对应；`TenantId` 由控制器从 Gin Context `TenantID` 注入。
- `RequestFaultCenterQuery`：用于 List（Query 绑定）、Delete（JSON）、Search（Query）。**注意**：`Query` 字段 tag 写为 `` `from:"query"` ``，疑似笔误，可能导致 **列表关键词 `query` 无法从 query string 绑定**，若线上需要搜索应修复为 `form:"query"`。
- `RequestFaultCenterReset`：`id` + 可选 `name`、`description`、`aggregationType`。
- `RequestFaultCenterSLO`：仅作为 **响应体形状**（`Slo` 接口返回 `MTTA`/`MTTR` 切片）。

### 3.3 控制器与绑定

- 写接口：`BindJson`；List/Search/Slo：`BindQuery`。
- 成功均走 `api.Service` → `response.Success`，`data` 为服务返回值。

### 3.4 与前端 SysWatch 对齐的响应体

本仓库前端约定：`{ code: 200, data, msg }`（并兼容 `code: 0`）。后端若与 WatchAlert 完全一致，请保持同一信封，避免前端 `unwrapW8t` 分支膨胀。

---

## 4. Service 层

文件：`internal/services/fault_center.go`，实现 `InterFaultCenterService`。

### 4.1 Create

1. 组装 `models.FaultCenter`，`ID = "fc-" + tools.RandId()`，`CreateAt = time.Now().Unix()`。
2. `ctx.DB.FaultCenter().Create`。
3. `ctx.Redis.FaultCenter().PushFaultCenterInfo(fc)`。
4. 若 `alert.IsLeader()`：`alert.ConsumerWork.Submit(fc)`；否则 `tools.PublishReloadMessage`（`ChannelFaultCenterReload`，`ActionCreate`）。

### 4.2 Update

1. `DB.FaultCenter().Update` 全量更新（见 repo `Updates`）。
2. `PushFaultCenterInfo`。
3. Leader：`ConsumerWork.Stop(id)` + `Submit(fc)`；Follower：Pub `ActionUpdate`。

### 4.3 Delete

1. `DB.FaultCenter().Delete(tenantId, id)`。
2. `RemoveFaultCenterInfo(BuildFaultCenterInfoCacheKey(...))`。
3. Leader：`ConsumerWork.Stop`；Follower：Pub `ActionDelete`。

### 4.4 List

1. `DB.FaultCenter().List(tenantId, r.Query)` — 仓储层对 `query` 做 `name/id/description` 的 `LIKE`。
2. 对每个中心 `Redis.Alert().GetAllEvents(BuildAlertEventCacheKey(tenantId, fc.ID))`，遍历事件 `Status`：
   - `models.StatePreAlert` → `CurrentPreAlertNumber++`
   - `models.StateAlerting` → `CurrentAlertNumber++`
   - `models.StatePendingRecovery` → `CurrentRecoverNumber++`
3. 返回填充后的 `[]models.FaultCenter`。

### 4.5 Get（Search 接口）

`DB.FaultCenter().Get(tenantId, id, name)`：`id`/`name` 条件组合查询单条。

### 4.6 Reset

1. `DB.FaultCenter().Reset(...)` — 见 §5.2 已知实现问题。
2. 再 `Get` 拉取最新实体，`PushFaultCenterInfo`。
3. Leader：`Stop` + `Submit`；Follower：Pub `ActionUpdate`（与 Update 相同 action）。

### 4.7 Slo

1. `DB.Event().GetHistoryEvent`：`FaultCenterId = r.ID`，分页 `Size: 999999` 拉取历史事件。
2. 以「今天往前共 7 个自然日」为窗口，每天 `[00:00:00, 23:59:59]` Unix 范围。
3. **MTTR**：当日 `RecoverTime` 落在窗口内且 `RecoverTime > FirstTriggerTime` 的事件，取平均 `(RecoverTime - FirstTriggerTime)`（秒）。
4. **MTTA**：当日 `ConfirmState.ConfirmActionTime` 在窗口内且与 `FirstTriggerTime` 有效的事件，平均 `(ConfirmActionTime - FirstTriggerTime)`（秒）。
5. 返回 `types.RequestFaultCenterSLO`：`MTTR`、`MTTA` 各 7 个 float（与前端折线图顺序一致：从旧到新）。

---

## 5. 仓储层

文件：`internal/repo/fault_center.go`。

- `List`：`tenant_id` 可选过滤；`query` 非空时 `name OR id OR description LIKE %query%`。
- `Get`：`tenant_id` + (`name` 或 `id`) 条件 `First`。
- `Reset`：通过 `Update` 结构逐字段更新。**实现缺陷**：`update` 变量在多个 `if` 中被整体替换，若一次请求中多个字段非空，**只有最后一次赋值的字段会生效**（最后一个 `if` 覆盖前面的切片）。若需多字段同事务更新，应改为追加字段或单次 `map` 更新。

---

## 6. Redis 缓存

文件：`internal/cache/faultCenter.go`（接口在 `internal/cache/entry.go` 注册）。

典型能力：`PushFaultCenterInfo`、`RemoveFaultCenterInfo`、`GetFaultCenterInfo`（供 `alert/eval`、`alert/process`、`alert/consumer` 使用）。

---

## 7. 与告警流水线的集成

### 7.1 事件写入

`alert/process/process.go`：`PushEventToFaultCenter` 将评估产生的事件推入 Redis，并关联 `FaultCenter` 缓存信息（用于恢复等待等）。

### 7.2 规则恢复

`alert/eval/alert_rule.go`：`Recover` 使用 `BuildAlertEventCacheKey` / `BuildFaultCenterInfoCacheKey` 清理或保留事件，并按 `recoverWaitTime` 控制恢复节奏。

### 7.3 消费者

`alert/consumer/consumer.go`：

- 定时从 Redis 读取该中心全部事件，`filterAlertEvents` / `validateEvent`（重复通知间隔，单位分钟转秒与 `LastSendTime` 比较）。
- `alarmGrouping` → `sendAlerts` → `processAlertGroup` → `handleAlert`（`alert/consumer/handle.go`）：模板、静默 `mute.IsMuted`、发送器 `sender.Sender`。
- `alarmAggregation`：`aggregationType == "Rule"` 时 `withRuleGroupByAlerts`。
- `processSilenceRule`：处理静默规则同步等（见同包内实现）。
- `alarmUpgrade`（`upgrader.go`）：按故障中心升级配置聚合超时事件并向升级通知对象发送。

### 7.4 应用启动与重载

`alert/alert.go`：启动时注册 Redis 订阅 `ChannelFaultCenterReload`，`handleFaultCenterReload` 根据消息对应用 `Submit`/`Restart`/`Stop` 消费者。

---

## 8. Pub/Sub 与通道

- 通道常量：`pkg/tools/redis_pubsub.go` 中 `ChannelFaultCenterReload = "w8t:faultcenter:reload"`。
- 消息体：`tools.ReloadMessage`（含 `Action`、`ID`、`TenantID`、`Name` 等）。

---

## 9. 工作台（跨模块）

`api/dashboardInfo.go`：`GET /api/system/getDashboardInfo`  

根据 Query `faultCenterId` 加载指定 `FaultCenter`，从 Redis 统计当前告警列表与 P0/P1/P2 分布（与事件 `Severity` 字段一致）。

---

## 10. 类型与审计

- 请求 DTO：`internal/types/fault_center.go`。
- 写操作走 `AuditingLog` 中间件的操作需保证审计落库字段完整（见 `internal/middleware/AuditingLog.go`）。

---

## 11. 维护建议（联调前优先项）

1. 修复 `RequestFaultCenterQuery` 中 `Query` 的 struct tag，确保列表搜索与文档一致（`form:"query"`）。
2. 修复 `fault_center_repo.Reset` 的多字段更新逻辑。
3. 若 `Slo` 需权限控制，在 `api/faultCenter.go` 中为 `slo` 路由增加 `Permission()` 并在角色数据中增加对应 path。
4. `BindJson` 在 `api/entry.go` 中使用 `ctx.ShouldBindJSON(&req)`：若 `req` 已为指针类型，应改为 `ShouldBindJSON(req)`，避免绑定失败（属全局 API 层问题，联调时关注）。

---

## 12. 关键文件索引（Go / WatchAlert）

| 层级 | 路径 |
|------|------|
| 路由 | `internal/routers/v1/api.go` |
| API | `api/faultCenter.go` |
| Service | `internal/services/fault_center.go` |
| Repo | `internal/repo/fault_center.go` |
| Model | `internal/models/fault_center.go` |
| Types | `internal/types/fault_center.go` |
| 缓存 | `internal/cache/faultCenter.go` |
| 消费者 | `alert/consumer/*.go` |
| 事件推送 | `alert/process/process.go` |
| 重载订阅 | `alert/alert.go` |

---

## 13. Java（Spring Boot）技术栈映射

以下将 WatchAlert Go 中的概念映射到常见 **Java 17 + Spring Boot 3** 技术选型，便于团队用 Java 复刻网关、BFF 或完整告警引擎（按范围裁剪）。

### 13.1 分层与注解对照

| WatchAlert（Go） | Spring Boot 常见做法 |
|------------------|----------------------|
| `gin.RouterGroup` + `faultCenterController` | `@RestController` + `@RequestMapping("/api/w8t/faultCenter")`，子路径用 `@PostMapping("faultCenterCreate")` 等 |
| `api.Service` + `response.Success/Fail` | 统一 `ResponseEntity` 或包装类 `ApiResult<T>(code, data, msg)`，与现有 `{code,data,msg}` 对齐便于 Vue 直连 |
| `middleware.Auth` | `OncePerRequestFilter` / Spring Security `JwtAuthenticationFilter`，校验 `Authorization`、`X-API-Key` |
| `middleware.ParseTenant` | 读取头 `TenantID`，校验租户存在后写入 `RequestContextHolder` 或 `TenantContext` ThreadLocal |
| `middleware.Permission` | 方法级 `@PreAuthorize`、自定义 `PermissionEvaluator`，或 URL 与角色权限表全路径匹配（与 Go 一致） |
| `middleware.AuditingLog` | `@Aspect` + 注解 `@Audit`，或 Spring Data Envers / 自建审计表 |
| `services.FaultCenterService` | `@Service` 事务边界 `@Transactional` |
| `repo.faultCenterRepo` + GORM | **JPA**：`JpaRepository<FaultCenterEntity, String>` + `@Query`；**MyBatis-Plus**：`BaseMapper` + XML/SQL |
| `internal/types/*` DTO | `record` / Lombok `@Data` + `jakarta.validation`（`@NotBlank` 等） |

### 13.2 实体与表

- 表名：`w8t_fault_center`（与 Go `TableName()` 一致）。
- JSON 列（`noticeIds`、`noticeRoutes`、`repeatNoticeInterval` 等）：JPA 可用 `@JdbcTypeCode(SqlTypes.JSON)`（Hibernate 6）或拆关联表；MyBatis 可用 `JacksonTypeHandler` / 字符串存 JSON。
- 主键 `id`：创建时仍建议 `fc-` + 随机串（与现有前端/数据习惯一致），可用 `UUID` 或雪花算法统一风格。

### 13.3 Redis

| Go | Java |
|----|------|
| `ctx.Redis.FaultCenter().PushFaultCenterInfo` | `RedisTemplate<String, String>` / `StringRedisTemplate`；值序列化为 JSON 字符串 |
| `BuildFaultCenterInfoCacheKey` 等键格式 | **常量类**复刻相同 key 模板，避免与 Go 进程读写不一致 |
| `ChannelFaultCenterReload` Pub/Sub | `RedisMessageListenerContainer` + `MessageListenerAdapter`；消息体 DTO 与 Go `ReloadMessage` 字段对齐 |

### 13.4 定时消费与 Leader 选举

| Go | Java |
|----|------|
| `Consume.Watch` 每故障中心一个 goroutine + `time.Ticker` | `@Scheduled(fixedDelay = …)` **不推荐**每中心一个注解；更常见：**单线程调度器** `TaskScheduler` + 注册表 `Map<String, ScheduledFuture>` 动态启停，语义接近 `Submit`/`Stop` |
| `alert.IsLeader()` | **ShedLock** / **Redisson** `RLock` + 短租约；或 K8s Lease；只有 Leader 执行 `Watch` 循环 |
| 集群 Follower 发 Pub 通知重载 | 与 Go 相同：写 Redis 频道，Leader 监听后 `restart consumer` |

### 13.5 与告警评估、事件流的衔接

若 Java **仅做管理面 CRUD + 读 Redis 统计**：实现 §3 HTTP + §4 中 List 的 Redis 扫描逻辑即可，**消费者仍跑在 Go WatchAlert**。

若 Java **全量接管告警引擎**：需移植 `alert/process`、`alert/consumer`、`alert/eval` 等行为，工作量大，建议分阶段（先 API 与缓存键兼容，再迁消费者）。

### 13.6 OpenAPI 与前端协作

- 用 **springdoc-openapi** 从 Controller 生成 OpenAPI 3，给 Vue 团队导入 **openapi-typescript** 生成 `types`，减少手写类型漂移。
- 响应结构若使用 `Result<T>`，在文档中明确 `code` 与 WatchAlert 的 200/400/401/403 语义一致，前端 Axios 拦截器可少分支。

### 13.7 Slo 与历史事件

- `GetHistoryEvent` + 7 天窗口聚合：Java 中放在 `@Service` 方法内，用 `Stream` 过滤 `recoverTime`、`confirmActionTime`；注意时区与「自然日」边界与 Go `time.Date` 行为一致（建议统一 **UTC** 或统一 **Asia/Shanghai** 并写单测）。

---

## 14. 文档与代码双源

- **行为与路径以 Go 源码为准**；Java 为映射建议，落地时以联调与单测为准。
- 若 WatchAlert 仓库内另有 `fault-center-frontend.md` 等文档，与本节冲突时以 **实现代码** 为准并回写文档。

---

## 15. 与本仓库（syswatch-ui）前端交叉引用

- Vue 侧接口路径、权限 Path 列表、页面能力：`docs/faultcenter-api.md`
- 前端实现：`src/api/faultcenter.js`、`src/views/faultcenter/FaultCenterList.vue`、`src/views/faultcenter/FaultCenterCreateModal.vue`

后端实现 **List 返回数组**、**Search 返回单对象**、**SLO 返回 `mtta`/`mttr` 各 7 个 float** 时，应与上述前端 `unwrapW8t` 及字段命名保持一致（大小写以实际 JSON tag 为准，联调时核对 `MTTA` vs `mtta` 等别名）。

---

## 16. 权限路径清单（角色表 `API` 字段）

须与 **完整 URL Path** 字符串一致（示例）：

| 操作 | HTTP | Path |
|------|------|------|
| 创建 | POST | `/api/w8t/faultCenter/faultCenterCreate` |
| 更新 | POST | `/api/w8t/faultCenter/faultCenterUpdate` |
| 删除 | POST | `/api/w8t/faultCenter/faultCenterDelete` |
| 重置 | POST | `/api/w8t/faultCenter/faultCenterReset` |
| 列表 | GET | `/api/w8t/faultCenter/faultCenterList` |
| 查询 | GET | `/api/w8t/faultCenter/faultCenterSearch` |
| SLO | GET | `/api/w8t/faultCenter/slo` |
| 工作台 | GET | `/api/system/getDashboardInfo` |

`event/*`、`rule/*`、`silence/*` 等同理，按 WatchAlert 路由注册与中间件实际挂载为准。

---

## 17. 告警统计、业务分类与列表扩展字段（产品 / 后端建议）

### 17.1 与「告警统计」的关系

- **故障中心列表**接口（`faultCenterList`）在 WatchAlert 实现中会为每条记录填充 `currentPreAlertNumber`、`currentAlertNumber`、`currentRecoverNumber`（按 Redis 中该中心下事件状态统计）。前端在「故障中心」页以三列数字展示，即**按中心的实时告警统计**。
- 若需要**按告警类型 / 业务线 / 数据库 / 中间件**维度看统计，推荐**多故障中心**建模：每个维度（或每个租户下的子域）一个中心，将对应告警规则绑定到该中心（`faultCenterId`）；规则上的 **labels** 仍可配合 `noticeRoutes` 做通知分流。
- 更细粒度「按类型聚合的仪表盘」可由后端新增接口（例如按 `faultCenterId` + 时间范围 + `group by ruleGroup/label`）提供；本仓库前端可在故障中心详情或独立看板中消费，与现有 List 三列互补。

### 17.2 列表展示「分类」列（可选扩展）

本仓库前端在列表增加 **「分类」**列，优先展示以下字段（任一存在即可，字符串化后截断显示）：

| 优先级 | 字段 | 说明 |
|--------|------|------|
| 1 | `category` | 业务自定义分类，如 `mysql`、`kafka`、`订单域` |
| 2 | `scope` | 与 `category` 二选一，语义由产品约定 |
| 3 | `tags` | 字符串数组，拼接为 `、` 分隔 |
| 4 | `labels` | 对象数组时可取 `name` 或 `key` 拼接 |

后端若尚未返回上述字段，列显示为「—」，不影响接口兼容。扩展时建议在 `w8t_fault_center` 或 List 的 DTO 中增加 `category`/`scope`/`tags`（及 JSON tag），与前端 `FaultCenter.vue` 中 `scopeLabel` 一致。

### 17.3 与创建弹窗表单的契约（当前实现）

创建入口为**列表页弹窗**（非独立路由页），提交 **`POST /api/w8t/faultCenter/faultCenterCreate`**，请求体由前端 `FaultCenterCreateModal.vue` 中 `buildBodyFromForm()` 组装，字段与 WatchAlert `RequestFaultCenterCreate` / `FaultCenter` 模型对齐。

**校验（前端 + 建议后端一致）**

- `name`：必填，trim 后非空；名称中不允许空格（前端拦截空格输入）。
- `noticeIds` 与 `noticeRoutes`：**至少其一有效**——默认通知对象非空，或存在至少一条「含 `noticeIds` 或有效 `labels`」的路由（空 key/value 的 label 会被前端过滤）。

**固定常量（创建时写死，与 WatchAlert 消费者一致）**

- `aggregationType`: `"Rule"`
- `recoverNotify`: `true`

**升级相关（弹窗未暴露 UI 时为默认）**

- `isUpgradeEnabled`: `false`
- `upgradableSeverity`: `[]`
- `upgradeStrategy`: `{ enabled: false, timeout: 0, repeatInterval: 0, noticeId: "" }`

更完整的 JSON 形状与示例见 **第 18 节**。

编辑时可走详情页或后续「编辑」能力维护 `noticeRoutes`、分等级重复间隔与告警升级策略；**更新**仍走 `faultCenterUpdate` 全量字段，后端行为与现有模型一致。

---

## 18. `faultCenterCreate` 请求/响应契约（联调清单）

### 18.1 HTTP

| 项 | 值 |
|----|-----|
| Method | `POST` |
| Path | `/api/w8t/faultCenter/faultCenterCreate` |
| Content-Type | `application/json` |
| 租户 | `TenantId` 由网关 / `ParseTenant` 注入，**请求体可不传** |

### 18.2 请求体（与前端发送字段一致）

```json
{
  "name": "订单核心",
  "description": "可选说明",
  "noticeIds": ["uuid-notice-a", "uuid-notice-b"],
  "noticeRoutes": [
    {
      "labels": [
        { "key": "team", "value": "payment", "operator": "=" }
      ],
      "noticeIds": ["uuid-oncall-pay"]
    }
  ],
  "repeatNoticeInterval": {
    "0": 60,
    "1": 60,
    "2": 60
  },
  "recoverNotify": true,
  "aggregationType": "Rule",
  "recoverWaitTime": 30,
  "isUpgradeEnabled": false,
  "upgradableSeverity": [],
  "upgradeStrategy": {
    "enabled": false,
    "timeout": 0,
    "repeatInterval": 0,
    "noticeId": ""
  }
}
```

说明：

- `repeatNoticeInterval` 的 key 为**字符串**形式的严重级别（与 WatchAlert 一致：`"0"`/`"1"`/`"2"` 对应 P0/P1/P2 等），值为**分钟**。
- `noticeRoutes[].labels[].operator` 允许：`=`、`!=`、`=~`、`!~`（与规则 label matcher 一致）。
- `noticeRoutes` 可为 `[]`；若 `noticeIds` 非空则允许无路由。

### 18.3 成功响应 `data`（前端解析）

统一信封：`{ "code": 200, "data": ..., "msg": "" }`（或 `code: 0`）。

前端 `extractCreatedId` 兼容以下 `data` 形状（用于创建成功后跳转详情）：

1. 字符串：新中心 ID，例如 `"fc-xxxx"`  
2. 对象：含 `id` 字段，例如 `{ "id": "fc-xxxx", ... }`

若 `data` 无法解析出 id，前端仍关闭弹窗并刷新列表，但不跳转详情。

### 18.4 失败响应

`code !== 200 && code !== 0` 时，`msg`（或 `message`）应携带可读错误信息；前端原样展示给用户。
