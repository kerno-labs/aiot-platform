package event

import "encoding/json"

// DeviceServiceInvokeCommand is published by backend to dispatch a thing-model service call to MQTT devices.
type DeviceServiceInvokeCommand struct {
	ID                string          `json:"id"`
	Version           string          `json:"version"`
	Method            string          `json:"method"`
	Params            json.RawMessage `json:"params"`
	ProductKey        string          `json:"product_key"`
	DeviceKey         string          `json:"device_key"`
	ServiceIdentifier string          `json:"service_identifier"`
}

