# 0things 平台 MQTT & Kafka 消息协议规范

本文档汇总 0things 平台设备端（MQTT）、消息接入层（EMQX 规则引擎）、消息队列（Kafka）以及后端服务（`data-engine` / `backend`）之间的完整消息 Topic 与 JSON 报文格式规范。

---

## 1. 消息流向与 Topic 总览

EMQX 规则引擎配置说明参见 [`deploy/helm/0things/emqx/README.md`](../deploy/helm/0things/emqx/README.md)。

| 方向 | 业务场景 | MQTT Topic / EMQX 事件 | EMQX 规则 SQL | Kafka Topic | Kafka Key 模板 | `message_type` | 生产端 → 消费端 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **上行** | ① 遥测属性上报 | `/sys/thing/property/post/{product_key}/{device_key}` | [`telemetry-uplink.sql`](../deploy/helm/0things/emqx/telemetry-uplink.sql) | `device-telemetry-report` | `${.product_key}/${.device_key}` | `telemetry` | 设备 → EMQX → `data-engine` |
| **上行** | ② 设备事件上报 | `/sys/thing/event/post/{product_key}/{device_key}` | [`device-events-uplink.sql`](../deploy/helm/0things/emqx/device-events-uplink.sql) | `device-event-report` | `${.product_key}/${.device_key}` | `event` | 设备 → EMQX → `data-engine` |
| **上行** | ③ 在线/离线状态 | `$events/client_connected`<br>`$events/client_disconnected` | [`online-status-uplink.sql`](../deploy/helm/0things/emqx/online-status-uplink.sql) | `device-online-status` | `${.device_key}` | `online_status` | EMQX 系统事件 → `data-engine` |
| **上行** | ④ 服务调用回执 | `/sys/thing/service/reply/{product_key}/{device_key}` | [`service-reply-uplink.sql`](../deploy/helm/0things/emqx/service-reply-uplink.sql) | `device-service-reply` | `${.product_key}/${.device_key}` | `service_reply` | 设备 → EMQX → `data-engine` |
| **上行** | ⑤ OTA 升级进度 | `/sys/ota/device/progress/{product_key}/{device_key}` | [`ota-progress-uplink.sql`](../deploy/helm/0things/emqx/ota-progress-uplink.sql) | `ota-progress-report` | `${.product_key}/${.device_key}` | `ota_progress` | 设备 → EMQX → `data-engine` |
| **上行** | ⑥ OTA 版本上报 | `/sys/ota/device/inform/{product_key}/{device_key}` | [`ota-inform-uplink.sql`](../deploy/helm/0things/emqx/ota-inform-uplink.sql) | `ota-device-info` | `${.product_key}/${.device_key}` | `ota_inform` | 设备 → EMQX → `data-engine` |
| **下行** | ⑦ 物模型服务下发 | `/sys/thing/service/invoke/{product_key}/{device_key}` | [`service-invoke-downlink.sql`](../deploy/helm/0things/emqx/service-invoke-downlink.sql) | `device-service-invoke` | `{product_key}/{device_key}` | — | `backend` → Kafka → EMQX → 设备 |
| **下行** | ⑧ OTA 升级指令下发 | `/ota/device/upgrade/{product_key}/{device_name}` | [`ota-downlink.sql`](../deploy/helm/0things/emqx/ota-downlink.sql) | `ota-upgrade-command` | `{product_key}/{device_key}` | — | `backend` → Kafka → EMQX → 设备 |

---

## 2. 上行 Kafka 统一信封规范 (`DeviceMessage`)

所有 **上行（设备/EMQX → Kafka → `data-engine`）** 消息均由 EMQX 规则引擎封装为统一的 `DeviceMessage` 结构（定义见 [`data-engine/internal/event/device.go`](../data-engine/internal/event/device.go)）：

```json
{
  "device_key": "D001",
  "product_key": "P001",
  "transport": "mqtt",
  "message_type": "telemetry",
  "timestamp": 1730000000000,
  "headers": {
    "topic": "/sys/thing/property/post/P001/D001"
  },
  "payload": "{\"id\":\"123\",\"version\":\"1.0\",\"params\":{...}}"
}
```

### 字段说明
- `device_key` (`string`, 必填)：设备唯一标识（在状态事件中取自 MQTT `clientid`）。
- `product_key` (`string`, 可选)：产品唯一标识（`online_status` 事件不含此字段）。
- `transport` (`string`, 必填)：传输协议，枚举值为 `"mqtt"` 或 `"http"`。
- `message_type` (`string`, 必填)：消息分类，枚举值：
  - `telemetry`：遥测属性上报
  - `event`：设备事件上报
  - `online_status`：设备在线/离线状态事件
  - `service_reply`：物模型服务调用回执
  - `ota_progress`：OTA 升级进度上报
  - `ota_inform`：OTA 固件版本上报
- `timestamp` (`int64`, 必填)：EMQX 收到消息或触发事件时的毫秒级 Unix 时间戳。
- `headers` (`map[string]string`, 可选)：附加元数据，包含原始 MQTT `"topic"` 或连接事件类型 `"event"`。
- `payload` (`json.RawMessage`, 必填)：设备原始上报报文（`DeviceMessage.DecodePayload` 同时兼容 EMQX 转发的 JSON 字符串形态与内嵌 JSON 对象形态）。

---

## 3. 上行消息详细定义（Device → EMQX → Kafka → `data-engine`）

### 3.1 遥测属性上报 (`telemetry`)
- **MQTT Topic**: `/sys/thing/property/post/{product_key}/{device_key}`
- **Kafka Topic**: `device-telemetry-report`
- **EMQX 规则**: [`deploy/helm/0things/emqx/telemetry-uplink.sql`](../deploy/helm/0things/emqx/telemetry-uplink.sql)
- **Go 结构体**: `DevicePropertyPostPayload`（[`data-engine/internal/event/device.go`](../data-engine/internal/event/device.go)）

#### 设备端 MQTT Payload 示例
```json
{
  "id": "1001",
  "version": "1.0",
  "params": {
    "temperature": {
      "value": 26.5,
      "time": 1730000000000
    },
    "humidity": {
      "value": 60
    }
  },
  "method": "thing.event.property.post"
}
```
> 说明：采用 Alink 属性上报格式。每个属性独立携带 `value` 与可选采样时间戳 `time`（毫秒）；若未传 `time`，`data-engine` 默认使用外层信封的 `timestamp`。

#### Kafka (`device-telemetry-report`) 消息示例
```json
{
  "device_key": "D001",
  "product_key": "P001",
  "transport": "mqtt",
  "message_type": "telemetry",
  "timestamp": 1730000000120,
  "headers": {
    "topic": "/sys/thing/property/post/P001/D001"
  },
  "payload": "{\"id\":\"1001\",\"version\":\"1.0\",\"params\":{\"temperature\":{\"value\":26.5,\"time\":1730000000000},\"humidity\":{\"value\":60}},\"method\":\"thing.event.property.post\"}"
}
```

---

### 3.2 设备事件上报 (`event`)
- **MQTT Topic**: `/sys/thing/event/post/{product_key}/{device_key}`
- **Kafka Topic**: `device-event-report`
- **EMQX 规则**: [`deploy/helm/0things/emqx/device-events-uplink.sql`](../deploy/helm/0things/emqx/device-events-uplink.sql)
- **Go 结构体**: `DeviceEventPayload`（[`data-engine/internal/event/device.go`](../data-engine/internal/event/device.go)）

#### 设备端 MQTT Payload 示例
```json
{
  "identifier": "overheat_alarm",
  "type": "alert",
  "timestamp": 1730000000000,
  "data": {
    "temperature": 88.6,
    "threshold": 80.0
  }
}
```
> 说明：
> - `identifier` (`string`, 必填)：物模型事件标识符。
> - `type` (`string`, 必填)：事件级别，枚举值为 `info`（信息）、`alert`（告警）、`error`（故障）。
> - `timestamp` (`int64`, 必填)：事件发生时间（毫秒级 Unix 时间戳）。
> - `data` (`object`, 可选)：事件输出参数键值对。

#### Kafka (`device-event-report`) 消息示例
```json
{
  "device_key": "D001",
  "product_key": "P001",
  "transport": "mqtt",
  "message_type": "event",
  "timestamp": 1730000000050,
  "headers": {
    "topic": "/sys/thing/event/post/P001/D001"
  },
  "payload": "{\"identifier\":\"overheat_alarm\",\"type\":\"alert\",\"timestamp\":1730000000000,\"data\":{\"temperature\":88.6,\"threshold\":80.0}}"
}
```

---

### 3.3 设备在线/离线状态事件 (`online_status`)
- **触发源**: EMQX 系统事件 `$events/client_connected` 与 `$events/client_disconnected`（设备连接 MQTT Broker 时需将 `clientid` 设置为 `device_key`）
- **Kafka Topic**: `device-online-status`
- **EMQX 规则**: [`deploy/helm/0things/emqx/online-status-uplink.sql`](../deploy/helm/0things/emqx/online-status-uplink.sql)
- **Go 结构体**: `DeviceOnlineStatusPayload`（[`data-engine/internal/event/device.go`](../data-engine/internal/event/device.go)）

#### Kafka (`device-online-status`) 上线消息示例
```json
{
  "device_key": "D001",
  "transport": "mqtt",
  "message_type": "online_status",
  "timestamp": 1730000000000,
  "headers": {
    "event": "client.connected"
  },
  "payload": "{\"event\":\"client.connected\",\"reason\":null}"
}
```

#### Kafka (`device-online-status`) 离线消息示例
```json
{
  "device_key": "D001",
  "transport": "mqtt",
  "message_type": "online_status",
  "timestamp": 1730000060000,
  "headers": {
    "event": "client.disconnected"
  },
  "payload": "{\"event\":\"client.disconnected\",\"reason\":\"keepalive_timeout\"}"
}
```
> 说明：当离线原因 `reason` 为 `"takenover"`（相同 `clientid` 新会话接管旧会话）时，`data-engine` 会自动忽略该离线事件，防止误将在线设备置为离线。

---

### 3.4 物模型服务调用回执 (`service_reply`)
- **MQTT Topic**: `/sys/thing/service/reply/{product_key}/{device_key}`
- **Kafka Topic**: `device-service-reply`
- **EMQX 规则**: [`deploy/helm/0things/emqx/service-reply-uplink.sql`](../deploy/helm/0things/emqx/service-reply-uplink.sql)
- **Go 结构体**: `DeviceServiceReplyPayload`（[`data-engine/internal/event/device.go`](../data-engine/internal/event/device.go)）

#### 设备端 MQTT Payload 示例（执行成功 `code: 200`）
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "code": 200,
  "data": {
    "result": "ok"
  }
}
```

#### 设备端 MQTT Payload 示例（执行失败 `code != 200`）
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "code": 500,
  "data": {},
  "message": "motor jammed"
}
```
> 说明：
> - `id` (`string`, 必填)：必须与平台下发的服务调用指令 `id`（调用记录 UUID）保持一致。
> - `code` (`int`, 必填)：状态码，`200` 表示成功，非 `200` 表示失败。
> - `data` (`object`, 必填)：服务输出参数（对应物模型服务 `output_data` 定义）。
> - `message` (`string`, 可选)：错误或状态描述信息。

#### Kafka (`device-service-reply`) 消息示例
```json
{
  "device_key": "D001",
  "product_key": "P001",
  "transport": "mqtt",
  "message_type": "service_reply",
  "timestamp": 1730000001200,
  "headers": {
    "topic": "/sys/thing/service/reply/P001/D001"
  },
  "payload": "{\"id\":\"550e8400-e29b-41d4-a716-446655440000\",\"code\":200,\"data\":{\"result\":\"ok\"}}"
}
```

---

### 3.5 OTA 升级进度上报 (`ota_progress`)
- **MQTT Topic**: `/sys/ota/device/progress/{product_key}/{device_key}`
- **Kafka Topic**: `ota-progress-report`
- **EMQX 规则**: [`deploy/helm/0things/emqx/ota-progress-uplink.sql`](../deploy/helm/0things/emqx/ota-progress-uplink.sql)
- **Go 结构体**: `OTAProgressPayload`（[`data-engine/internal/event/ota.go`](../data-engine/internal/event/ota.go)）

#### 设备端 MQTT Payload 示例
```json
{
  "batch_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "step": 65,
  "desc": "downloading firmware",
  "timestamp": 1730000010000
}
```
> 说明：
> - `batch_id` (`string`, 必填)：OTA 升级批次 ID。
> - `step` (`int32`, 必填)：升级进度百分比，取值范围 `0` ~ `100`。
> - `desc` (`string`, 可选)：进度说明或失败原因描述。
> - `timestamp` (`int64`, 可选)：毫秒级 Unix 时间戳。

#### Kafka (`ota-progress-report`) 消息示例
```json
{
  "device_key": "D001",
  "product_key": "P001",
  "transport": "mqtt",
  "message_type": "ota_progress",
  "timestamp": 1730000010050,
  "headers": {
    "topic": "/sys/ota/device/progress/P001/D001"
  },
  "payload": "{\"batch_id\":\"7c9e6679-7425-40de-944b-e07fc1f90ae7\",\"step\":65,\"desc\":\"downloading firmware\",\"timestamp\":1730000010000}"
}
```

---

### 3.6 OTA 固件版本上报 (`ota_inform`)
- **MQTT Topic**: `/sys/ota/device/inform/{product_key}/{device_key}`
- **Kafka Topic**: `ota-device-info`
- **EMQX 规则**: [`deploy/helm/0things/emqx/ota-inform-uplink.sql`](../deploy/helm/0things/emqx/ota-inform-uplink.sql)
- **Go 结构体**: `OTAInformPayload`（[`data-engine/internal/event/ota.go`](../data-engine/internal/event/ota.go)）

#### 设备端 MQTT Payload 示例
```json
{
  "id": "1",
  "module": "default",
  "version": "1.1.0",
  "timestamp": 1730000030000
}
```
> 说明：
> - `id` (`string`, 可选)：消息 ID。
> - `module` (`string`, 可选)：固件模块名称，默认 `"default"`。
> - `version` (`string`, 必填)：设备当前运行的固件版本号。
> - `timestamp` (`int64`, 可选)：毫秒级 Unix 时间戳。

#### Kafka (`ota-device-info`) 消息示例
```json
{
  "device_key": "D001",
  "product_key": "P001",
  "transport": "mqtt",
  "message_type": "ota_inform",
  "timestamp": 1730000030040,
  "headers": {
    "topic": "/sys/ota/device/inform/P001/D001"
  },
  "payload": "{\"id\":\"1\",\"module\":\"default\",\"version\":\"1.1.0\",\"timestamp\":1730000030000}"
}
```

---

## 4. 下行消息详细定义（`backend` → Kafka → EMQX → Device）

下行指令由 `backend` 发布到 Kafka，EMQX Kafka Source 消费后通过 Republish 动作将 JSON 消息体原样转发至对应的 MQTT Topic（Kafka 消息体与设备收到的 MQTT Payload 完全一致）。

### 4.1 物模型服务调用下发 (`DeviceServiceInvokeCommand`)
- **Kafka Topic**: `device-service-invoke`（EMQX Source 名称：`service_invoke_commands`，消费组：`aiot-emqx-service-mqtt`）
- **目标 MQTT Topic**: `/sys/thing/service/invoke/{product_key}/{device_key}`
- **EMQX 规则**: [`deploy/helm/0things/emqx/service-invoke-downlink.sql`](../deploy/helm/0things/emqx/service-invoke-downlink.sql)
- **Go 结构体**: `DeviceServiceInvokeCommand`（[`backend/internal/event/service_invocation.go`](../backend/internal/event/service_invocation.go)）

#### Kafka 消息 & 设备端收到的 MQTT Payload 示例
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "version": "1.0",
  "method": "thing.service.reboot",
  "params": {
    "delay": 5
  },
  "product_key": "P001",
  "device_key": "D001",
  "service_identifier": "reboot"
}
```
> 说明：
> - `id` (`string`)：服务调用唯一标识（UUID），设备执行完成后需在 `/sys/thing/service/reply/{product_key}/{device_key}` 回执中携带相同 `id`。
> - `version` (`string`)：协议版本，固定 `"1.0"`。
> - `method` (`string`)：调用方法名，格式为 `thing.service.{service_identifier}`。
> - `params` (`object`)：服务调用输入参数（对应物模型服务 `input_data` 定义）。
> - `product_key` / `device_key` / `service_identifier` (`string`)：产品 Key、设备 Key 及服务标识符。

---

### 4.2 OTA 升级指令下发 (`OTAUpgradeCommand`)
- **Kafka Topic**: `ota-upgrade-command`（EMQX Source 名称：`ota_upgrade_commands`，消费组：`aiot-emqx-ota-mqtt`）
- **目标 MQTT Topic**: `/ota/device/upgrade/{product_key}/{device_name}`（当 `device_name` 为空时自动回退为 `device_key`）
- **EMQX 规则**: [`deploy/helm/0things/emqx/ota-downlink.sql`](../deploy/helm/0things/emqx/ota-downlink.sql)
- **Go 结构体**: `OTAUpgradeCommand`（[`backend/internal/event/ota.go`](../backend/internal/event/ota.go)）

#### Kafka 消息 & 设备端收到的 MQTT Payload 示例
```json
{
  "batch_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "package_id": "3b241101-e2bb-4255-8caf-4136c566a962",
  "product_key": "P001",
  "device_key": "D001",
  "device_name": "D001",
  "transport": "mqtt",
  "module": "default",
  "target_version": "1.1.0",
  "download_url": "https://iot.example.com/api/v1/ota/packages/3b241101-e2bb-4255-8caf-4136c566a962/download?token=...",
  "file_size": 1048576,
  "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "expires_at": "2026-11-06T10:00:00Z"
}
```

