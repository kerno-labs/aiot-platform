package event

import (
	"fmt"
	"strings"
)

// Topic represents standard system event topic identifiers.
type Topic string

const (
	// OTA domain events
	TopicOTAUpgradeCommandMQTT Topic = "ota-upgrade-command-mqtt"
	TopicOTAUpgradeCommandHTTP Topic = "ota-upgrade-command-http"
	TopicOTAUpgradeCommand     Topic = "ota-upgrade-command"
	TopicOTAProgressReport     Topic = "ota-progress-report"
	TopicOTADeviceInfo         Topic = "ota-device-info"

	// Device uplink & lifecycle domain events
	TopicDeviceEventReport     Topic = "device-event-report"
	TopicDeviceOnlineStatus    Topic = "device-online-status"
)

// TopicOTAUpgradeCommandByTransport returns the protocol-specific OTA upgrade command topic.
func TopicOTAUpgradeCommandByTransport(transport string) (Topic, error) {
	switch strings.ToLower(strings.TrimSpace(transport)) {
	case "mqtt":
		return TopicOTAUpgradeCommandMQTT, nil
	case "http":
		return TopicOTAUpgradeCommandHTTP, nil
	default:
		return "", fmt.Errorf("unsupported transport for OTA upgrade command: %q", transport)
	}
}

// String returns string representation of Topic.
func (t Topic) String() string {
	return string(t)
}
