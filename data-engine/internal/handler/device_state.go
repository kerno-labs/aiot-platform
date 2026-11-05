package handler

import (
	"context"

	"data-engine/internal/event"
	"data-engine/internal/service"

	"go.uber.org/zap"
)

// DeviceStateHandler dispatches device online status events to the service layer.
type DeviceStateHandler struct {
	deviceStateService service.DeviceStateService
	logger             *zap.Logger
}

// NewDeviceStateHandler creates a new DeviceStateHandler instance.
func NewDeviceStateHandler(deviceStateService service.DeviceStateService, logger *zap.Logger) *DeviceStateHandler {
	return &DeviceStateHandler{
		deviceStateService: deviceStateService,
		logger:             logger,
	}
}

// HandleOnlineStatus forwards the received device online status message to DeviceStateService.
func (h *DeviceStateHandler) HandleOnlineStatus(ctx context.Context, msg *event.DeviceMessage, meta map[string]string) error {
	if msg == nil {
		return nil
	}
	h.logger.Debug("handling device online status event",
		zap.String("device_key", msg.DeviceKey),
		zap.String("transport", msg.Transport.String()),
		zap.String("type", msg.MessageType.String()),
	)
	return h.deviceStateService.HandleOnlineStatus(ctx, *msg)
}

