## Context

参见 `proposal.md` 的背景说明。当前 `backend` 已在 PostgreSQL 中建有 `device_states` 表（包含 `device_key`、`state`、`last_online_time`、`last_offline_time`），且设备列表、详情页与大盘统计均已关联查询该表；`data-engine` 也已在 `internal/event/topic.go` 中预留了 `TopicDeviceOnlineStatus = "device-online-status"` 常量，但尚未在 EMQX 侧配置上下线事件转发规则，也未在 `data-engine` 中实现对应的消费与落库逻辑。

## Goals / Non-Goals

**Goals:**
- 通过 EMQX 原生 `$events/client_connected` 和 `$events/client_disconnected` 事件驱动设备在线/离线状态更新。
- 将 `device_states.state` 统一规范为整型（`0 = 离线`，`1 = 在线`，`2 = 未激活`）。
- 保证闪断重连（`takenover`）或事件乱序到达时状态不反转且上下线时间戳单调递增。
- 保持 `data-engine` 无状态，不侵入现有的遥测、事件和 OTA 消费链路。
- 由 `backend` 将 `lastOnlineTime` / `lastOfflineTime` / `invokedAt` 统一格式化为时间字符串返回，前端直接展示后端时间。
- 打通物模型服务调用（RPC 下发与设备回执）全链路闭环。

**Non-Goals:**
- 不在 `data-engine` 内部维护内存级活跃度缓存或定时轮询扫描器（心跳过期检测直接复用 EMQX 的 MQTT KeepAlive 超时机制）。

## Decisions

### 1. 直接以 MQTT `clientid` 作为 `device_key`
- **决策**：约定设备连接 MQTT Broker 时 `clientid` 即为 `device_key`，EMQX 规则直接映射 `clientid AS device_key`。
- **理由**：`$events/client_connected` 与 `$events/client_disconnected` 不包含业务 Topic，直接使用 `clientid` 避免了在 EMQX 或 `data-engine` 中额外维护复杂的凭证映射表；对于非设备连接（如系统内部客户端 `0things-transport-mqtt`），由于 `device_states` 表中无对应 `device_key`，`UPDATE` 影响行数为 0，天然安全忽略。
- **备选方案**：在业务上行（遥测/事件）中顺带更新在线状态并配合后台定时扫描超时。因平台已统一使用 EMQX 作为接入层，EMQX 原生 KeepAlive 超时即可触发 `$events/client_disconnected`，无需在 `data-engine` 重复实现状态机与轮询。

### 2. 消息契约与重连乱序防护
- **决策**：
  - EMQX 规则输出标准 `DeviceMessage` 信封（`message_type = "online_status"`，`transport = "mqtt"`），`payload` 为包含 `event`（`"client.connected"` 或 `"client.disconnected"`）与 `reason`（断开原因）的 JSON。
  - Kafka Sink 使用 `${.device_key}` 作为消息 Key，确保同一设备的上下线事件进入同一分区顺序消费。
  - 在 `data-engine` 处理上下线事件时：
    1. 处理 `client.connected` 时，仅当 `last_offline_time IS NULL OR last_offline_time <= ts` 时将状态置为 `1`（在线），防止旧连接事件晚于新断开事件到达时反转离线状态；
    2. 处理 `client.disconnected` 时，若 `reason == "takenover"`（同一 `clientid` 新连接顶替旧连接触发的旧会话断开），直接忽略，防止把刚上线的新会话误标为 `0`（离线）；
    3. 更新离线状态时附带条件 `last_online_time IS NULL OR last_online_time <= ts`，防止旧断开事件晚于新连接事件到达时覆盖最新在线状态（`1`）。

### 3. 后端统一格式化上下线时间字符串，前端直接展示
- **决策**：在 `backend/api/v1/device.go` 中将 `v1.Device` 的 `LastOnlineTime` 与 `LastOfflineTime` 类型改为 `*string`，并在 `backend/internal/handler/device.go` 的 `deviceJSON` 中使用 `carbon.CreateFromTimestampMilli(*ts).ToDateTimeString()`（使用服务器默认时区）格式化；前端 `device-info-tab.tsx` 与 `devices-columns.tsx` 不做时间转换，直接渲染后端返回的字符串。
- **理由**：与 `backend/internal/handler/organization.go`、`ota.go` 的时间处理方式保持一致，消除前端多处重复解析时间戳的逻辑与 `Invalid time value` 异常。

## Risks / Trade-offs

- **[Risk] 设备未使用 `device_key` 作为 MQTT `clientid`** → **Mitigation**：更新 `scripts/mock_device/main.go` 使用 `*deviceKey` 作为 `ClientID`，并在 EMQX 文档中明确说明 `clientid` 规范。
- **[Risk] 同名客户端重连引发 `takenover` 假离线** → **Mitigation**：在 `DeviceStateService` 中显式过滤 `reason == "takenover"` 并校验 `last_online_time <= ts`。

