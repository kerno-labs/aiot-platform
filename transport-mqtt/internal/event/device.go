package event

import "encoding/json"

// MessageType represents the classification of device uplink messages.
type MessageType string

const (
	MessageTypeTelemetry   MessageType = "telemetry"
	MessageTypeEvent       MessageType = "event"
	MessageTypeOTAProgress MessageType = "ota_progress"
	MessageTypeOTAInform   MessageType = "ota_inform"
)

// String returns string representation of MessageType.
func (m MessageType) String() string {
	return string(m)
}

// EventType represents the severity classification of a device event.
type EventType string

const (
	EventTypeInfo  EventType = "info"
	EventTypeAlert EventType = "alert"
	EventTypeError EventType = "error"
)

// String returns string representation of EventType.
func (e EventType) String() string {
	return string(e)
}

// Transport represents device communication protocol transport identifier.
type Transport string

const (
	TransportMQTT Transport = "mqtt"
	TransportHTTP Transport = "http"
)

// String returns string representation of Transport.
func (t Transport) String() string {
	return string(t)
}

// DeviceEventPayload defines the standard device event report payload structure.
type DeviceEventPayload struct {
	Identifier string          `json:"identifier" validate:"required"`                  // Standard thing model event identifier
	Type       EventType       `json:"type" validate:"required,oneof=info alert error"` // Event severity: info, alert, error
	Timestamp  int64           `json:"timestamp" validate:"required,gt=0"`              // Unix millisecond timestamp
	Data       json.RawMessage `json:"data,omitempty"`                                  // Event parameters or field data
}

// DeviceMessage is the standard uplink envelope for device telemetry, attributes, events, and OTA reports.
type DeviceMessage struct {
	DeviceKey   string            `json:"device_key" validate:"required"`
	ProductKey  string            `json:"product_key,omitempty"`
	Transport   Transport         `json:"transport" validate:"required"`
	MessageType MessageType       `json:"message_type" validate:"required"` // telemetry, attributes, event, ota_progress, ota_inform
	Payload     json.RawMessage   `json:"payload" validate:"required"`
	Timestamp   int64             `json:"timestamp" validate:"required,gt=0"` // Unix millisecond timestamp
	Headers     map[string]string `json:"headers,omitempty"`
}
