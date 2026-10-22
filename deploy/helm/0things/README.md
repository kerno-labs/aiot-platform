# 0things Helm Chart

该 Chart 用于在 Kubernetes 中部署完整的 0things AIoT 平台，并通过独立 values 文件管理 test 和 prod 环境。

## 部署内容

Chart 默认部署以下组件：

- 应用：backend、MCP server、data-engine、transport-mqtt、AI copilot、frontend、Logto。
- 基础设施：业务 PostgreSQL、Logto PostgreSQL、Redis、Kafka、EMQX、TDengine。
- 配置：服务运行配置、数据库凭据、应用凭据、镜像仓库凭据和前端 Nginx 配置。
- 网络：内部 Service，以及可选的 frontend、gateway API/MCP、Logto 和 Logto Admin Ingress。

模板按部署模块组织：

```text
templates/
├── application/
├── infrastructure/
├── secrets/
└── networking/
```

## 前置条件

- Kubernetes 1.24 或更高版本。
- Helm 3。
- 已安装可用的 StorageClass；如果集群没有默认 StorageClass，需要设置 `global.storageClass`。
- 已构建并推送 values 中配置的业务镜像。
- 已在目标数据库中准备应用所需表结构。该 Chart 不执行数据库 migration。
- 生产公网入口依赖 k3s Traefik 的 `traefik.io/v1alpha1` Middleware CRD 和 cert-manager；先按下文安装集群级组件。

## Values 管理

| 文件 | 用途 |
| --- | --- |
| `values.yaml` | 完整配置结构和公共默认值 |
| `values-test.yaml` | test 的账号密码、域名、资源和存储覆盖 |
| `values-prod.yaml` | prod 的账号密码、公网地址、副本、资源和存储覆盖 |

环境文件包含部署凭据，因此已加入 `.gitignore`，不会随仓库分发。首次部署时，在仓库根目录运行以下命令创建本地文件，再按环境修改账号密码、域名、资源和存储设置：

```bash
cp -n deploy/helm/0things/values.yaml deploy/helm/0things/values-test.yaml
cp -n deploy/helm/0things/values.yaml deploy/helm/0things/values-prod.yaml
```

`-n` 会保留已有的本地环境文件。Helm 会自动加载 `values.yaml`，部署时再追加对应的环境文件。

仓库中的本地 test values 默认不创建镜像仓库 Secret；如果镜像是私有的，部署前须配置 `registry` 凭据或引用已有的 `imagePullSecrets`。

> [!IMPORTANT]
> `values-prod.yaml` 中的 `change-me-*` 或 `REPLACE_WITH_*` 是占位值，生产部署前必须替换。真实生产 values 可以保存在受控的私有仓库或服务器文件中。

数据库和中间件凭据由 Chart 自动创建为 Kubernetes Secret，并与相应组件定义放在同一个模板文件。镜像仓库拉取凭据单独定义在 `secrets/registry.yaml`；如果 Secret 已由平台预先创建，可通过顶层 `imagePullSecrets` 引用。

各项目的 ConfigMap 与工作负载定义放在同一模板文件：Backend/MCP 共用 `application/backend.yaml` 中的 `backend-config`；Data Engine、MQTT Transport 和 Frontend 的 ConfigMap 分别放在各自的 `application/*.yaml` 中。前三份项目配置的键名均为 `local.yml`。这些配置可能包含密码和应用密钥；ConfigMap 内容不是加密存储，请限制集群访问权限，并避免提交真实凭据。

私有镜像仓库默认使用以下配置自动创建 `kubernetes.io/dockerconfigjson` Secret：

```yaml
registry:
  create: true
  server: ccr.ccs.tencentyun.com
  username: your-user
  password: your-password
```

如果 Secret 已由平台统一管理：

```yaml
registry:
  create: false
imagePullSecrets:
  - tencent-registry
```

## 安装

### Test

```bash
helm upgrade --install 0things-test deploy/helm/0things \
  --namespace 0things-test \
  --create-namespace \
  -f deploy/helm/0things/values-test.yaml \
  --atomic \
  --wait \
  --timeout 10m
```

### Production

先准备好镜像、数据库结构及本地生产 values，替换占位凭据（包括 `clusterIssuer.accessKeyID` 和 `clusterIssuer.accessKeySecret`）：

```bash
rg 'change-me-|REPLACE_WITH_' deploy/helm/0things/values-prod.yaml
```

确认数据库结构已经准备完毕后执行：

```bash
helm upgrade --install aiot-prod deploy/helm/0things \
  --namespace aiot-prod \
  --create-namespace \
  -f deploy/helm/0things/values-prod.yaml \
  --atomic \
  --wait \
  --timeout 15m
```

资源使用固定组件名；test 和 prod 必须部署到不同 namespace。Helm release 名称可以区分版本记录，但不会改变资源名。

## 外部访问

配置了对应 `ingress.*.host` 且服务启用时，会生成 Ingress；未配置域名的 test 环境不会生成。frontend 使用 `ingress.frontend`，gateway 使用 `ingress.gateway`，Logto 使用 `ingress.logto`，管理控制台使用 `ingress.logtoAdmin`。生产路由为：

| 域名与路径 | 后端 | 路径处理 |
| --- | --- | --- |
| `console.zghub.com/` | frontend | 原样转发 |
| `gateway.zghub.com/api/...` | backend | 去掉 `/api` 前缀 |
| `gateway.zghub.com/mcp` | mcp-server | 原样转发 |
| `auth.zghub.com/` | Logto app | 原样转发 |
| `auth-admin.zghub.com/` | Logto admin | 原样转发 |

生产 Ingress 共用固定名称的 `aiot-platform-tls`，由一张覆盖 `zghub.com` 与 `*.zghub.com` 的 Let's Encrypt 证书提供。证书由 cert-manager 自动续期；AliDNS DNS-01 仅用于域名所有权验证，不创建或修改现有 A 记录。四个入口的 A 记录由你自行维护。test values 不配置公网域名或证书资源，不申请公网证书。

切换域名前，先在阿里云 DNS 配置上述四个入口指向公网入口，并在 Logto 管理端同步修改前端应用的 Redirect URI、Post sign-out redirect URI、CORS Origins 和 Backend API Resource Identifier，使其与新域名及 `VITE_LOGTO_RESOURCE` 一致。`file.zghub.com` 需要在 Cloudflare 为 `zghub.com` 完成 Business/Enterprise partial CNAME setup，按 R2 自定义域名页面给出的目标在 AliDNS 添加 CNAME，等待状态变为 Active 后再切换文件链接。云服务器位于中国内地时，还须确认新域名的备案/接入状态，DNS 和证书就绪并不代表公网可访问。

### 组织成员邀请

邀请功能依赖 Logto 的组织角色 `member`（类型为 User）和已启用的邮件连接器。请在连接器的 `OrganizationInvitation` 模板中使用 `{{link}}`，例如 `点击 {{link}} 接受组织邀请`；仅包含 `{{code}}` 的验证码模板无法让受邀者打开邀请页面。Helm 会用 `ingress.frontend.host` 生成后端的 `security.logto.invitation_base_url`，本地开发可在 `backend/config/local.yml` 中设为 `http://localhost:5173`。邮件链接中的一次性令牌由 Logto 完成邮箱认证；受邀者确认邀请后，后端通过 Logto Management API 更新邀请状态并加入组织。

### 生产集群准备（只执行一次）

按 [独立的集群级部署说明](../cluster/README.md) 确认 Traefik 并应用 `deploy/helm/cluster/cert-manager.yaml`。k3s Helm Controller 维护 cert-manager 控制器；prod 0things release 根据本地 values 安装 AliDNS webhook 并创建 RAM AccessKey Secret、`ClusterIssuer` 和 `Certificate`，test 不创建。卸载 prod release 会删除这些资源，但不会卸载 cert-manager 控制器。

前端使用多阶段 Docker 构建，无须预先生成 `dist`：`docker build -f frontend/Dockerfile -t YOUR_FRONTEND_IMAGE frontend`。构建前须在 `frontend/.env.production` 提供 `VITE_LOGTO_ENDPOINT`、`VITE_LOGTO_APP_ID`、`VITE_LOGTO_RESOURCE`、`VITE_DEVICE_SERVICE_URL` 和 `VITE_AI_GATEWAY_URL`；CI 应先生成该文件再执行 Docker 构建。该文件只进入构建阶段，最终镜像仅包含 Nginx 和静态文件。`VITE_LOGTO_RESOURCE` 必须与 Logto 内的 Backend API Resource Identifier、生产 values 中的 `backend.config.logto.audience` 完全一致。`gateway.zghub.com` 是入口主机，只有 `/api` 路径路由到 Backend。修改前端构建配置后需要重新构建并推送镜像；仅更新 Helm values 不会改变已打包的 Vite 环境变量。

生产部署后确认：

```bash
kubectl -n aiot-prod get certificate,ingress
kubectl -n aiot-prod rollout status deployment/aiot-prod-alidns-webhook --timeout=10m
kubectl wait --for=condition=Ready clusterissuer/letsencrypt-alidns --timeout=120s
kubectl -n aiot-prod wait --for=condition=Ready certificate/zghub-com --timeout=10m
kubectl -n aiot-prod get secret aiot-platform-tls
kubectl -n aiot-prod get pods,svc
```

再由你确认四个域名的 A 记录及 HTTPS 路由，并在 Cloudflare R2 为 `file.zghub.com` 完成 partial CNAME setup、自定义域名关联与验证；该域名不经过 k3s Ingress，也不使用 `aiot-platform-tls`。不要在新地址可访问前移除旧的 `file.0thing.com`。若证书未就绪，查看 `kubectl -n aiot-prod describe certificate zghub-com` 和同 namespace 的 `order,challenge`。回滚应用使用上文 `helm rollback`；独立安装的 cert-manager 不会随应用 release 回滚或删除。

没有域名或 Ingress Controller 时，可以将对应 Service 的 `type` 设置为 `LoadBalancer`。当前生产 values 通过 Traefik 暴露 HTTP 服务，EMQX 仍保留独立 LoadBalancer（MQTT 不经过这些 HTTP Ingress）。

## 持久化

PostgreSQL、Redis、Kafka、EMQX 和 TDengine 使用 StatefulSet 的 `volumeClaimTemplates`。容量在环境 values 中分别设置，例如：

```yaml
tdengine:
  persistence:
    storageClass: fast-ssd
    dataSize: 100Gi
    logSize: 20Gi
```

> [!WARNING]
> 修改 values 中的数据库密码只会更新 Kubernetes Secret，不会修改已经初始化的数据库内部账号。密码轮换必须先在数据库中完成，再更新 values。

## Kafka 与 EMQX

Kafka 默认启用，使用固定版本的官方 `apache/kafka` 镜像和单节点 KRaft 模式，broker 与 controller 运行在同一个 Pod，无须 ZooKeeper。默认数据卷为 10Gi，JVM 堆为 512Mi，新建主题默认 3 个分区，日志保留 168 小时。单节点不提供高可用，不能直接增加 StatefulSet 副本数来扩容；多节点部署需要同时规划 controller quorum、broker ID 和副本策略。

同 namespace 的 EMQX 使用 `kafka:9092` 作为 Bootstrap Hosts。客户端 Service 为 ClusterIP，连接协议为 PLAINTEXT，无认证、无 TLS，供集群内部使用。broker 对客户端发布自己的 Pod DNS 地址 `kafka-0.kafka-headless.<namespace>.svc.cluster.local:9092`，依赖 Kubernetes 默认的 `cluster.local` 集群域名。Headless Service 会在 Pod 就绪前发布地址，以便 KRaft controller 启动时解析自身。

可在环境 values 中覆盖 Kafka 配置，例如：

```yaml
kafka:
  enabled: true
  persistence:
    size: 20Gi
  config:
    numPartitions: 3
    logRetentionHours: 72
```

`kafka.clusterId` 必须在复用数据卷时保持不变。`kafka.persistence.enabled: false` 会使用临时卷，Pod 重建后数据丢失。日志保留时间不是整个数据卷的容量上限，应根据实际写入量设置保留时间和存储容量。

部署后可检查状态并创建供 EMQX 写入的主题：

```bash
kubectl -n aiot-prod rollout status statefulset/kafka --timeout=5m
kubectl -n aiot-prod exec kafka-0 -- \
  /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:9092 \
  --create --if-not-exists --topic device-telemetry-report \
  --partitions 3 --replication-factor 1
kubectl -n aiot-prod exec kafka-0 -- \
  /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:9092 --list
```

在 EMQX Dashboard 的 Integration → Connector 创建 Kafka Producer 连接器，Bootstrap Hosts 填写 `kafka:9092`，关闭认证与 TLS；再创建规则和 Kafka Sink，将选定 MQTT topic 的消息写入 `device-telemetry-report`。具体字段参考 [EMQX Kafka 集成文档](https://docs.emqx.com/en/emqx/latest/data-integration/data-bridge-kafka.html)。

backend、data-engine、transport-mqtt 的事件发布和消费统一使用 Kafka。Helm 为三个服务分别配置 `aiot-backend`、`aiot-data-engine`、`aiot-transport-mqtt` 消费组；同一服务的副本共享消费组，不同服务独立消费。新消费组从最早保留的消息开始读取，已有消费组从已提交的 offset 继续处理。事件配置变化会触发应用 Pod 滚动更新，避免 `subPath` 挂载的 ConfigMap 仍使用旧配置。

平台沿用 `device-telemetry-report`、`device-event-report`、`ota-upgrade-command-mqtt`、`ota-progress-report` 等业务主题。EMQX 直接写入时，必须将 MQTT 消息转换成对应的事件 JSON（设备上行使用 `DeviceMessage`，包含 `device_key`、`transport`、`message_type`、`payload` 和 `timestamp`），并写入正确的业务主题；任意原始 MQTT JSON 不会自动成为平台事件。

从原 NATS 部署升级时，应先处理剩余待消费事件，再重新构建并推送 backend、data-engine、transport-mqtt 镜像，以及使用 backend 镜像的 MCP 服务。随后用 `aiot-prod` release 和 namespace 执行 Helm upgrade。Kafka 不会自动导入旧 JetStream 消息；Chart 已移除 NATS 工作负载，其原数据卷不在此次应用迁移中主动删除。

## 验证

```bash
helm lint deploy/helm/0things
helm lint deploy/helm/0things -f deploy/helm/0things/values-test.yaml
helm lint deploy/helm/0things -f deploy/helm/0things/values-prod.yaml

helm template 0things-test deploy/helm/0things \
  -n 0things-test \
  -f deploy/helm/0things/values-test.yaml

helm template aiot-prod deploy/helm/0things \
  -n aiot-prod \
  -f deploy/helm/0things/values-prod.yaml
```

安装后检查：

```bash
kubectl -n aiot-prod get pods,svc,ingress,pvc
helm status aiot-prod -n aiot-prod
```

## 升级与回滚

升级继续使用对应环境文件：

```bash
helm upgrade aiot-prod deploy/helm/0things \
  -n aiot-prod \
  -f deploy/helm/0things/values-prod.yaml \
  --atomic --wait --timeout 15m
```

查看历史并回滚：

```bash
helm history aiot-prod -n aiot-prod
helm rollback aiot-prod <REVISION> -n aiot-prod --wait
```

回滚 Chart 不会自动回滚数据库结构或 PVC 数据。
