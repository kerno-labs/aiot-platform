## ADDED Requirements

### Requirement: EMQX 连接与断开事件转发
系统 SHALL 通过 EMQX 规则监听 `$events/client_connected` 与 `$events/client_disconnected` 系统事件，将 MQTT `clientid` 映射为 `device_key`，并封装为标准 `DeviceMessage`（`message_type = "online_status"`，`transport = "mqtt"`）投递至 Kafka `device-online-status` 主题。

#### Scenario: 设备建立 MQTT 连接
- **WHEN** 设备以 `clientid = "<device_key>"` 成功连接至 EMQX
- **THEN** EMQX 触发 `$events/client_connected` 并将包含 `device_key`、`timestamp` 及事件载荷的消息写入 Kafka `device-online-status` 主题

#### Scenario: 设备主动断开或心跳超时断开
- **WHEN** 设备主动发送 `DISCONNECT` 或因断电/断网触发 EMQX `keepalive_timeout` / `tcp_closed`
- **THEN** EMQX 触发 `$events/client_disconnected` 并将包含 `device_key`、`timestamp`、`reason` 的消息写入 Kafka `device-online-status` 主题

### Requirement: 设备在线状态与上下线时间同步
`data-engine` SHALL 消费 `device-online-status` 主题消息并同步更新 `device_states` 表中的整型状态 `state`（`0 = 离线`，`1 = 在线`，`2 = 未激活`）、`last_online_time` 与 `last_offline_time`。

#### Scenario: 收到上线事件更新为在线
- **WHEN** `data-engine` 收到已注册设备的 `client.connected` 事件（时间戳为 `ts`），且当前 `last_offline_time` 为空或小于等于 `ts`
- **THEN** 系统将该设备的 `device_states.state` 更新为 `1`（在线），并将 `last_online_time` 更新为 `ts`（若原 `last_online_time` 更大则保留较大值）

#### Scenario: 收到正常或超时断开事件更新为离线
- **WHEN** `data-engine` 收到已注册设备的 `client.disconnected` 事件（时间戳为 `ts`），且断开原因 `reason` 不为 `takenover`，同时当前记录的 `last_online_time` 为空或小于等于 `ts`
- **THEN** 系统将该设备的 `device_states.state` 更新为 `0`（离线），并将 `last_offline_time` 更新为 `ts`

#### Scenario: 忽略会话顶替（takenover）与过期乱序上下线事件
- **WHEN** `data-engine` 收到 `reason == "takenover"` 的 `client.disconnected` 事件，或断开事件时间戳 `ts < last_online_time`，或上线事件时间戳 `ts < last_offline_time`
- **THEN** 系统忽略该次在线/离线状态反转，保持设备最新状态不变

#### Scenario: 忽略未知客户端连接事件
- **WHEN** `data-engine` 收到的 `device_key` 在 `device_states` 表中不存在（如平台内部客户端）
- **THEN** 系统静默忽略该消息且不返回消费错误

### Requirement: 设备上下线时间与服务调用时间格式化返回与前端直接展示
`backend` SHALL 使用服务器默认时区将设备状态中的毫秒时间戳（`last_online_time`、`last_offline_time`）及服务调用时间（`invoked_at`）格式化为日期时间字符串（`YYYY-MM-DD HH:mm:ss`）通过 `v1.Device` 与 `v1.DeviceServiceInvocation` 返回，设备状态 `state` 采用整型（`0 = 离线`，`1 = 在线`，`2 = 未激活`），前端直接展示后端返回的时间字符串。

#### Scenario: 展示设备最后上线与最后离线时间
- **WHEN** 用户查看设备列表或设备详情页，且设备的 `last_online_time` 或 `last_offline_time` 存在有效毫秒时间戳
- **THEN** `backend` 返回服务器默认时区格式化后的时间字符串，前端无需做时间转换即可直接展示可读时间字符串

### Requirement: 物模型服务调用（RPC 下发与回执）全链路闭环
系统 SHALL 支持对在线设备发起物模型服务调用（`POST /devices/:deviceKey/thing-model/services/:serviceIdentifier/invoke`），校验设备在线状态（`state == 1`）与产品 TSL 服务定义后，通过 Kafka `device-service-invoke` 与 EMQX 下发至设备 `/sys/thing/service/invoke/{productKey}/{deviceKey}`，并由 EMQX 转发 `/sys/thing/service/reply/{productKey}/{deviceKey}` 回执至 Kafka `device-service-reply`，由 `data-engine` 更新 `device_service_invocations.output_params`。

#### Scenario: 在线设备服务调用与回执成功
- **WHEN** 用户在设备详情页发起产品物模型已定义的服务调用且设备处于在线状态（`state == 1`）
- **THEN** `backend` 创建服务调用记录并投递 `device-service-invoke` 消息，设备返回回执后 `data-engine` 将输出载荷写入 `device_service_invocations.output_params`，前端服务调用列表展示调用状态与回执结果

