package service

import (
	"context"
	"fmt"

	"data-engine/internal/event"
	"data-engine/internal/tsdb"

	"go.uber.org/zap"
)

// TelemetryService processes device telemetry/property metrics and writes to TSDB.
type TelemetryService interface {
	ProcessPropertyPost(ctx context.Context, msg event.DeviceMessage) error
}

type telemetryService struct {
	tsdbClient tsdb.Client
	logger     *zap.Logger
}

// NewTelemetryService creates an instance of TelemetryService.
func NewTelemetryService(logger *zap.Logger, tsdbClient tsdb.Client) TelemetryService {
	return &telemetryService{
		tsdbClient: tsdbClient,
		logger:     logger,
	}
}

// ProcessPropertyPost parses telemetry payload and writes metric records to TSDB.
func (s *telemetryService) ProcessPropertyPost(ctx context.Context, msg event.DeviceMessage) error {
	if len(msg.Payload) == 0 {
		return nil
	}

	payload, err := decodeAndValidatePropertyPost(msg)
	if err != nil {
		s.logger.Warn("failed to decode telemetry payload",
			zap.String("device_key", msg.DeviceKey),
			zap.Error(err),
		)
		return nil
	}

	records := make([]tsdb.Record, 0, len(payload.Params))
	for metric, property := range payload.Params {
		records = append(records, tsdb.Record{
			DeviceKey: msg.DeviceKey,
			Metric:    metric,
			Value:     property.Value,
			Timestamp: *property.Time,
		})
	}

	if len(records) > 0 {
		if err := s.tsdbClient.WriteBatch(ctx, records); err != nil {
			s.logger.Error("failed to write records to TSDB client", zap.String("device_key", msg.DeviceKey), zap.Error(err))
			return err
		}
	}

	s.logger.Debug("extracted & stored telemetry metrics via tsdb.Client", zap.String("device_key", msg.DeviceKey), zap.Int("count", len(records)))
	return nil
}

// Validate the entire report before writing any property to storage.
func decodeAndValidatePropertyPost(msg event.DeviceMessage) (*event.DevicePropertyPostPayload, error) {
	var payload event.DevicePropertyPostPayload
	if err := msg.DecodePayload(&payload); err != nil {
		return nil, err
	}
	if len(payload.Params) == 0 {
		return nil, fmt.Errorf("property report requires non-empty params")
	}
	for identifier, property := range payload.Params {
		if identifier == "" || property.Value == nil {
			return nil, fmt.Errorf("property %q requires an identifier and non-null value", identifier)
		}
		if property.Time == nil {
			property.Time = &msg.Timestamp
		}
		if *property.Time <= 0 {
			return nil, fmt.Errorf("property %q requires a positive millisecond time", identifier)
		}
		payload.Params[identifier] = property
	}
	return &payload, nil
}
