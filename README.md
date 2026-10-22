<div align="center">

<img src="./frontend/public/images/favicon.svg" alt="0things logo" width="72" />

# 0things AIoT 平台

面向物联网产品、设备、物模型、遥测、OTA 与自动化场景的一体化开发平台。

[![Frontend](https://img.shields.io/badge/frontend-React%2019%20%2B%20Vite-646CFF?logo=react&logoColor=white)](./frontend)
[![Backend](https://img.shields.io/badge/backend-Go%20%2B%20Gin-00ADD8?logo=go&logoColor=white)](./backend)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

[功能概览](#功能概览) · [快速开始](#快速开始) · [本地开发](#本地开发) · [项目结构](#项目结构)

</div>

## 功能概览

- 产品、设备、设备分组与物模型（TSL）管理
- HTTP / MQTT 设备接入与设备凭据管理
- 设备遥测、属性、事件、RPC 与历史数据查询
- OTA 固件、批量升级与升级状态跟踪
- 规则链、自动化、告警、任务和运行监控
- Logto 组织与用户认证
- MCP 服务与 AI Copilot，用自然语言访问 IoT 能力
- 中英文界面、深色模式和响应式管理控制台

## 架构

```text
                    ┌──────────────────────────────┐
                    │ frontend  React / Vite        │ :5173 / :80
                    └──────────────┬───────────────┘
                                   │ REST / MCP
             ┌─────────────────────┴─────────────────────┐
             │                                           │
┌────────────▼────────────┐               ┌──────────────▼─────────────┐
│ backend  Gin REST API    │ :8000         │ ai-copilot  AI Gateway      │ :8005
│ 管理、认证、设备与业务    │               │ MCP 客户端与对话运行时       │
└───────┬─────────┬────────┘               └──────────────┬─────────────┘
        │         │                                       │
        │         └──────────────┐              ┌────────▼────────┐
        │                        │              │ mcp-server :8009 │
        │                        │              └─────────────────┘
        │                        │
┌───────▼────────┐     ┌─────────▼─────────┐
│ data-engine     │
│ 计算与任务中心   │
└───────┬────────┘
        │             ┌──────────────────┐
        │             │ MQTT Broker      │
┌───────▼────────┐    │ EMQX :1883       │
│ transport-mqtt │────▶│                  │
│ MQTT 设备网关   │    │                  │
└────────────────┘    └──────────────────┘

       Kafka :9092 · Redis :6379 · Logto :3001/:3002 · SQLite / MySQL / PostgreSQL
```

服务通过 Kafka 传递事件；业务数据库由 backend 管理，时序数据由 data-engine 内部的存储实现写入。开发环境可以使用 SQLite，完整平台通过 Helm 部署 PostgreSQL、Redis、Kafka、EMQX 和 TDengine 等依赖。

## 快速开始

### 前置条件

- Kubernetes 1.24+
- Helm 3
- 可供集群拉取的应用镜像
- kubectl（用于检查部署状态）

### 使用 Helm 部署完整环境

测试环境和生产环境分别使用独立的 values 文件：

```bash
helm upgrade --install 0things-test deploy/helm/0things \
  --namespace 0things-test \
  --create-namespace \
  -f deploy/helm/0things/values-test.yaml

helm upgrade --install aiot-prod deploy/helm/0things \
  --namespace aiot-prod \
  --create-namespace \
  -f deploy/helm/0things/values-prod.yaml \
  --atomic --wait
```

部署前必须替换环境 values 中的镜像、域名和凭据。完整的安装、升级、验证、回滚与私有镜像配置见 [`deploy/helm/0things/README.md`](./deploy/helm/0things/README.md)。

> [!IMPORTANT]
> `values-test.yaml` 和 `values-prod.yaml` 中的示例凭据不能直接用于真实环境。包含真实密钥的覆盖文件不要提交到 Git，也可以通过 `existingSecret` 接入已有 Kubernetes Secret。

## 本地开发

### 准备依赖服务

本地进程可以连接测试命名空间中的 Helm 服务，也可以连接自行准备的 PostgreSQL、Redis、Kafka、EMQX、TDengine 和 Logto。各服务通过自己的 `config/local.yml` 指定依赖地址。

### 启动本地 Kafka

使用 Docker 启动单节点 Kafka，并将数据保存到命名卷：

```bash
docker run -d --name aiot-kafka-local \
  -p 127.0.0.1:9092:9092 \
  -v aiot-kafka-data:/var/lib/kafka/data \
  -e CLUSTER_ID=gyGqtwZbThe9I3zcUvjGfw \
  -e KAFKA_NODE_ID=1 \
  -e KAFKA_PROCESS_ROLES=broker,controller \
  -e KAFKA_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093 \
  -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://127.0.0.1:9092 \
  -e KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER \
  -e KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=PLAINTEXT:PLAINTEXT,CONTROLLER:PLAINTEXT \
  -e KAFKA_INTER_BROKER_LISTENER_NAME=PLAINTEXT \
  -e KAFKA_CONTROLLER_QUORUM_VOTERS=1@localhost:9093 \
  -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 \
  -e KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=1 \
  -e KAFKA_TRANSACTION_STATE_LOG_MIN_ISR=1 \
  -e KAFKA_SHARE_COORDINATOR_STATE_TOPIC_REPLICATION_FACTOR=1 \
  -e KAFKA_SHARE_COORDINATOR_STATE_TOPIC_MIN_ISR=1 \
  -e KAFKA_NUM_PARTITIONS=3 \
  -e KAFKA_LOG_RETENTION_HOURS=168 \
  -e KAFKA_LOG_DIRS=/var/lib/kafka/data/kraft-combined-logs \
  -e KAFKA_HEAP_OPTS='-Xms512m -Xmx512m' \
  apache/kafka:4.3.1
```

已有该容器时执行 `docker start aiot-kafka-local`。本地进程使用 `event.kafka.brokers: ["127.0.0.1:9092"]`；Kubernetes 内使用 `kafka:9092`。容器对外发布的是宿主机地址，此本地命令供宿主机进程连接，不能用于其他容器的 Kafka 服务发现。

### 配置并执行数据库迁移

backend 默认可以使用 SQLite：

```bash
cp backend/config/config.example.yml backend/config/local.yml
cd backend && go run ./cmd/migration -conf ./config/local.yml
```

如果使用其他数据库，请先修改 `backend/config/local.yml` 中的 `data.db.aiot` 配置。迁移程序使用 GORM `AutoMigrate` 创建和更新业务表。

### 启动服务

每个服务使用自己的 `config/local.yml`。可以分别打开终端启动：

```bash
cd backend && go run ./cmd/server -conf ./config/local.yml
cd data-engine && go run ./cmd/server -conf ./config/local.yml
cd transport-mqtt && go run ./cmd/server -conf ./config/local.yml
cd backend && go run ./cmd/mcp -conf ./config/local.yml
cd ai-copilot && pnpm install && pnpm dev
cd frontend && pnpm install && pnpm dev
```

前端默认访问 `http://localhost:5173`，后端 API 默认访问 `http://localhost:8000`。前端环境变量模板位于 [`frontend/.env.example`](./frontend/.env.example)，AI Copilot 模板位于 [`ai-copilot/.env.example`](./ai-copilot/.env.example)。

## 设备模拟器

仓库提供一个简单的 MQTT 虚拟设备，可用于发送遥测数据或触发高温告警：

```bash
make mock-device
make mock-alarm
```

设备网关和 Broker 的地址分别通过 `transport-mqtt/config/` 与 backend 的 `device_gateway.mqtt` 配置。默认设备端点 MQTT Host 为 `mqtt.0things.com`，本地 Broker 示例为 `tcp://127.0.0.1:1883`。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `make test` | 运行所有 Go 服务和共享包测试 |
| `make build` | 编译各 Go 服务 |
| `pnpm -C frontend format` | 格式化前端代码 |
| `pnpm -C frontend build` | 类型检查并构建前端 |
| `pnpm -C frontend lint` | 检查前端代码 |
| `pnpm -C ai-copilot test` | 运行 AI Copilot 测试 |
| `make -C backend gen` | 生成 GORM Gen 查询代码 |
| `make -C backend swag` | 生成 Swagger 文档 |
| `pnpm -C frontend generate:api` | 根据 OpenAPI 重新生成前端 API 客户端 |

> [!NOTE]
> `frontend/src/api/generated/`、backend 的 `wire_gen.go`、GORM Gen 文件和 Swagger 文档属于生成产物。修改契约或依赖后，请运行对应的生成命令，不要手工编辑这些文件。

## 项目结构

| 路径 | 说明 |
| --- | --- |
| [`frontend/`](./frontend) | React 管理控制台，包含设备、产品、规则、告警、组织和 AI Copilot 页面 |
| [`backend/`](./backend) | Gin REST API、认证、业务服务、数据库迁移和 MCP Server |
| [`data-engine/`](./data-engine) | 遥测时序数据、设备影子、任务和数据计算服务 |
| [`transport-mqtt/`](./transport-mqtt) | MQTT 设备接入、事件和 OTA 消息处理 |
| [`ai-copilot/`](./ai-copilot) | 基于 OpenAI-compatible 模型和 MCP 的 AI Gateway |
| [`logto/`](./logto) | Logto 身份服务镜像与认证配置说明 |
| [`deploy/helm/0things/`](./deploy/helm/0things) | 测试与生产环境的 Kubernetes Helm 部署包 |
| [`openspec/`](./openspec) | 功能变更提案、设计和任务规格 |
| [`docs/`](./docs) | 架构、认证、数据模型和运行说明 |

## 文档

- [Logto 认证与组织说明](./docs/logto-authentication.md)
- [Logto 组织租户盘点](./docs/logto-organization-tenancy-inventory.md)
- [OTA 架构对比](./docs/ota-architecture-comparison.md)
- [规则链数据模型](./docs/rule-chain-data-model.md)
- [OpenSpec 变更目录](./openspec/changes)
