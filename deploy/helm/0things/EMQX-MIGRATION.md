# 从手写 EMQX 模板切换到官方子 Chart

EMQX 镜像仍为 `emqx/emqx-enterprise:6.3.1`，部署改用未修改的官方 Chart 6.3.1。它作为 `0things` 的依赖安装，release 和 namespace 均保持原样。Service 名保持 `emqx`，业务通过 `tcp://emqx:1883` 访问，EMQX Kafka Connector 使用 `kafka:9092`。

## 升级前核对

| 项目 | 原模板 | 官方子 Chart |
| --- | --- | --- |
| StatefulSet | `emqx` | `emqx` |
| 客户端 Service | `emqx` | `emqx` |
| Headless Service | 无独立资源 | `emqx-headless` |
| PVC 默认名称 | `data-emqx-0` | `emqx-data-emqx-0` |
| 数据目录 | `/opt/emqx/data` | `/opt/emqx/data` |
| Service 端口配置 | `mqttPort` / `websocketPort` / `dashboardPort` | `mqtt` / `ws` / `dashboard` |
| 存储配置 | `storageClass` / `accessModes` | `storageClassName` / `accessMode` |

官方 StatefulSet 的 selector、serviceName 和卷模板与旧模板不同，这些字段不能直接原地修改。必须安排维护窗口，先备份，再替换 StatefulSet；只运行 `helm upgrade` 可能因不可变字段而失败。即使卷目录相同，也不能假设旧数据会被自动加载。

## 迁移步骤

1. 保存旧 Chart、环境 values、Helm manifest 和版本记录，核对当前 namespace、PVC/PV 及回收策略。通过 EMQX Dashboard 导出数据和配置，并对数据卷做一致性备份或快照；记录认证、授权、连接器、规则、证书及集群配置，确认备份可恢复。
2. 修改本地环境 values 中旧的端口和存储键名，保留原 Dashboard 凭据、Service 类型、容量和资源配置。`namespaceOverride` 不再使用，应删除。私有镜像的拉取凭据通过 `emqx.image.pullSecrets` 配置，Secret 必须在同 namespace 中存在。
3. 在维护窗口停止设备或上游写入，将旧 `StatefulSet/emqx` 缩容到 0，等待 Pod 退出并完成最终备份。仅删除旧 StatefulSet，保留 PVC、备份和 Service，不卸载整个平台 release。执行删除前核对 PVC 保留策略。
4. 使用原 release 名和原 namespace 升级业务 Chart。默认会使用新卷 `emqx-data-emqx-0`，从备份恢复数据和配置后验证。若选择 `emqx.persistence.existingClaim: data-emqx-0` 复用旧卷，需先验证数据及节点配置兼容、确保没有其他实例挂载，并保持单副本；不要直接复制节点目录后假定集群身份一致。
5. 检查 EMQX 就绪、Dashboard 登录、设备重连、发布订阅、Transport 消费、遥测入库，以及实际启用的 Kafka Connector。新旧 Service 类型或公网 IP 发生变化时，同步调整设备入口。
6. 验证完成后恢复上游写入。备份和旧卷在确认迁移成功前保留。

## 回退

停止新实例写入并保留其数据，使用原 Chart 和 values 恢复旧 StatefulSet 与旧卷，切回原设备入口。StatefulSet 不可变字段的回退也需要替换过程；`helm rollback` 不负责恢复 EMQX 数据。新实例已有写入时，先处理数据差异，不能把 Helm 回滚当成数据回滚。

如果环境已实际采用过跨 namespace 或独立 release 方案，先核对现有资源 ownership；本流程针对原手写模板，不能直接用于跨 namespace 数据搬迁或强制接管另一个 release。

参考：[EMQX 官方 Helm 文档](https://docs.emqx.com/en/emqx/latest/get-started/deploy/kubernetes/chart.html)。
