## Why

当前平台的 `device_states` 表虽然定义了在线状态（`state`）以及最后上线/离线时间戳（`last_online_time`、`last_offline_time`），但没有任何组件消费设备的连接与断开事件，导致所有设备的在线状态始终停留在初始的静态值，首页大盘统计和设备列表筛选无法反映真实在线情况，且前端在渲染毫秒时间戳时存在格式化缺失与白屏隐患。通过将 EMQX 原生的 `$events/client_connected` 与 `$events/client_disconnected` 事件接入 Kafka 并由 `data-engine` 同步至 `device_states`，可以零状态开销实现秒级在线/离线状态感知（含断电 KeepAlive 超时检测）。

## What Changes

- **EMQX 上下线规则转发**：新增 `deploy/helm/0things/emqx/online-status-uplink.sql`，监听 `$events/client_connected` 与 `$events/client_disconnected`（以 `clientid` 作为 `device_key`），转发至 Kafka `device-online-status` 主题，并同步更新 `deploy/helm/0things/emqx/README.md`。
- **`data-engine` 在线状态消费与持久化**：
  - 新增 `model.DeviceState` GORM 模型（`State int`：`0 = 离线`，`1 = 在线`，`2 = 未激活`）及 `gormgen` 查询代码生成。
  - 新增 `DeviceStateRepository`、`DeviceStateService`、`DeviceStateHandler` 与 `DeviceStateConsumer`，在 `consumer.Manager` 中注册订阅 `TopicDeviceOnlineStatus`（`device-online-status`）。
  - 处理 `client.connected` 时将设备状态更新为 `1`（在线）并记录 `last_online_time`；处理 `client.disconnected`（忽略 `reason == "takenover"` 且校验时间戳不早于 `last_online_time`）时将设备状态更新为 `0`（离线）并记录 `last_offline_time`。
- **后端设备状态整型化、上下线与服务调用时间格式化与前端直接展示**：
  - 将 `backend` 与 `frontend` 中的设备状态类型统一改为 `int`（`0 = 离线`，`1 = 在线`，`2 = 未激活`）。
  - 在 `backend` 的 `v1.Device` 与 `v1.DeviceServiceInvocation` 响应契约中，统一使用服务器默认时区的 `carbon` 将 `lastOnlineTime` / `lastOfflineTime` / `invokedAt` 格式化为日期时间字符串返回。
  - 前端设备详情（`device-info-tab.tsx`、`service-invocations-tab.tsx`）与设备列表（`devices-columns.tsx`）无需再做时间转换，直接展示后端返回的时间字符串。
  - 将 `scripts/mock_device/main.go` 的 MQTT `ClientID` 规范为直接使用 `deviceKey`，支持订阅 `/sys/thing/service/invoke/+` 并自动上报服务调用回执，并在 `scripts/start.sh` 中支持 `--prod` 启动参数（使用 `config/prod.yml` 且跳过本地 `data-engine`）。
- **物模型服务调用（RPC 下发与回执）闭环**：
  - 新增 `deploy/helm/0things/emqx/service-invoke-downlink.sql` 与 `service-reply-uplink.sql`。
  - `backend` 实现 `POST /devices/:deviceKey/thing-model/services/:serviceIdentifier/invoke` 下发服务调用并校验产品 TSL 服务定义与设备在线状态（`state == 1`）。
  - `data-engine` 消费 `device-service-reply` 回执并更新 `device_service_invocations.output_params`。
  - 前端设备详情服务调用页支持在线发起服务调用及展示调用状态。

## Capabilities

### New Capabilities
- `device-management/device-online-status`: 基于 EMQX 客户端连接/断开事件与 Kafka `device-online-status` 主题的设备在线/离线状态同步，以及后端统一格式化上下线时间供前端直接展示。

### Modified Capabilities

## Impact

- **EMQX / Helm 文档**：`deploy/helm/0things/emqx/online-status-uplink.sql`、`deploy/helm/0things/emqx/README.md`
- **`data-engine`**：`internal/model/device_state.go`、`internal/dal/query/`（生成）、`internal/event/device.go`、`internal/repository/device_state.go`、`internal/service/device_state.go`、`internal/handler/device_state.go`、`internal/consumer/device_state.go`、`internal/consumer/manager.go`、`cmd/server/wire/`
- **`backend`**：`api/v1/device.go`、`internal/handler/device.go`、`docs/`（Swagger 生成）
- **`frontend`**：`src/api/generated/`（OpenAPI 生成）、`src/features/devices/components/device-detail/device-info-tab.tsx`
- **开发脚本**：`scripts/mock_device/main.go`、`scripts/start.sh`

