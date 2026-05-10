# 故障中心（Fault Center）— 前端对接说明

本仓库前端已与 **WatchAlert 风格**后端对齐（`/api/w8t`、`/api/system`、统一响应体）；`TenantID` 由网关或后端自行处理时，前端可不传。

**后端实现与 Go/Java 映射**（领域模型、Service、Redis、消费者、已知缺陷与维护建议）见同目录：**[`fault-center-backend.md`](./fault-center-backend.md)**。

## 全局约定

- **鉴权**：`Authorization: Bearer <token>`（由 `src/utils/http.js` 自动附加）
- **租户 / TenantID**：当前前端**暂不**在页面上配置，也不在 HTTP 拦截器里自动带 `TenantID`；若后端网关或 BFF 已注入租户，可直接联调。若需恢复「请求头 TenantID」，再在 `http.js` 与故障中心页加回即可。
- **响应体**：`{ code: 200, data, msg }`（前端 `unwrapW8t` 同时兼容 `code: 0`）

## 前端封装

- `src/api/faultcenter.js`：`faultCenterList` / `faultCenterSearch` / `faultCenterCreate` / `faultCenterUpdate` / `faultCenterDelete` / `faultCenterReset` / `faultCenterSlo`、`getDashboardInfo`、`unwrapW8t`
- `src/views/faultcenter/FaultCenterList.vue`：列表、删除；**新建**为同页弹窗 `FaultCenterCreateModal.vue`
- `src/views/faultcenter/FaultCenterDetailPage.vue` 及子页：详情、SLO、工作台等
- 旧路径 `/fault-center/create` 会重定向到列表并带 `?openCreate=1`，用于自动打开创建弹窗（书签/外链兼容）

## 权限路径（后端角色表 `API` 字段需与完整 Path 一致）

详见你提供的《故障中心 — 前端对接与功能说明》第 7 节；常见例如：

- `GET /api/w8t/faultCenter/faultCenterList`
- `GET /api/w8t/faultCenter/faultCenterSearch`
- `POST /api/w8t/faultCenter/faultCenterCreate`
- `POST /api/w8t/faultCenter/faultCenterUpdate`
- `POST /api/w8t/faultCenter/faultCenterDelete`
- `POST /api/w8t/faultCenter/faultCenterReset`
- `GET /api/w8t/faultCenter/slo`（当前后端实现多为无 `Permission` 中间件，以实际为准）
- `GET /api/system/getDashboardInfo`

## 关联能力（后续可再接）

- 活跃事件 `GET /api/w8t/event/curEvent?faultCenterId=...`
- 历史事件 `GET /api/w8t/event/hisEvent?...`
- 规则列表前端按 `faultCenterId` 过滤（或扩展后端查询参数）

### 活跃事件：认领 / 删除 / 评论（POST 与查询参数）

- **WatchAlert（Go）** 常见 JSON：`faultCenterId`、`fingerprints`（数组）；评论另含 `fingerprint`、`content`。
- **Java BFF** 若使用 snake_case 校验，会要求 **`fault_center_id`**、**`event_ids`**（与指纹同一语义）；不认 `faultCenterId` / `fingerprints` 时会出现「必填」类错误。
- 本仓库 `src/api/w8tAlert.js` 对 `event/process`、`event/delete`、`event/addComment` 的 body **同时带上 camelCase 与 snake_case**；`curEvent` / `hisEvent` / `listComments` 的 query **同时带 `faultCenterId` 与 `fault_center_id`**（及评论侧的 `fingerprint` / `event_id`），以便 Go 与 Java 联调无需改前端调用处。

完整字段与嵌套类型以你整理的 WatchAlert 文档为准。

**告警管理（规则组 / 规则 / 事件 / 静默）后端实施路线与接口检查单**：[`alert-management-backend-plan.md`](./alert-management-backend-plan.md)。

**Java（Spring Boot）对接 WatchAlert `/api/w8t`（事件/静默/故障中心契约、命名与双写说明）**：[`w8t-java-backend.md`](./w8t-java-backend.md)。  
**仅活跃告警 — 评论 / 认领 / 删除**：[`event-actions-java-backend.md`](./event-actions-java-backend.md)。**Java 认领与列表字段对齐**：[`event-claim-java-syswatch.md`](./event-claim-java-syswatch.md)、[`w8t-event-claim-list-alignment.md`](./w8t-event-claim-list-alignment.md)。规则域详见 [`alert-rules-java-backend.md`](./alert-rules-java-backend.md)。
