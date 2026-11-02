package service

import (
	"context"
	"fmt"

	"data-engine/internal/event"
	"data-engine/internal/model"
	"data-engine/internal/repository"

	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// EventService manages lifecycle and business alarm event processing.
type EventService interface {
	// HandleEvent processes an incoming device event message.
	HandleEvent(ctx context.Context, msg event.DeviceMessage) error
}

type eventService struct {
	logger          *zap.Logger
	deviceEventRepo repository.DeviceEventRepository
	validate        *validator.Validate
}

// NewEventService creates an instance of EventService with required dependencies.
func NewEventService(
	logger *zap.Logger,
	deviceEventRepo repository.DeviceEventRepository,
) EventService {
	return &eventService{
		logger:          logger,
		deviceEventRepo: deviceEventRepo,
		validate:        validator.New(),
	}
}

// HandleEvent processes incoming device events and persists them to device_events table.
func (s *eventService) HandleEvent(ctx context.Context, msg event.DeviceMessage) error {
	if err := s.validate.Struct(&msg); err != nil {
		s.logger.Warn("invalid device message envelope",
			zap.String("device_key", msg.DeviceKey),
			zap.Error(err),
		)
		return nil
	}

	var payload event.DeviceEventPayload
	if err := msg.DecodePayload(&payload); err != nil {
		s.logger.Warn("failed to unmarshal device event payload",
			zap.String("device_key", msg.DeviceKey),
			zap.Error(err),
		)
		return nil
	}
	if err := s.validate.Struct(&payload); err != nil {
		s.logger.Warn("invalid device event payload",
			zap.String("device_key", msg.DeviceKey),
			zap.Error(err),
		)
		return nil
	}

	deviceEvent := &model.DeviceEvent{
		UUID:            uuid.NewString(),
		DeviceKey:       msg.DeviceKey,
		ProductKey:      msg.ProductKey,
		EventIdentifier: payload.Identifier,
		EventType:       string(payload.Type),
		EventAt:         payload.Timestamp,
		Data:            string(payload.Data),
	}

	if err := s.deviceEventRepo.Create(ctx, deviceEvent); err != nil {
		s.logger.Error("failed to persist device event",
			zap.String("device_key", msg.DeviceKey),
			zap.String("event", payload.Identifier),
			zap.Error(err),
		)
		return fmt.Errorf("persist device event: %w", err)
	}

	return nil
}
