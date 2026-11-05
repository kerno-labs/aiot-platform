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

type stubServiceInvocationRepo struct {
	deviceKey      string
	invocationUUID string
	outputParams   string
	err            error
}

func (r *stubServiceInvocationRepo) UpdateOutput(_ context.Context, deviceKey, invocationUUID, outputParams string) error {
	if r.err != nil {
		return r.err
	}
	r.deviceKey = deviceKey
	r.invocationUUID = invocationUUID
	r.outputParams = outputParams
	return nil
}

func TestServiceInvocationService_HandleServiceReply(t *testing.T) {
	ctx := context.Background()

	t.Run("success reply stores data json directly", func(t *testing.T) {
		repo := &stubServiceInvocationRepo{}
		svc := NewServiceInvocationService(repo, zap.NewNop())

		msg := event.DeviceMessage{
			DeviceKey:   "dev_01",
			ProductKey:  "pk_01",
			Transport:   event.TransportMQTT,
			MessageType: event.MessageTypeServiceReply,
			Timestamp:   1730000000000,
			Payload:     json.RawMessage(`{"id":"inv-123","code":200,"data":{"power":true,"speed":3}}`),
		}
		require.NoError(t, svc.HandleServiceReply(ctx, msg))
		assert.Equal(t, "dev_01", repo.deviceKey)
		assert.Equal(t, "inv-123", repo.invocationUUID)
		assert.JSONEq(t, `{"power":true,"speed":3}`, repo.outputParams)
	})

	t.Run("success reply whose data contains code key preserves outer envelope", func(t *testing.T) {
		repo := &stubServiceInvocationRepo{}
		svc := NewServiceInvocationService(repo, zap.NewNop())

		msg := event.DeviceMessage{
			DeviceKey:   "dev_01",
			ProductKey:  "pk_01",
			Transport:   event.TransportMQTT,
			MessageType: event.MessageTypeServiceReply,
			Timestamp:   1730000000000,
			Payload:     json.RawMessage(`{"id":"inv-124","code":200,"data":{"code":404,"detail":"sub-resource"}}`),
		}
		require.NoError(t, svc.HandleServiceReply(ctx, msg))
		assert.JSONEq(t, `{"code":200,"data":{"code":404,"detail":"sub-resource"}}`, repo.outputParams)
	})

	t.Run("error reply preserves code and message", func(t *testing.T) {
		repo := &stubServiceInvocationRepo{}
		svc := NewServiceInvocationService(repo, zap.NewNop())

		msg := event.DeviceMessage{
			DeviceKey:   "dev_01",
			ProductKey:  "pk_01",
			Transport:   event.TransportMQTT,
			MessageType: event.MessageTypeServiceReply,
			Timestamp:   1730000000000,
			Payload:     json.RawMessage(`{"id":"inv-456","code":500,"message":"motor jammed"}`),
		}
		require.NoError(t, svc.HandleServiceReply(ctx, msg))
		assert.Equal(t, "inv-456", repo.invocationUUID)
		assert.JSONEq(t, `{"code":500,"message":"motor jammed"}`, repo.outputParams)
	})

	t.Run("invalid payload skipped gracefully", func(t *testing.T) {
		repo := &stubServiceInvocationRepo{}
		svc := NewServiceInvocationService(repo, zap.NewNop())

		msg := event.DeviceMessage{
			DeviceKey:   "dev_01",
			Transport:   event.TransportMQTT,
			MessageType: event.MessageTypeServiceReply,
			Timestamp:   1730000000000,
			Payload:     json.RawMessage(`{"code":200}`),
		}
		require.NoError(t, svc.HandleServiceReply(ctx, msg))
		assert.Empty(t, repo.invocationUUID)
	})

	t.Run("repository error is propagated", func(t *testing.T) {
		repo := &stubServiceInvocationRepo{err: errors.New("db error")}
		svc := NewServiceInvocationService(repo, zap.NewNop())

		msg := event.DeviceMessage{
			DeviceKey:   "dev_01",
			Transport:   event.TransportMQTT,
			MessageType: event.MessageTypeServiceReply,
			Timestamp:   1730000000000,
			Payload:     json.RawMessage(`{"id":"inv-789","code":200,"data":{"ok":true}}`),
		}
		require.Error(t, svc.HandleServiceReply(ctx, msg))
	})
}

