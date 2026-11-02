package consumer

import (
	"context"
	"encoding/json"
	"testing"

	"data-engine/internal/event"
	"data-engine/internal/handler"
	"data-engine/internal/model"
	"data-engine/internal/service"
	"data-engine/internal/tsdb"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

type recordingEventRepository struct{ records []*model.DeviceEvent }

func (r *recordingEventRepository) Create(_ context.Context, record *model.DeviceEvent) error {
	r.records = append(r.records, record)
	return nil
}

type recordingTelemetryClient struct{ records []tsdb.Record }

func (c *recordingTelemetryClient) WriteBatch(_ context.Context, records []tsdb.Record) error {
	c.records = append(c.records, records...)
	return nil
}
func (*recordingTelemetryClient) QueryPoints(context.Context, tsdb.QueryFilter) ([]tsdb.Point, error) {
	return nil, nil
}
func (*recordingTelemetryClient) Close() error { return nil }

func emqxMessage(t *testing.T, kind event.MessageType, payload string, asString bool) *event.DeviceMessage {
	t.Helper()
	var body any = json.RawMessage(payload)
	if asString {
		body = payload
	}
	data, err := json.Marshal(map[string]any{
		"device_key": "device1", "product_key": "product1", "transport": "mqtt",
		"message_type": kind, "timestamp": int64(1793534400000), "payload": body,
	})
	require.NoError(t, err)
	var msg event.DeviceMessage
	require.NoError(t, json.Unmarshal(data, &msg))
	return &msg
}

func TestEMQXStringPayloadAllUplinkTopics(t *testing.T) {
	for _, asString := range []bool{true, false} {
		name := "json"
		if asString {
			name = "string"
		}
		t.Run(name, func(t *testing.T) {
			logger := zap.NewNop()
			ctx := context.Background()
			t.Run("device-telemetry-report", func(t *testing.T) {
				payload := `{"id":"123","version":"1.0","sys":{"ack":0},"params":{"temperature":{"value":26.5,"time":12345}},"method":"thing.event.property.post"}`
				client := &recordingTelemetryClient{}
				c := NewTelemetryConsumer(handler.NewTelemetryHandler(service.NewTelemetryService(logger, client), logger))
				msg := emqxMessage(t, event.MessageTypeTelemetry, payload, asString)
				require.NoError(t, c.HandlePropertyPost(ctx, msg, nil))
				require.Len(t, client.records, 1)
				require.Equal(t, "temperature", client.records[0].Metric)
				require.Equal(t, 26.5, client.records[0].Value)
				require.Equal(t, int64(12345), client.records[0].Timestamp)
			})
			t.Run("device-event-report", func(t *testing.T) {
				repo := &recordingEventRepository{}
				c := NewEventConsumer(handler.NewEventHandler(service.NewEventService(logger, repo), logger))
				msg := emqxMessage(t, event.MessageTypeEvent, `{"identifier":"overheat","type":"alert","timestamp":12345,"data":{"temperature":88.8}}`, asString)
				require.NoError(t, c.HandleEvent(ctx, msg, nil))
				require.Len(t, repo.records, 1)
				require.Equal(t, "overheat", repo.records[0].EventIdentifier)
				require.Equal(t, "device1", repo.records[0].DeviceKey)
			})
			t.Run("ota-progress-report", func(t *testing.T) {
				repo := &mockDeviceUpgradeStatusRepository{}
				c := NewOTAProgressConsumer(handler.NewOTAHandler(service.NewOTAService(repo, logger), logger))
				msg := emqxMessage(t, event.MessageTypeOTAProgress, `{"batch_id":"batch1","step":50}`, asString)
				require.NoError(t, c.HandleProgressReport(ctx, msg, nil))
				require.Equal(t, "batch1", repo.batchID)
				require.Equal(t, int32(50), repo.progress)
			})
			t.Run("ota-device-info", func(t *testing.T) {
				repo := &mockDeviceUpgradeStatusRepository{}
				c := NewOTADeviceInfoConsumer(handler.NewOTAHandler(service.NewOTAService(repo, logger), logger))
				msg := emqxMessage(t, event.MessageTypeOTAInform, `{"version":"1.2.3"}`, asString)
				require.NoError(t, c.HandleDeviceInfo(ctx, msg, nil))
				require.Equal(t, "1.2.3", repo.version)
				require.Equal(t, "device1", repo.deviceKey)
			})
		})
	}
}
