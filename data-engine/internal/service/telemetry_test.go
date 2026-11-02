package service

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"data-engine/internal/event"
	"data-engine/internal/tsdb"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

const propertyReport = `{"id":"123","version":"1.0","sys":{"ack":0},"params":{"temperature":{"value":26.51234567,"time":1730000000000},"location":{"value":{"latitude":31.2304,"longitude":121.4737},"time":1730000001000},"Power":{"value":"on","time":1730000000000},"enabled":{"value":false,"time":1730000000000}},"method":"thing.event.property.post"}`

type telemetryRecorder struct {
	records []tsdb.Record
	err     error
}

func (c *telemetryRecorder) WriteBatch(_ context.Context, records []tsdb.Record) error {
	c.records = append(c.records, records...)
	return c.err
}
func (*telemetryRecorder) QueryPoints(context.Context, tsdb.QueryFilter) ([]tsdb.Point, error) {
	return nil, nil
}
func (*telemetryRecorder) Close() error { return nil }

func TestTelemetryService_ProcessPropertyPost(t *testing.T) {
	for _, asString := range []bool{false, true} {
		body := json.RawMessage(propertyReport)
		if asString {
			var err error
			body, err = json.Marshal(propertyReport)
			require.NoError(t, err)
		}
		client := &telemetryRecorder{}
		svc := NewTelemetryService(zap.NewNop(), client)
		msg := event.DeviceMessage{DeviceKey: "device1", Payload: body, Timestamp: 1730000002000}
		require.NoError(t, svc.ProcessPropertyPost(context.Background(), msg))
		require.Len(t, client.records, 4)
		records := map[string]tsdb.Record{}
		for _, record := range client.records {
			require.Equal(t, "device1", record.DeviceKey)
			records[record.Metric] = record
		}
		require.Equal(t, int64(1730000000000), records["temperature"].Timestamp)
		require.Equal(t, 26.51234567, records["temperature"].Value)
		require.Equal(t, int64(1730000001000), records["location"].Timestamp)
		require.Equal(t, map[string]interface{}{"latitude": 31.2304, "longitude": 121.4737}, records["location"].Value)
		require.Equal(t, "on", records["Power"].Value)
		require.Equal(t, false, records["enabled"].Value)
		client.err = errors.New("write failed")
		require.ErrorIs(t, svc.ProcessPropertyPost(context.Background(), msg), client.err)
	}
}

func TestDecodeTelemetryPayload(t *testing.T) {
	for _, tc := range []struct {
		name    string
		mutate  func(map[string]interface{})
		invalid bool
	}{
		{name: "standard"},
		{name: "omitted sys", mutate: func(p map[string]interface{}) { delete(p, "sys") }},
		{name: "omitted time", mutate: func(p map[string]interface{}) {
			delete(p["params"].(map[string]interface{})["temperature"].(map[string]interface{}), "time")
		}},
		{name: "omitted metadata", mutate: func(p map[string]interface{}) {
			delete(p, "id")
			delete(p, "version")
			delete(p, "method")
			delete(p, "sys")
		}},
		{name: "missing id", mutate: func(p map[string]interface{}) { delete(p, "id") }},
		{name: "custom version", mutate: func(p map[string]interface{}) { p["version"] = "2.0" }},
		{name: "custom method", mutate: func(p map[string]interface{}) { p["method"] = "thing.event.other.post" }},
		{name: "custom ack", mutate: func(p map[string]interface{}) { p["sys"] = map[string]interface{}{"ack": 2} }},
		{name: "empty params", mutate: func(p map[string]interface{}) { p["params"] = map[string]interface{}{} }, invalid: true},
		{name: "missing value", mutate: func(p map[string]interface{}) {
			delete(p["params"].(map[string]interface{})["temperature"].(map[string]interface{}), "value")
		}, invalid: true},
		{name: "null value", mutate: func(p map[string]interface{}) {
			p["params"].(map[string]interface{})["temperature"].(map[string]interface{})["value"] = nil
		}, invalid: true},
		{name: "zero time", mutate: func(p map[string]interface{}) {
			p["params"].(map[string]interface{})["temperature"].(map[string]interface{})["time"] = 0
		}, invalid: true},
		{name: "negative time", mutate: func(p map[string]interface{}) {
			p["params"].(map[string]interface{})["temperature"].(map[string]interface{})["time"] = -1
		}, invalid: true},
		{name: "empty identifier", mutate: func(p map[string]interface{}) {
			p["params"].(map[string]interface{})[""] = map[string]interface{}{"value": 1}
		}, invalid: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var report map[string]interface{}
			require.NoError(t, json.Unmarshal([]byte(propertyReport), &report))
			if tc.mutate != nil {
				tc.mutate(report)
			}
			body, err := json.Marshal(report)
			require.NoError(t, err)
			for _, asString := range []bool{false, true} {
				payload := json.RawMessage(body)
				if asString {
					payload, err = json.Marshal(string(body))
					require.NoError(t, err)
				}
				msg := event.DeviceMessage{DeviceKey: "device1", Payload: payload, Timestamp: 99999}
				decoded, err := decodeAndValidatePropertyPost(msg)
				if tc.invalid {
					require.Error(t, err)
					require.Nil(t, decoded)
					client := &telemetryRecorder{}
					require.NoError(t, NewTelemetryService(zap.NewNop(), client).ProcessPropertyPost(context.Background(), msg))
					require.Empty(t, client.records)
				} else {
					require.NoError(t, err)
					require.Len(t, decoded.Params, 4)
					if tc.name == "omitted time" {
						require.Equal(t, int64(99999), *decoded.Params["temperature"].Time)
					}
				}
			}
		})
	}
	for _, body := range []string{`null`, `[]`, `{"ts":12345,"values":{"temperature":26.5}}`, `{"temperature":26.5}`, `{"id":"123","version":"1.0","method":"thing.event.property.post","params":{"temperature":26.5}}`, `{`, ``} {
		_, err := decodeAndValidatePropertyPost(event.DeviceMessage{Payload: json.RawMessage(body)})
		require.Error(t, err, "payload: %s", body)
	}
}
