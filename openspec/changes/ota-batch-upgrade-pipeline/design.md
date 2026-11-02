## Context

backend 已有 OTA 批次和设备升级记录，但定时任务只修改数据库状态，尚未向设备发送升级命令，也无法用设备最终版本确认结果。本 MVP 以 backend、Kafka、EMQX 和一个测试设备构成完整链路；`telemetry-service` 不参与运行时依赖。

## Goals / Non-Goals

**Goals:**

- 为静态批次中的每台设备建立独立、可追踪的升级任务。
- 以 Kafka 命令和 MQTT QoS 1 完成一次真实下发。
- 以带 `batch_id` 的进度与最终版本上报更新任务状态。
- 在控制台按批次看到每台设备的状态、进度、错误、当前和目标版本。

**Non-Goals:**

- 不实现离线补发、DLQ、自动重试、取消、超时扫描、灰度、限速或多模块升级。
- 不实现设备固件、Bootloader、下载器或生产监控告警。
- 不依赖或改造 `telemetry-service`。

## Decisions

### 1. 设备任务是唯一状态单元

每个静态批次为每台目标设备创建一条任务，使用 `(batch_id, device_id)` 唯一定位并保留跨批次历史。任务保存默认模块、目标版本、发送结果、进度、当前版本、最后上报时间和错误。批次状态由任务聚合：所有成功为 `succeeded`，存在成功且存在失败为 `partial_success`，全部失败为 `failed`，其余为 `created`、`dispatching` 或 `in_progress`。

### 2. 事务提交后由 backend 发布 Kafka 命令

批次和任务在同一事务中写入；成功提交后，backend 向 `ota-upgrade-command-mqtt` 为每台设备发布命令。backend 不消费任何 OTA Kafka topic，只按 Kafka 发布结果写入任务发送状态。本 MVP 接受数据库提交与 Kafka 发布之间的短暂不一致，不引入 outbox 或自动补发。

### 3. EMQX 规则承担 MQTT↔Kafka 双向转发

MQTT 与 Kafka 之间的转发全部由 EMQX 原生规则完成：Kafka Source 规则以独立消费组消费 `ota-upgrade-command-mqtt`，以 QoS 1 向 `/ota/device/upgrade/{productKey}/{deviceName}` 重发布命令原文；四条上行规则把设备报文封装成 `DeviceMessage` 后写入 `device-telemetry-report`、`device-event-report`、`ota-progress-report` 和 `ota-device-info`。data-engine 只用独立消费组消费 `ota-progress-report` 与 `ota-device-info`，处理设备 progress/inform，并直接连接 backend 共享的 OTA 关系数据库更新设备任务和批次聚合状态；它不持有 MQTT 客户端，也不下发命令。transport-mqtt 只保留 MQTT 连接与启停生命周期，不订阅业务 topic、不消费 Kafka。

**Trade-off：** EMQX 规则不回传单设备的 MQTT 投递结果，因此任务发送状态只反映 backend 的 Kafka 发布结果；设备是否真正收到命令由其 progress/inform 上报确认。规则目前只能在 Dashboard 手工创建（SQL 保存于 `deploy/helm/0things/emqx/`），不随 Helm 部署。

### 4. `batch_id` 与版本确认构成闭环

progress 和 inform 都必须携带 `batch_id`，并按批次及设备关联任务。progress 只更新阶段、百分比和错误；默认模块的 inform 版本与目标版本一致时才标记成功。100% progress 不是成功条件。

### 5. 固件以 HTTPS 元数据下发

命令带目标版本、下载 URL、文件大小、SHA-256 摘要和过期时间；设备通过 HTTPS 下载并在安装前校验。MQTT 只承载升级元数据，不传输固件文件。

## Risks / Trade-offs

- [Kafka 发布失败] → 记录失败任务并在 API 中可见；MVP 不自动重试，运维可创建新批次。
- [EMQX 规则未部署或配置漂移] → 规则不在 Helm 中管理，必须按 `deploy/helm/0things/emqx/README.md` 手工创建并用 Dashboard SQL 模拟验证；缺失时命令与上报都会静默中断。
- [设备不上报 `batch_id`] → 不能关联新批次，不更新任务，联调前必须冻结协议。
- [设备离线] → 本期记录未发送/发送失败结果，不做上线补发。
- [测试环境安全不足] → EMQX 必须启用 TLS、设备认证和 topic ACL，并以未授权客户端验证隔离。

## Migration Plan

1. 增加任务关联和结果字段，旧记录保持可读。
2. 部署 EMQX、配置和 OTA worker，先以测试客户端检查命令与 ACL。
3. 发布 backend 和控制台，使用测试设备完成创建批次到版本确认的验收。
4. MVP 稳定后再单独规划可靠发布（outbox/重试）、离线补发和灰度能力。
