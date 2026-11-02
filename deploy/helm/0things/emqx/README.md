# EMQX MQTT / Kafka 转发

设备上行和 OTA 下行全部由 EMQX 原生规则处理。transport-mqtt 服务保留 MQTT 连接、启动和停止生命周期，不再订阅或转发这些业务消息。规则在 Dashboard 中创建，SQL 文件保存于本目录；Helm 不会自动创建这些规则。

## Topic 对照

`{product_key}`、`{device_key}` 为 MQTT topic 最后两段。

| 方向 | MQTT topic | Kafka topic | message_type |
| --- | --- | --- | --- |
| 上行遥测（已有规则） | `/sys/thing/property/post/{product_key}/{device_key}` | `device-telemetry-report` | `telemetry` |
| 上行事件 | `/sys/thing/event/post/{product_key}/{device_key}` | `device-event-report` | `event` |
| OTA 进度 | `/sys/ota/device/progress/{product_key}/{device_key}` | `ota-progress-report` | `ota_progress` |
| OTA 版本 | `/sys/ota/device/inform/{product_key}/{device_key}` | `ota-device-info` | `ota_inform` |
| OTA 下行 | `/ota/device/upgrade/{product_key}/{device_name}` | `ota-upgrade-command-mqtt` | 原始 OTAUpgradeCommand |

OTA 下行保留原服务实际使用的 `/ota/device/upgrade/` 路径，未改成旧常量中的 `/sys/ota/device/upgrade/`。`device_name` 缺失或为空时使用 `device_key`。属性设置过去只有 topic 常量，没有实际消费或转发逻辑，此次不新增。

## 上行：MQTT → Kafka

复用 Kafka Producer 连接器 `kafka`，主机 `kafka:9092`，认证和 TLS 按集群实际配置。当前同 namespace 部署使用无认证、无 TLS；连接器开启“允许自动创建主题”，Kafka Broker 也需允许自动创建。

四类上行分别使用独立规则、独立 Kafka Producer 动作和固定目标 topic：

| 规则 | SQL | Kafka 动作 | 固定 Kafka topic |
| --- | --- | --- | --- |
| `mqtt_telemetry_to_kafka_raw` | [telemetry-uplink.sql](telemetry-uplink.sql) | `mqtt_telemetry_raw` | `device-telemetry-report` |
| `mqtt_device_events_to_kafka` | [device-events-uplink.sql](device-events-uplink.sql) | `device_events` | `device-event-report` |
| `mqtt_ota_progress_to_kafka` | [ota-progress-uplink.sql](ota-progress-uplink.sql) | `ota_progress` | `ota-progress-report` |
| `mqtt_ota_inform_to_kafka` | [ota-inform-uplink.sql](ota-inform-uplink.sql) | `ota_inform` | `ota-device-info` |

每条 SQL 只监听一个 MQTT topic，使用固定 `message_type`，不包含 `CASE` 或动态 `kafka_topic` 字段。原合并规则 `mqtt_events_ota_to_kafka` 已停用，防止重复转发。

四个动作分别填写上表的固定 Kafka topic，其余通用配置：

| 字段 | 配置 |
| --- | --- |
| 连接器 | `kafka` |
| Kafka 主题名称 | 按上表填写固定 topic |
| 消息的键 | `${.product_key}/${.device_key}` |
| 消息的值 | `${.}` |
| 消息的时间戳 | `${.timestamp}` |
| 压缩 | `snappy` |
| 分区选择策略 | `key_dispatch` |
| 分区限制 | 关闭，所有分区 |

所有上行规则使用 `payload AS payload`，外层 DeviceMessage 的 `payload` 保存设备原始消息字符串；EMQX 不解析或转换设备 JSON。data-engine 的 `DeviceMessage.DecodePayload` 在业务处理时解析字符串，同时兼容历史 JSON 对象和数组。`timestamp` 为 EMQX 接收时间，`headers.topic` 保留原 topic。原有遥测规则 `mqtt_telemetry_to_kafka_raw` 和动作继续使用 `device-telemetry-report`；其原生 payload 由 data-engine 解析；遥测使用 Alink 属性上报对象，`params` 内每个属性各自携带 `value` 和可选的 `time`；省略 `time` 时使用外层接收时间。旧 `{ts, values}` 和扁平属性格式不再接受。

## 下行：Kafka → MQTT

创建 Kafka Consumer 连接器 `kafka_ota_commands`，主机 `kafka:9092`，认证与 TLS 与 Producer 保持一致。

创建 Source `ota_upgrade_commands`：

| 字段 | 配置 |
| --- | --- |
| Kafka topic | `ota-upgrade-command-mqtt` |
| 消费组 ID | `aiot-emqx-ota-mqtt` |
| Key / Value 编码模式 | `None` |
| 偏移重置策略 | `latest` |

这是独立消费组，`latest` 仅在没有有效已提交 offset 时从末尾开始，避免首次启用重放历史升级。迁移前应检查旧组的待处理指令；本次不复制旧消费组 offset，不主动重发历史命令。

创建规则 `kafka_ota_commands_to_mqtt`，SQL 使用 [ota-downlink.sql](ota-downlink.sql)，仅监听 `$sources/kafka_consumer:ota_upgrade_commands`。添加“消息重发布”动作：

| 字段 | 配置 |
| --- | --- |
| 主题 | `/ota/device/upgrade/${.command.product_key}/${.device_name}` |
| QoS | `1` |
| Retain | `false` |
| Payload | `${.payload}` |
| 直接派发 | `false` |

命令正文使用 Kafka `value` 原文，仅解析副本以提取目标设备，不重写升级指令内容。

## 原生 payload 发布顺序

本目录上行 SQL 已改成原生 payload 字符串。必须先部署包含 `DecodePayload` 的 data-engine，再将线上四条上行规则替换为对应 SQL。旧版 data-engine 直接解析 JSON 对象/数组，不能直接处理字符串；切换前四条线上规则保持原格式。

四个上行 Kafka topic 均已有业务处理：遥测写入 TSDB、设备事件保存、OTA 进度和版本更新。OTA 指令下发继续由 EMQX Kafka Source 处理，不由 data-engine 重复转发。不符合遥测格式的数据记录告警并跳过；同一报文有任一属性无效时整条报文跳过。

## 旧部署切换

1. 创建规则并使用 Dashboard SQL 模拟测试三类上行，以及 OTA 下行的设备名存在、缺失、空值分支；测试 Kafka Sink / Source 连接状态。
2. 停用旧 Transport 的 MQTT 客户端。此次已取消旧订阅，并按客户端 ID `0things-transport-mqtt` 加入黑名单（永不过期），Dashboard 显示旧客户端已离线，防止旧镜像重连导致重复转发。禁止的是这个服务客户端，不是设备客户端。
3. 发布删除转发逻辑后的 transport-mqtt 新镜像。Chart 保留原 Deployment、ConfigMap 和 `transportMqtt` values；不能继续运行带旧转发逻辑的镜像。
4. 确认新 transport-mqtt 镜像已替换旧实例后，解除 `0things-transport-mqtt` 的临时黑名单，使保留的服务恢复 MQTT 连接。确认 EMQX 规则命中、Kafka 动作成功和业务入库；新 OTA 命令由 EMQX Source 消费并重发布。

当前验证覆盖 SQL 模拟与连接状态，不代表已执行真实设备固件升级。

## 属性上报协议与存储

MQTT topic 仍为 `/sys/thing/property/post/{product_key}/{device_key}`，正文采用 Alink 结构：

```json
{
  "id": "123",
  "version": "1.0",
  "sys": { "ack": 0 },
  "params": {
    "temperature": { "value": 26.5, "time": 1730000000000 },
    "location": {
      "value": { "latitude": 31.2304, "longitude": 121.4737 },
      "time": 1730000001000
    }
  },
  "method": "thing.event.property.post"
}
```

`id`、`version`、`method` 和 `sys.ack` 不做必填或取值校验，`params` 非空。属性标识符非空，`value` 不得缺失或为 null；0、false 和空字符串均可作为值。`time` 是正数 Unix 毫秒时间戳，省略或为 null 时使用 EMQX 接收时间。当前没有实现上报回复，请使用 `sys.ack: 0`；接收 `ack: 1` 不代表已提供回复能力。物模型类型和范围校验尚未接入。

每个属性生成一条时序记录，struct 作为整体 JSON 保存，不拆内部字段。TDengine 沿用 `device_properties` 超级表，新数据按“设备 + 属性”生成 `p_<SHA256>` 子表，保证不同属性在同一采集时间不会互相覆盖。数值不再格式化为四位小数，避免写入时丢失精度。

backend 与 data-engine 查询超级表并按 `device_key`、`property_id` 过滤，兼容旧设备子表中的历史数据；不会删除、迁移旧表，也无法恢复之前因时间戳冲突丢失的值。请先发布新的 backend 查询端，再发布 data-engine，最后让设备切换 Alink 格式；旧版 backend 按旧子表名查询，读不到新属性子表。可使用 `make mock-device` 或 `go run ./scripts/mock_device/main.go -product <产品Key> -device <设备Key>` 验证 MQTT 上报。

TDengine 当前仍为内存队列异步批量写入，入队成功不等于数据库持久化成功，队列满或写入失败时没有可靠重试。本次没有改动该机制。
