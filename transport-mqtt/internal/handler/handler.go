package handler

import "transport-mqtt/internal/service"

// IngressHandler handles incoming MQTT traffic from devices and converts it to
// internal events. Each message type is handled in its own file.
type IngressHandler struct {
	deviceEventService *service.DeviceEventService
	otaService         *service.OTAService
}

// NewIngressHandler creates an MQTT ingress handler.
func NewIngressHandler(deviceEventService *service.DeviceEventService, otaService *service.OTAService) *IngressHandler {
	return &IngressHandler{
		deviceEventService: deviceEventService,
		otaService:         otaService,
	}
}
