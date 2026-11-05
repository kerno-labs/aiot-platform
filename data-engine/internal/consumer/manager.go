package consumer

import (
	"context"

	"data-engine/internal/event"

	"go.uber.org/zap"
)

// Manager coordinates event subscriptions across all domain consumer handlers.
type Manager struct {
	consumer              event.Consumer
	telemetryConsumer     *TelemetryConsumer
	eventConsumer         *EventConsumer
	deviceStateConsumer   *DeviceStateConsumer
	serviceReplyConsumer  *ServiceReplyConsumer
	otaProgressConsumer   *OTAProgressConsumer
	otaDeviceInfoConsumer *OTADeviceInfoConsumer
	logger                *zap.Logger
}

func NewManager(
	consumer event.Consumer,
	telemetryConsumer *TelemetryConsumer,
	eventConsumer *EventConsumer,
	deviceStateConsumer *DeviceStateConsumer,
	serviceReplyConsumer *ServiceReplyConsumer,
	otaProgressConsumer *OTAProgressConsumer,
	otaDeviceInfoConsumer *OTADeviceInfoConsumer,
	logger *zap.Logger,
) *Manager {
	return &Manager{
		consumer:              consumer,
		telemetryConsumer:     telemetryConsumer,
		eventConsumer:         eventConsumer,
		deviceStateConsumer:   deviceStateConsumer,
		serviceReplyConsumer:  serviceReplyConsumer,
		otaProgressConsumer:   otaProgressConsumer,
		otaDeviceInfoConsumer: otaDeviceInfoConsumer,
		logger:                logger,
	}
}

// Start registers all topic subscriptions with the event bus.
func (m *Manager) Start(ctx context.Context) error {
	// 1. Subscribe to device telemetry/property reports
	if err := event.Subscribe(ctx, m.consumer, event.TopicDeviceTelemetryReport, m.telemetryConsumer.HandlePropertyPost); err != nil {
		return err
	}

	// 2. Subscribe to device business events and alarms
	if err := event.Subscribe(ctx, m.consumer, event.TopicDeviceEventReport, m.eventConsumer.HandleEvent); err != nil {
		return err
	}

	// 3. Subscribe to device online/offline status events
	if err := event.Subscribe(ctx, m.consumer, event.TopicDeviceOnlineStatus, m.deviceStateConsumer.HandleOnlineStatus); err != nil {
		return err
	}

	// 4. Subscribe to device service invocation replies
	if err := event.Subscribe(ctx, m.consumer, event.TopicDeviceServiceReply, m.serviceReplyConsumer.HandleServiceReply); err != nil {
		return err
	}

	// 5. Subscribe to device OTA progress reports
	if err := event.Subscribe(ctx, m.consumer, event.TopicOTAProgressReport, m.otaProgressConsumer.HandleProgressReport); err != nil {
		return err
	}

	// 6. Subscribe to device OTA inform version reports
	if err := event.Subscribe(ctx, m.consumer, event.TopicOTADeviceInfo, m.otaDeviceInfoConsumer.HandleDeviceInfo); err != nil {
		return err
	}

	m.logger.Info("all event subscriptions registered successfully")
	return nil
}
