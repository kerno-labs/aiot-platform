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

type mockServiceInvocationRepository struct{}

func (m *mockServiceInvocationRepository) UpdateOutput(ctx context.Context, deviceKey, invocationUUID, outputParams string) error {
	return nil
}

func TestServiceReplyConsumer_HandleServiceReply(t *testing.T) {
	logger := zap.NewNop()
	svc := service.NewServiceInvocationService(&mockServiceInvocationRepository{}, logger)
	c := NewServiceReplyConsumer(handler.NewServiceInvocationHandler(svc))

	msg := &event.DeviceMessage{
		DeviceKey:   "dev_01",
		ProductKey:  "pk_01",
		Transport:   event.TransportMQTT,
		MessageType: event.MessageTypeServiceReply,
		Payload:     json.RawMessage(`{"id":"inv-001","code":200,"data":{"status":"ok"}}`),
		Timestamp:   time.Now().UnixMilli(),
	}

	require.NoError(t, c.HandleServiceReply(context.Background(), msg, nil))
}

