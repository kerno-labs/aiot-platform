package enum

// 统一管理 0things MQTT 传输层主题契约常量与格式模板
// 统一规范：前缀为系统功能/业务路径（/sys/...），参数 {productKey}/{deviceKey} 固定放在最末尾
const (
	// --- 上行订阅通配符主题 (Uplink Wildcard Topics) ---

	// MQTTSubEvent 自定义业务事件上报订阅主题: /sys/thing/event/post/{productKey}/{deviceKey}
	MQTTSubEvent = "/sys/thing/event/post/+/+"

	// MQTTSubOTAProgress OTA 固件升级进度上报订阅主题: /sys/ota/device/progress/{productKey}/{deviceKey}
	MQTTSubOTAProgress = "/sys/ota/device/progress/+/+"

	// MQTTSubOTAInform OTA 固件版本/升级上报订阅主题: /sys/ota/device/inform/{productKey}/{deviceKey}
	MQTTSubOTAInform = "/sys/ota/device/inform/+/+"

	// --- 下行主题模板 (Downlink Topic Templates) ---

	// MQTTTplPropertySet 属性设置下发主题模板: /sys/thing/property/set/{productKey}/{deviceKey}
	MQTTTplPropertySet = "/sys/thing/property/set/%s/%s"

	// MQTTTplOTAUpgrade OTA 升级指令下发主题模板: /sys/ota/device/upgrade/{productKey}/{deviceKey}
	MQTTTplOTAUpgrade = "/sys/ota/device/upgrade/%s/%s"
)
