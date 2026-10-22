package consumer

import (
	"context"

	"transport-mqtt/internal/event"
	"transport-mqtt/pkg/log"

	"go.uber.org/zap"
)

// Manager coordinates all Kafka event subscriptions for transport-mqtt.
type Manager struct {
	consumer           event.Consumer
	otaCommandConsumer *OTACommandConsumer
	logger             *log.Logger
}

func NewManager(consumer event.Consumer, otaCommandConsumer *OTACommandConsumer, logger *log.Logger) *Manager {
	return &Manager{
		consumer:           consumer,
		otaCommandConsumer: otaCommandConsumer,
		logger:             logger,
	}
}

// Start registers all topic subscriptions for transport-mqtt.
func (m *Manager) Start(ctx context.Context) error {
	if m.consumer == nil {
		m.logger.Warn("event consumer not configured; skipping Kafka topic subscriptions")
		return nil
	}

	// 1. Subscribe to MQTT-specific OTA upgrade dispatch commands
	if err := event.Subscribe(ctx, m.consumer, event.TopicOTAUpgradeCommandMQTT, m.otaCommandConsumer.HandleUpgradeCommand); err != nil {
		m.logger.Error("failed to subscribe to TopicOTAUpgradeCommandMQTT", zap.Error(err))
		return err
	}

	m.logger.Info("all transport-mqtt event subscriptions registered successfully")
	return nil
}
