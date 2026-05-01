# 故障中心后端接口约定（参考 WatchAlert 风格）

本模块用于“故障/事件/工单”的统一管理（聚合来自告警、日志、巡检、拨测等信号）。  
当前仓库阶段：**仅新增前端页面与接口文档，不改造现有告警/日志等功能**。

## 统一约定

- **鉴权**：`Authorization: Bearer <token>`
- **权限**：`menu:faultcenter`（前端已新增对应权限码）
- **响应体**：推荐统一信封：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

前端也会兼容“直接返回 data”。

## 数据模型（建议）

### Incident（故障事件）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 故障 ID（全局唯一） |
| `title` | string | 故障标题 |
| `summary` | string | 摘要（可选） |
| `description` | string | 详细描述（可选） |
| `severity` | string | `P0/P1/P2/P3` |
| `status` | string | `open/ack/in_progress/resolved` |
| `service` | string | 影响服务（可选） |
| `startedAt` | string | 发生时间（ISO8601） |
| `resolvedAt` | string | 恢复时间（ISO8601，可选） |
| `labels` | object | 标签（可选） |
| `assignee` | string | 负责人（可选） |
| `source` | string | 来源（如 alert/log/probe/manual，可选） |

## `GET /api/faultcenter/stats`

返回状态统计，用于页面顶部卡片。

### 查询参数（可选）

- `startTime` / `endTime`：ISO8601
- `severity`：`P0/P1/P2/P3`
- `service`

### 响应示例

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "open": 3,
    "ack": 1,
    "in_progress": 2,
    "resolved": 12
  }
}
```

## `GET /api/faultcenter/incidents`

故障列表（分页）。

### 查询参数

- `pageNum`：页码，从 1 开始
- `pageSize`：分页大小
- `q`：搜索关键词（标题/服务/主机等）
- `severity`：`P0/P1/P2/P3`
- `status`：`open/ack/in_progress/resolved`
- `startTime` / `endTime`：ISO8601

### 响应示例

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "records": [
      {
        "id": "INC-20260501-0001",
        "title": "订单服务 5xx 激增",
        "summary": "xx 集群出现连接耗尽",
        "severity": "P0",
        "status": "open",
        "service": "order-service",
        "startedAt": "2026-05-01T14:02:11.000Z",
        "labels": {
          "cluster": "prod",
          "region": "ap-shanghai"
        }
      }
    ],
    "total": 1
  }
}
```

## `GET /api/faultcenter/incidents/{id}`

故障详情。

### 响应示例

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "INC-20260501-0001",
    "title": "订单服务 5xx 激增",
    "description": "影响范围：下单接口；初步定位：连接池耗尽",
    "severity": "P0",
    "status": "in_progress",
    "service": "order-service",
    "startedAt": "2026-05-01T14:02:11.000Z",
    "assignee": "oncall-a",
    "labels": {
      "cluster": "prod"
    }
  }
}
```

## `POST /api/faultcenter/incidents/{id}/ack`

确认故障（ack）。

### 请求体（可选）

```json
{
  "note": "已接手处理"
}
```

## `POST /api/faultcenter/incidents/{id}/resolve`

标记已恢复。

### 请求体（可选）

```json
{
  "note": "回滚版本后恢复",
  "resolvedAt": "2026-05-01T15:12:00.000Z"
}
```

## `POST /api/faultcenter/incidents/{id}/assign`

指派负责人。

### 请求体

```json
{
  "assignee": "oncall-b",
  "note": "转交网络组排查"
}
```

## `POST /api/faultcenter/incidents/{id}/ai/summary`（可选）

返回 AI 生成的摘要/根因建议（对齐你仓库的智能诊断方向）。

### 请求体（示例）

```json
{
  "include": ["alerts", "logs", "metrics"],
  "maxTokens": 800
}
```

