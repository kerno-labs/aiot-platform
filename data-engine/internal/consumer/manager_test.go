package consumer

import (
	"context"
	"testing"

	"data-engine/internal/event"
	"data-engine/internal/handler"
	"data-engine/internal/service"
	"data-engine/internal/tsdb"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/ThreeDotsLabs/watermill/pubsub/gochannel"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

type topicRecordingSubscriber struct {
	message.Subscriber
	topics []string
}

func (s *topicRecordingSubscriber) Subscribe(ctx context.Context, topic string) (<-chan *message.Message, error) {
	s.topics = append(s.topics, topic)
	return s.Subscriber.Subscribe(ctx, topic)
}

func TestManager_Start(t *testing.T) {
	logger := zap.NewNop()
	mockTSDB := tsdb.NewMockClient(logger)
	telemetryService := service.NewTelemetryService(logger, mockTSDB)
	eventService := service.NewEventService(logger, &mockDeviceEventRepository{})
	deviceStateService := service.NewDeviceStateService(logger, &mockDeviceStateRepository{})
	serviceInvocationService := service.NewServiceInvocationService(&mockServiceInvocationRepository{}, logger)
	otaStore := &mockDeviceUpgradeStatusRepository{}
	otaService := service.NewOTAService(otaStore, logger)

	pubSub := gochannel.NewGoChannel(gochannel.Config{}, watermill.NopLogger{})
	defer pubSub.Close()

	subscriber := &topicRecordingSubscriber{Subscriber: pubSub}
	eventConsumer := event.NewConsumer(subscriber, logger)
	telemetryConsumer := NewTelemetryConsumer(handler.NewTelemetryHandler(telemetryService, logger))
	eventConsumerHandler := NewEventConsumer(handler.NewEventHandler(eventService, logger))
	deviceStateConsumer := NewDeviceStateConsumer(handler.NewDeviceStateHandler(deviceStateService, logger))
	serviceReplyConsumer := NewServiceReplyConsumer(handler.NewServiceInvocationHandler(serviceInvocationService))
	otaHandler := handler.NewOTAHandler(otaService, logger)
	otaProgressConsumer := NewOTAProgressConsumer(otaHandler)
	otaDeviceInfoConsumer := NewOTADeviceInfoConsumer(otaHandler)

	manager := NewManager(eventConsumer, telemetryConsumer, eventConsumerHandler, deviceStateConsumer, serviceReplyConsumer, otaProgressConsumer, otaDeviceInfoConsumer, logger)

	err := manager.Start(context.Background())
	if err != nil {
		t.Fatalf("unexpected error starting manager: %v", err)
	}
	require.ElementsMatch(t, []string{
		"device-telemetry-report", "device-event-report", "device-online-status", "device-service-reply", "ota-progress-report", "ota-device-info",
	}, subscriber.topics)
}
