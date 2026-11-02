package service

import (
	"context"

	"data-engine/internal/event"
	"data-engine/internal/repository"

	"github.com/go-playground/validator/v10"
	"go.uber.org/zap"
)

// OTAService coordinates device OTA upgrade progress updates and inform reports.
type OTAService interface {
	HandleProgressReport(ctx context.Context, msg event.DeviceMessage) error
	HandleDeviceInfo(ctx context.Context, msg event.DeviceMessage) error
}

type otaService struct {
	deviceUpgradeStatusRepo repository.DeviceUpgradeStatusRepository
	validate                *validator.Validate
	logger                  *zap.Logger
}

// NewOTAService creates an instance of OTAService with required dependencies.
func NewOTAService(deviceUpgradeStatusRepo repository.DeviceUpgradeStatusRepository, logger *zap.Logger) OTAService {
	return &otaService{
		deviceUpgradeStatusRepo: deviceUpgradeStatusRepo,
		validate:                validator.New(),
		logger:                  logger,
	}
}

// HandleProgressReport resolves progress report status and updates device upgrade progress.
func (s *otaService) HandleProgressReport(ctx context.Context, msg event.DeviceMessage) error {
	if err := s.validate.Struct(&msg); err != nil {
		s.logger.Warn("invalid OTA progress device message envelope",
			zap.String("device_key", msg.DeviceKey),
			zap.Error(err),
		)
		return nil
	}

	var payload event.OTAProgressPayload
	if err := msg.DecodePayload(&payload); err != nil {
		s.logger.Warn("failed to unmarshal OTA progress payload",
			zap.String("device_key", msg.DeviceKey),
			zap.Error(err),
		)
		return nil
	}

	if err := s.validate.Struct(&payload); err != nil {
		s.logger.Warn("invalid OTA progress report payload",
			zap.String("device_key", msg.DeviceKey),
			zap.String("batch_id", payload.BatchID),
			zap.Error(err),
		)
		return nil
	}

	if err := s.deviceUpgradeStatusRepo.UpdateProgress(ctx, payload.BatchID, msg.DeviceKey, payload.ErrorMessage, payload.Progress); err != nil {
		s.logger.Error("failed to update device upgrade progress",
			zap.String("device_key", msg.DeviceKey),
			zap.String("batch_id", payload.BatchID),
			zap.Error(err),
		)
		return err
	}

	return nil
}

// HandleDeviceInfo processes device inform firmware version report and determines upgrade success.
func (s *otaService) HandleDeviceInfo(ctx context.Context, msg event.DeviceMessage) error {
	if err := s.validate.Struct(&msg); err != nil {
		s.logger.Warn("invalid OTA device info message envelope",
			zap.String("device_key", msg.DeviceKey),
			zap.Error(err),
		)
		return nil
	}

	var payload event.OTAInformPayload
	if err := msg.DecodePayload(&payload); err != nil {
		s.logger.Warn("failed to unmarshal OTA device info payload",
			zap.String("device_key", msg.DeviceKey),
			zap.Error(err),
		)
		return nil
	}

	if err := s.validate.Struct(&payload); err != nil {
		s.logger.Warn("invalid OTA device info payload",
			zap.String("device_key", msg.DeviceKey),
			zap.Error(err),
		)
		return nil
	}

	if err := s.deviceUpgradeStatusRepo.UpdateDeviceInfo(ctx, msg.DeviceKey, payload.Version); err != nil {
		s.logger.Error("failed to update device info version",
			zap.String("device_key", msg.DeviceKey),
			zap.String("version", payload.Version),
			zap.Error(err),
		)
		return err
	}

	return nil
}
