package consumer

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"data-engine/internal/event"
	"data-engine/internal/handler"
	"data-engine/internal/service"
	"data-engine/internal/tsdb"

	"go.uber.org/zap"
)

func TestTelemetryConsumer_HandlePropertyPost(t *testing.T) {
	logger := zap.NewNop()
	mockTSDB := tsdb.NewMockClient(logger)
	telemetryService := service.NewTelemetryService(logger, mockTSDB)

	consumer := NewTelemetryConsumer(handler.NewTelemetryHandler(telemetryService, logger))

	rawPayload := json.RawMessage(`{"id":"1","version":"1.0","sys":{"ack":0},"params":{"temperature":{"value":26.5,"time":1730000000000},"humidity":{"value":65,"time":1730000000000}},"method":"thing.event.property.post"}`)
	msg := &event.DeviceMessage{
		DeviceKey:   "dev_telemetry_01",
		ProductKey:  "prod_01",
		Transport:   event.TransportMQTT,
		MessageType: event.MessageTypeTelemetry,
		Payload:     json.RawMessage(rawPayload),
		Timestamp:   time.Now().UnixMilli(),
	}

	err := consumer.HandlePropertyPost(context.Background(), msg, nil)
	if err != nil {
		t.Fatalf("unexpected error in HandlePropertyPost: %v", err)
	}
}
