package event

import (
	"bytes"
	"encoding/json"
)

// MessageType represents the classification of device uplink messages.
type MessageType string

const (
	MessageTypeTelemetry    MessageType = "telemetry"
	MessageTypeEvent        MessageType = "event"
	MessageTypeOTAProgress  MessageType = "ota_progress"
	MessageTypeOTAInform    MessageType = "ota_inform"
	MessageTypeOnlineStatus MessageType = "online_status"
	MessageTypeServiceReply MessageType = "service_reply"
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

// DevicePropertyPostPayload is an Alink property report. Each property owns its value and sample time.
type DevicePropertyPostPayload struct {
	ID      string                         `json:"id"`
	Version string                         `json:"version"`
	Params  map[string]DevicePropertyValue `json:"params"`
	Method  string                         `json:"method"`
}

type DevicePropertyValue struct {
	Value interface{} `json:"value"`
	Time  *int64      `json:"time,omitempty"` // Omitted sample time uses the envelope receive time.
}

// DeviceEventPayload defines the standard device event report payload structure.
type DeviceEventPayload struct {
	Identifier string          `json:"identifier" validate:"required"`                  // Standard thing model event identifier
	Type       EventType       `json:"type" validate:"required,oneof=info alert error"` // Event severity: info, alert, error
	Timestamp  int64           `json:"timestamp" validate:"required,gt=0"`              // Unix millisecond timestamp
	Data       json.RawMessage `json:"data,omitempty"`                                  // Event parameters or field data
}

// OnlineStatusEvent represents the EMQX client connection lifecycle event type.
type OnlineStatusEvent string

const (
	OnlineStatusEventConnected    OnlineStatusEvent = "client.connected"
	OnlineStatusEventDisconnected OnlineStatusEvent = "client.disconnected"
)

// DisconnectReason represents the EMQX client disconnection reason.
type DisconnectReason string

const (
	DisconnectReasonTakenOver DisconnectReason = "takenover"
)

// DeviceOnlineStatusPayload defines the EMQX client connected/disconnected event payload.
type DeviceOnlineStatusPayload struct {
	Event  OnlineStatusEvent `json:"event"`
	Reason DisconnectReason  `json:"reason,omitempty"`
}

// DeviceServiceReplyPayload defines the device reply payload for a thing-model service invocation.
type DeviceServiceReplyPayload struct {
	ID      string          `json:"id" validate:"required"`
	Code    int             `json:"code"`
	Data    json.RawMessage `json:"data"`
	Message string          `json:"message,omitempty"`
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

// DecodePayload accepts both native EMQX payload strings and existing JSON bodies.
// Keep the original payload intact so downstream consumers can inspect its wire form.
func (m DeviceMessage) DecodePayload(target any) error {
	data := bytes.TrimSpace(m.Payload)
	if len(data) > 0 && data[0] == '"' {
		var text string
		if err := json.Unmarshal(data, &text); err != nil {
			return err
		}
		data = []byte(text)
	}
	return json.Unmarshal(data, target)
}
