package service

import (
	"context"
	"fmt"
	"time"

	"data-engine/internal/event"
	"data-engine/internal/repository"

	"go.uber.org/zap"
)

// DeviceStateService processes device online/offline status events from EMQX.
type DeviceStateService interface {
	// HandleOnlineStatus updates the device online/offline status in device_states.
	HandleOnlineStatus(ctx context.Context, msg event.DeviceMessage) error
}

type deviceStateService struct {
	logger          *zap.Logger
	deviceStateRepo repository.DeviceStateRepository
}

// NewDeviceStateService creates a new DeviceStateService instance.
func NewDeviceStateService(
	logger *zap.Logger,
	deviceStateRepo repository.DeviceStateRepository,
) DeviceStateService {
	return &deviceStateService{
		logger:          logger,
		deviceStateRepo: deviceStateRepo,
	}
}

// HandleOnlineStatus processes EMQX $events/client_connected and $events/client_disconnected events.
func (s *deviceStateService) HandleOnlineStatus(ctx context.Context, msg event.DeviceMessage) error {
	if msg.DeviceKey == "" {
		s.logger.Warn("missing device_key in online status message")
		return nil
	}

	var payload event.DeviceOnlineStatusPayload
	if len(msg.Payload) > 0 {
		if err := msg.DecodePayload(&payload); err != nil {
			s.logger.Warn("failed to decode online status payload",
				zap.String("device_key", msg.DeviceKey),
				zap.Error(err),
			)
			return nil
		}
	}

	eventName := payload.Event
	if eventName == "" && msg.Headers != nil {
		eventName = event.OnlineStatusEvent(msg.Headers["event"])
	}

	ts := msg.Timestamp
	if ts <= 0 {
		ts = time.Now().UnixMilli()
	}

	switch eventName {
	case event.OnlineStatusEventConnected:
		if err := s.deviceStateRepo.MarkOnline(ctx, msg.DeviceKey, ts); err != nil {
			s.logger.Error("failed to mark device online",
				zap.String("device_key", msg.DeviceKey),
				zap.Int64("timestamp", ts),
				zap.Error(err),
			)
			return fmt.Errorf("mark device online: %w", err)
		}
		return nil

	case event.OnlineStatusEventDisconnected:
		// Ignore session takeover disconnects when the same clientid reconnects on a new socket.
		if payload.Reason == event.DisconnectReasonTakenOver {
			s.logger.Debug("ignoring takenover disconnect event",
				zap.String("device_key", msg.DeviceKey),
			)
			return nil
		}
		if err := s.deviceStateRepo.MarkOffline(ctx, msg.DeviceKey, ts); err != nil {
			s.logger.Error("failed to mark device offline",
				zap.String("device_key", msg.DeviceKey),
				zap.String("reason", string(payload.Reason)),
				zap.Int64("timestamp", ts),
				zap.Error(err),
			)
			return fmt.Errorf("mark device offline: %w", err)
		}
		return nil

	default:
		s.logger.Warn("unsupported online status event",
			zap.String("device_key", msg.DeviceKey),
			zap.String("event", string(eventName)),
		)
		return nil
	}
}

