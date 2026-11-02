## 1. 协议与受控基础设施

- [x] 1.1 固化 `ota-upgrade-command-mqtt`（`OTAUpgradeCommand`）与 `ota-progress-report`/`ota-device-info`（`OTAProgressPayload`/`OTAInformPayload`）的 JSON schema 和示例，覆盖 `batch_id`、设备标识、默认模块、目标版本、HTTPS 下载信息、SHA-256、进度和错误；用 schema 校验示例。
- [ ] 1.2 部署 EMQX，配置 TLS、设备认证和按产品/设备隔离的 ACL；使用测试客户端验证未授权 topic 不能发布或订阅。**未完成：**当前只落地了 MQTT↔Kafka 转发规则（见 `deploy/helm/0things/emqx/`），认证、ACL 与 TLS 尚未配置。
- [ ] 1.3 为 data-engine 增加 Kafka、数据库配置校验；缺失必需凭据时安全拒绝启动。**范围调整：**data-engine 不再直连 EMQX，MQTT 侧连接与 TLS 由 EMQX 规则承担。
- [ ] 1.4 验证 transport-mqtt 保留的 Eclipse Paho 客户端具备连接、重连与优雅关闭能力。**范围调整：**QoS 1 发布与业务订阅已移交 EMQX 规则，transport-mqtt 不再收发消息；连接生命周期已有单元测试覆盖。

## 2. 批次与设备任务

- [ ] 2.1 扩展 OTA 设备任务，增加 `batch_id`、默认模块、目标版本、发送结果、进度、当前版本、最后上报时间和错误，并建立 `(batch_id, device_id)` 唯一约束及查询索引；验证旧数据可读。**部分实现：**backend 与 data-engine 模型均包含这些字段及批次/设备唯一索引；尚未找到验证旧数据迁移后可读的测试。
- [ ] 2.2 改造 `BatchUpgrade`，在一个事务中创建批次和每台设备的独立任务；重复设备输入不得生成重复任务，同一设备可保留跨批次历史。**部分实现：**服务会对输入设备去重，repository 在事务中创建批次和设备任务；仍需补充重复输入及同设备跨批次的显式测试。
- [ ] 2.3 实现 `created`、`dispatching`、`in_progress`、`succeeded`、`partial_success`、`failed` 的任务与批次状态聚合；覆盖成功、发送失败、设备失败和混合结果测试。**部分实现：**已有成功/失败/混合状态聚合，但当前使用 `pending`/`success` 等状态名，发送失败也未可靠回写任务状态；需统一状态语义并补发送失败场景。

## 3. 命令下发与设备回报

- [ ] 3.1 在批次事务提交后发布 Kafka OTA 命令，按发布结果更新任务发送状态和错误；使用 mock 或测试容器覆盖成功与失败。**部分实现：**`BatchUpgrade` 已发布 OTA 命令事件，但忽略发布错误，且未根据发布结果回写发送状态和错误。
- [ ] 3.2 由 EMQX Kafka Source 规则以 QoS 1 向 `/ota/device/upgrade/{productKey}/{deviceName}` 重发布完整升级元数据，`deviceName` 缺失或为空时回退 `deviceKey`。**部分实现：**规则 SQL 与配置见 `deploy/helm/0things/emqx/ota-downlink.sql`，但规则需在 Dashboard 手工创建、不随 Helm 部署，且尚未用真实设备验证；EMQX 不回传投递结果，任务发送状态只反映 backend 的 Kafka 发布结果。
- [ ] 3.3 在 data-engine 独立消费 `ota-progress-report`，要求 `batch_id` 并直接写入共享数据库的设备进度、错误和最后上报时间；进度不得标记任务成功。**部分实现：**data-engine 已按 `batch_id + device` 更新进度、错误和上报时间，且 progress 不直接置成功。
- [ ] 3.4 在 data-engine 的 inform consumer 中处理 `ota-device-info`；只有默认模块版本等于目标版本时标记成功，验证 100% progress 但版本不匹配仍不成功。**部分实现：**已有目标版本比较，但 inform 不带 `batch_id`，仓储按设备选取最近的进行中任务；也未限定默认模块，因此不能可靠确认指定批次任务。
- [x] 3.5 移除 mqtt-transport 的 Kafka 消费和 MQTT 下行能力；验证数据库状态只由 data-engine 的派发结果或设备上报改变。**已完成：**`transport-mqtt` 的 consumer/service/handler/event 包与 Kafka 依赖已删除，仅保留 MQTT 连接生命周期，并有测试断言不注册任何转发订阅。

## 4. 批次可见性与验收

- [ ] 4.1 扩展批次详情、设备任务列表与统计 API，按 `batch_id` 返回状态、进度、错误、当前版本和目标版本；生成 Swagger 并覆盖 handler 测试。**部分实现：**设备部署查询支持 `batchId`，响应包含状态、进度、当前/目标版本；缺少任务错误字段及完整的批次详情/聚合统计查询。
- [ ] 4.2 更新 OTA 批次详情和设备部署列表，展示批次维度的任务状态、进度、错误、当前和目标版本；补齐中英文文案并执行前端构建。**部分实现：**现有页面可列出批次和设备部署，但设备行未展示进度、目标版本、错误，且前端列表查询未传入批次筛选参数。
- [ ] 4.3 完成端到端验收：创建批次 → Kafka → EMQX → 测试设备收到命令 → progress → 目标版本 inform → 批次成功；保存验收记录并执行 `make test && make build` 与 `pnpm -C frontend format && pnpm -C frontend build`。**部分实现：**`scripts/mock_device` 的 OTA topic 已对齐 EMQX 规则（订阅 `/ota/device/upgrade/{productKey}/+` 并按 `device_key`/`device_name` 过滤，进度上报 `/sys/ota/device/progress/{productKey}/{deviceKey}` 且携带 `batch_id`），但模拟器仍不上报 inform，且根目录缺少覆盖 `scripts/` 的 Go module，`make mock-device` 无法直接运行。
