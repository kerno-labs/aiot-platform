## Purpose

为 OTA MVP 建立 Kafka 到 MQTT 的命令传输和设备回报协议，以最终版本确认升级结果。

## ADDED Requirements

### Requirement: OTA 命令必须由 EMQX 规则下发

系统 SHALL 在设备任务的批次事务提交后，由 backend 向 Kafka topic `ota-upgrade-command-mqtt` 发布命令。消息 MUST 含 `batch_id`、设备标识、默认模块、目标版本、HTTPS 下载 URL、文件大小、SHA-256 摘要和有效期。EMQX 的 Kafka Source 规则 MUST 以独立消费组消费该 topic，并以 QoS 1 向 `/ota/device/upgrade/{productKey}/{deviceName}` 重发布命令原文；`deviceName` 缺失或为空时 MUST 回退为 `deviceKey`。data-engine 与 transport-mqtt MUST NOT 执行 MQTT 下行，transport-mqtt MUST 只保留 MQTT 连接生命周期，不得消费 Kafka 或转发业务消息。

#### Scenario: 下发升级命令

- **WHEN** 后端成功创建批次设备任务
- **THEN** backend 向 `ota-upgrade-command-mqtt` 发布完整升级元数据并按发布结果更新命令发送状态，EMQX 规则向对应设备 topic 重发布命令原文

#### Scenario: 未授权 topic

- **WHEN** 未获该产品或设备授权的 MQTT 客户端尝试发布或订阅 OTA topic
- **THEN** EMQX 拒绝该操作

### Requirement: 进度上报必须关联任务但不得判定成功

系统 SHALL 接收带 `batch_id` 的 progress 上报，并按批次和设备更新阶段、百分比、错误和最后上报时间。progress 上报 MUST NOT 单独将任务标记为成功。

#### Scenario: 上报完成进度

- **WHEN** 设备上报百分比为 100 的 progress
- **THEN** 系统保留任务为未成功，直至收到匹配版本的 inform 上报

### Requirement: OTA 上报必须由 data-engine 独立消费

EMQX 规则 SHALL 将设备 MQTT 上报封装为 `DeviceMessage`（含 `device_key`、`product_key`、`transport`、`message_type`、`payload` 和 `timestamp`）后分别写入 `ota-progress-report` 与 `ota-device-info`。data-engine SHALL 使用独立消费组消费这两个 topic，并直接写入 OTA 任务及批次状态。backend MUST NOT 消费这些 topic。

#### Scenario: MQTT 上行转发

- **WHEN** 设备向 `/sys/ota/device/progress/{productKey}/{deviceKey}` 或 `/sys/ota/device/inform/{productKey}/{deviceKey}` 发布报文
- **THEN** EMQX 规则将其写入对应 Kafka topic，data-engine 消费后直接更新对应设备任务

### Requirement: 最终版本上报是成功的唯一设备依据

系统 SHALL 接收带 `batch_id` 的默认模块 inform 上报。只有该版本等于任务目标版本时，系统才可将任务标记为成功；版本不匹配时 MUST 保持非成功并记录当前版本。

#### Scenario: 版本匹配

- **WHEN** 设备上报的默认模块版本等于目标版本
- **THEN** 对应任务标记成功，并重新计算批次状态

#### Scenario: 版本不匹配

- **WHEN** 设备上报的默认模块版本不同于目标版本
- **THEN** 系统更新当前版本但不得将任务标记成功
