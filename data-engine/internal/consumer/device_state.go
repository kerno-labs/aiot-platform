package consumer

import (
	"context"

	"data-engine/internal/event"
	"data-engine/internal/handler"
)

// DeviceStateConsumer handles device online/offline status events from EMQX.
type DeviceStateConsumer struct {
	deviceStateHandler *handler.DeviceStateHandler
}

// NewDeviceStateConsumer creates a new DeviceStateConsumer instance.
func NewDeviceStateConsumer(deviceStateHandler *handler.DeviceStateHandler) *DeviceStateConsumer {
	return &DeviceStateConsumer{
		deviceStateHandler: deviceStateHandler,
	}
}

// HandleOnlineStatus processes device online status messages and forwards them to the handler.
func (c *DeviceStateConsumer) HandleOnlineStatus(ctx context.Context, msg *event.DeviceMessage, meta map[string]string) error {
	return c.deviceStateHandler.HandleOnlineStatus(ctx, msg, meta)
}

