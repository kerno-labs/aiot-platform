package service

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"data-engine/internal/event"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

type mockDeviceStateRepository struct {
	onlineCalls  []stateCall
	offlineCalls []stateCall
	err          error
}

type stateCall struct {
	deviceKey string
	timestamp int64
}

func (m *mockDeviceStateRepository) MarkOnline(ctx context.Context, deviceKey string, timestamp int64) error {
	if m.err != nil {
		return m.err
	}
	m.onlineCalls = append(m.onlineCalls, stateCall{deviceKey: deviceKey, timestamp: timestamp})
	return nil
}

func (m *mockDeviceStateRepository) MarkOffline(ctx context.Context, deviceKey string, timestamp int64) error {
	if m.err != nil {
		return m.err
	}
	m.offlineCalls = append(m.offlineCalls, stateCall{deviceKey: deviceKey, timestamp: timestamp})
	return nil
}

func TestDeviceStateService_HandleOnlineStatus(t *testing.T) {
	ctx := context.Background()

	t.Run("client.connected marks device online", func(t *testing.T) {
		repo := &mockDeviceStateRepository{}
		svc := NewDeviceStateService(zap.NewNop(), repo)

		msg := event.DeviceMessage{
			DeviceKey:   "sensor_01",
			Transport:   event.TransportMQTT,
			MessageType: event.MessageTypeOnlineStatus,
			Timestamp:   1730000001000,
			Payload:     json.RawMessage(`"{\"event\":\"client.connected\",\"reason\":\"\"}"`),
		}

		require.NoError(t, svc.HandleOnlineStatus(ctx, msg))
		require.Len(t, repo.onlineCalls, 1)
		assert.Equal(t, stateCall{deviceKey: "sensor_01", timestamp: 1730000001000}, repo.onlineCalls[0])
		assert.Empty(t, repo.offlineCalls)
	})

	t.Run("client.disconnected with normal or keepalive_timeout reason marks device offline", func(t *testing.T) {
		repo := &mockDeviceStateRepository{}
		svc := NewDeviceStateService(zap.NewNop(), repo)

		msg := event.DeviceMessage{
			DeviceKey:   "sensor_01",
			Transport:   event.TransportMQTT,
			MessageType: event.MessageTypeOnlineStatus,
			Timestamp:   1730000002000,
			Payload:     json.RawMessage(`{"event":"client.disconnected","reason":"keepalive_timeout"}`),
		}

		require.NoError(t, svc.HandleOnlineStatus(ctx, msg))
		require.Len(t, repo.offlineCalls, 1)
		assert.Equal(t, stateCall{deviceKey: "sensor_01", timestamp: 1730000002000}, repo.offlineCalls[0])
		assert.Empty(t, repo.onlineCalls)
	})

	t.Run("client.disconnected with reason takenover is ignored", func(t *testing.T) {
		repo := &mockDeviceStateRepository{}
		svc := NewDeviceStateService(zap.NewNop(), repo)

		msg := event.DeviceMessage{
			DeviceKey:   "sensor_01",
			Transport:   event.TransportMQTT,
			MessageType: event.MessageTypeOnlineStatus,
			Timestamp:   1730000003000,
			Payload:     json.RawMessage(`{"event":"client.disconnected","reason":"takenover"}`),
		}

		require.NoError(t, svc.HandleOnlineStatus(ctx, msg))
		assert.Empty(t, repo.onlineCalls)
		assert.Empty(t, repo.offlineCalls)
	})

	t.Run("invalid payload or empty device_key is skipped gracefully", func(t *testing.T) {
		repo := &mockDeviceStateRepository{}
		svc := NewDeviceStateService(zap.NewNop(), repo)

		require.NoError(t, svc.HandleOnlineStatus(ctx, event.DeviceMessage{}))
		require.NoError(t, svc.HandleOnlineStatus(ctx, event.DeviceMessage{
			DeviceKey: "sensor_01",
			Payload:   json.RawMessage(`{broken`),
		}))
		assert.Empty(t, repo.onlineCalls)
		assert.Empty(t, repo.offlineCalls)
	})

	t.Run("repository error is propagated for retry", func(t *testing.T) {
		repo := &mockDeviceStateRepository{err: errors.New("db error")}
		svc := NewDeviceStateService(zap.NewNop(), repo)

		err := svc.HandleOnlineStatus(ctx, event.DeviceMessage{
			DeviceKey: "sensor_01",
			Timestamp: 1730000001000,
			Payload:   json.RawMessage(`{"event":"client.connected"}`),
		})
		require.Error(t, err)
		assert.Contains(t, err.Error(), "mark device online")
	})
}

