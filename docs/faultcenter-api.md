# 故障中心（Fault Center）— 前端对接说明

本仓库前端已与 **WatchAlert 风格**后端对齐（`/api/w8t`、`/api/system`、统一响应体）；`TenantID` 由网关或后端自行处理时，前端可不传。

**后端实现与 Go/Java 映射**（领域模型、Service、Redis、消费者、已知缺陷与维护建议）见同目录：**[`fault-center-backend.md`](./fault-center-backend.md)**。

## 全局约定

- **鉴权**：`Authorization: Bearer <token>`（由 `src/utils/http.js` 自动附加）
- **租户 / TenantID**：当前前端**暂不**在页面上配置，也不在 HTTP 拦截器里自动带 `TenantID`；若后端网关或 BFF 已注入租户，可直接联调。若需恢复「请求头 TenantID」，再在 `http.js` 与故障中心页加回即可。
- **响应体**：`{ code: 200, data, msg }`（前端 `unwrapW8t` 同时兼容 `code: 0`）

## 前端封装

- `src/api/faultcenter.js`：`faultCenterList` / `faultCenterSearch` / `faultCenterCreate` / `faultCenterUpdate` / `faultCenterDelete` / `faultCenterReset` / `faultCenterSlo`、`getDashboardInfo`、`unwrapW8t`
- `src/views/faultcenter/FaultCenter.vue`：列表、新建/编辑、删除、重置、SLO、工作台总览弹窗

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

完整字段与嵌套类型以你整理的 WatchAlert 文档为准。

**告警管理（规则组 / 规则 / 事件 / 静默）后端实施路线与接口检查单**：[`alert-management-backend-plan.md`](./alert-management-backend-plan.md)。
