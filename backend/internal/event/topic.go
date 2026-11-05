package event

// Topic represents standard system event topic identifiers.
type Topic string

const (
	// OTA domain events
	TopicOTAUpgradeCommand Topic = "ota-upgrade-command"
	TopicOTAProgressReport Topic = "ota-progress-report"
	TopicOTADeviceInfo     Topic = "ota-device-info"

	// Device uplink & lifecycle domain events
	TopicDeviceTelemetryReport Topic = "device-telemetry-report"
	TopicDeviceEventReport     Topic = "device-event-report"
	TopicDeviceOnlineStatus    Topic = "device-online-status"
	TopicDeviceServiceInvoke   Topic = "device-service-invoke"
	TopicDeviceServiceReply    Topic = "device-service-reply"
)

// String returns string representation of Topic.
func (t Topic) String() string {
	return string(t)
}
