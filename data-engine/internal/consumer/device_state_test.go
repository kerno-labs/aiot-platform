package consumer

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"data-engine/internal/event"
	"data-engine/internal/handler"
	"data-engine/internal/service"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

type mockDeviceStateRepository struct{}

func (m *mockDeviceStateRepository) MarkOnline(ctx context.Context, deviceKey string, timestamp int64) error {
	return nil
}

func (m *mockDeviceStateRepository) MarkOffline(ctx context.Context, deviceKey string, timestamp int64) error {
	return nil
}

func TestDeviceStateConsumer_HandleOnlineStatus(t *testing.T) {
	logger := zap.NewNop()
	svc := service.NewDeviceStateService(logger, &mockDeviceStateRepository{})
	c := NewDeviceStateConsumer(handler.NewDeviceStateHandler(svc, logger))

	msg := &event.DeviceMessage{
		DeviceKey:   "dev_01",
		Transport:   event.TransportMQTT,
		MessageType: event.MessageTypeOnlineStatus,
		Payload:     json.RawMessage(`{"event":"client.connected"}`),
		Timestamp:   time.Now().UnixMilli(),
	}

	require.NoError(t, c.HandleOnlineStatus(context.Background(), msg, nil))
}

