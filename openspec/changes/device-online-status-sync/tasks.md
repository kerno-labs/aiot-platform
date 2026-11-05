## 1. EMQX 规则与模拟器配置

- [x] 1.1 新增 `deploy/helm/0things/emqx/online-status-uplink.sql` 转发 `$events/client_connected` 与 `$events/client_disconnected` 到 `device-online-status`，并更新 `deploy/helm/0things/emqx/README.md`，验证 SQL 字段与 `DeviceMessage` 契约一致
- [x] 1.2 更新 `scripts/mock_device/main.go` 将 MQTT `ClientID` 设置为 `*deviceKey`，验证模拟器编译通过

## 2. Data-Engine 在线状态同步

- [x] 2.1 在 `data-engine/internal/model/device_state.go` 新增 `DeviceState` 模型，注册到 `data-engine/cmd/gormgen/main.go` 并生成 `internal/dal/query/device_states.gen.go`，验证生成代码无手改且编译通过
- [x] 2.2 在 `data-engine/internal/event/device.go` 新增 `MessageTypeOnlineStatus` 常量与 `DeviceOnlineStatusPayload` 结构，验证事件载荷解码单测通过
- [x] 2.3 实现 `DeviceStateRepository`、`DeviceStateService`、`DeviceStateHandler` 与 `DeviceStateConsumer`（支持 `client.connected` 上线、`client.disconnected` 离线、`reason == "takenover"` 忽略与 `last_online_time <= ts` 乱序保护），在 `consumer.Manager` 与 `cmd/server/wire` 中完成注入并生成 `wire_gen.go`，验证单元测试覆盖全部场景

## 3. 后端设备状态整型化、时间格式化、服务调用闭环与全量验证

- [x] 3.1 将前后端与 `data-engine` 的设备状态统一为整型（`0 = 离线`，`1 = 在线`，`2 = 未激活`），并在 `backend` 中将 `LastOnlineTime` / `LastOfflineTime` / `InvokedAt` 格式化为服务器默认时区的时间字符串返回，前端直接展示后端时间字符串
- [x] 3.2 实现物模型服务调用闭环（EMQX 下行/回执上行 SQL、`backend` 下发校验与 Kafka 投递、`data-engine` 回执消费与 `output_params` 更新、前端服务调用弹窗与状态展示、`scripts/mock_device/main.go` 服务调用自动回执模拟）
- [x] 3.3 执行根目录 `make test && make build` 与 `pnpm -C frontend format && pnpm -C frontend build`，验证全部微服务与前端单测、构建通过

