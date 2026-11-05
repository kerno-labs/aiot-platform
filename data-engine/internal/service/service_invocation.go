package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"

	"data-engine/internal/event"
	"data-engine/internal/repository"

	"github.com/go-playground/validator/v10"
	"go.uber.org/zap"
)

// ServiceInvocationService processes device service invocation replies.
type ServiceInvocationService interface {
	HandleServiceReply(ctx context.Context, msg event.DeviceMessage) error
}

type serviceInvocationService struct {
	repo     repository.DeviceServiceInvocationRepository
	validate *validator.Validate
	logger   *zap.Logger
}

// NewServiceInvocationService creates an instance of ServiceInvocationService.
func NewServiceInvocationService(
	repo repository.DeviceServiceInvocationRepository,
	logger *zap.Logger,
) ServiceInvocationService {
	return &serviceInvocationService{
		repo:     repo,
		validate: validator.New(),
		logger:   logger,
	}
}

// HandleServiceReply validates the incoming service reply message and updates output_params on the invocation record.
func (s *serviceInvocationService) HandleServiceReply(ctx context.Context, msg event.DeviceMessage) error {
	if err := s.validate.Struct(&msg); err != nil {
		s.logger.Warn("invalid service reply device message envelope",
			zap.String("device_key", msg.DeviceKey),
			zap.Error(err),
		)
		return nil
	}

	var payload event.DeviceServiceReplyPayload
	if err := msg.DecodePayload(&payload); err != nil {
		s.logger.Warn("failed to unmarshal device service reply payload",
			zap.String("device_key", msg.DeviceKey),
			zap.Error(err),
		)
		return nil
	}
	if err := s.validate.Struct(&payload); err != nil {
		s.logger.Warn("invalid device service reply payload",
			zap.String("device_key", msg.DeviceKey),
			zap.Error(err),
		)
		return nil
	}

	outputParams := formatServiceReplyOutput(payload)
	if err := s.repo.UpdateOutput(ctx, msg.DeviceKey, payload.ID, outputParams); err != nil {
		s.logger.Error("failed to update service invocation output",
			zap.String("device_key", msg.DeviceKey),
			zap.String("invocation_uuid", payload.ID),
			zap.Error(err),
		)
		return fmt.Errorf("update service invocation output: %w", err)
	}

	return nil
}

// formatServiceReplyOutput extracts the raw JSON data payload for successful replies (code 0 or 200 without an error message)
// unless the data object itself contains a top-level "code" key, in which case the outer {code, data, message} envelope is preserved
// so callers can unambiguously distinguish RPC status codes from business payload fields.
func formatServiceReplyOutput(payload event.DeviceServiceReplyPayload) string {
	trimmed := bytes.TrimSpace(payload.Data)
	if len(trimmed) > 0 && string(trimmed) != "null" && payload.Message == "" && (payload.Code == 0 || payload.Code == 200) {
		var obj map[string]any
		if err := json.Unmarshal(trimmed, &obj); err != nil || obj == nil {
			return string(trimmed)
		}
		if _, hasCode := obj["code"]; !hasCode {
			return string(trimmed)
		}
	}
	envelope := map[string]any{
		"code": payload.Code,
	}
	if len(trimmed) > 0 && string(trimmed) != "null" {
		var parsed any
		if err := json.Unmarshal(trimmed, &parsed); err == nil {
			envelope["data"] = parsed
		}
	}
	if payload.Message != "" {
		envelope["message"] = payload.Message
	}
	encoded, err := json.Marshal(envelope)
	if err != nil {
		return "{}"
	}
	return string(encoded)
}

