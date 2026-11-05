package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"aiot-backend/internal/dto"
	"aiot-backend/internal/event"
	"aiot-backend/internal/model"
	"aiot-backend/internal/repository"

	"github.com/google/uuid"
)

var (
	ErrInvalidThingModel   = errors.New("invalid product TSL")
	ErrServiceNotFound     = errors.New("thing-model service not found")
	ErrInvalidServiceInput = errors.New("service inputParams must be a JSON object")
	ErrDeviceOffline       = errors.New("device is offline")
	ErrDeviceNotFound      = errors.New("device not found")
)

type ThingModelDataServiceInterface interface {
	ListProperties(ctx context.Context, deviceKey string) ([]dto.ThingModelProperty, error)
	ListServiceInvocations(ctx context.Context, query dto.ListDeviceServiceInvocationsQuery) ([]model.DeviceServiceInvocation, int64, error)
	InvokeService(ctx context.Context, deviceKey, serviceIdentifier, inputParams string) (*model.DeviceServiceInvocation, error)
}

type ThingModelDataService struct {
	invocations   *repository.DeviceServiceInvocationRepository
	devices       *repository.DeviceRepository
	tsls          *repository.ProductTSLRepository
	telemetry     *repository.TelemetryRepository
	eventProducer event.Producer
}

func NewThingModelDataService(
	invocations *repository.DeviceServiceInvocationRepository,
	devices *repository.DeviceRepository,
	tsls *repository.ProductTSLRepository,
	telemetry *repository.TelemetryRepository,
	producer event.Producer,
) *ThingModelDataService {
	return &ThingModelDataService{
		invocations:   invocations,
		devices:       devices,
		tsls:          tsls,
		telemetry:     telemetry,
		eventProducer: producer,
	}
}

func (s *ThingModelDataService) InvokeService(ctx context.Context, deviceKey, serviceIdentifier, inputParams string) (*model.DeviceServiceInvocation, error) {
	serviceIdentifier = strings.TrimSpace(serviceIdentifier)
	if serviceIdentifier == "" {
		return nil, ErrServiceNotFound
	}
	normalizedInput, err := normalizeServiceInputParams(inputParams)
	if err != nil {
		return nil, err
	}

	device, err := s.devices.FindByKey(ctx, deviceKey)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrDeviceNotFound
		}
		return nil, err
	}
	// Reject RPC service invocation when the target device is not online (state != 1).
	if device.State.State != model.DeviceStateOnline {
		return nil, ErrDeviceOffline
	}

	// Validate that the product TSL defines the requested service identifier.
	tsl, err := s.tsls.FindByProductID(ctx, device.ProductID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrServiceNotFound
	}
	if err != nil {
		return nil, err
	}
	var document dto.ProductTSLDocument
	if err := json.Unmarshal([]byte(tsl.TSL), &document); err != nil {
		return nil, ErrInvalidThingModel
	}
	serviceName := serviceIdentifier
	matched := false
	for _, svc := range document.Services {
		if svc.Identifier == serviceIdentifier {
			matched = true
			if svc.Name != "" {
				serviceName = svc.Name
			}
			break
		}
	}
	if !matched {
		return nil, ErrServiceNotFound
	}

	invocation := &model.DeviceServiceInvocation{
		UUID:              uuid.NewString(),
		DeviceID:          device.ID,
		ServiceIdentifier: serviceIdentifier,
		ServiceName:       serviceName,
		InputParams:       normalizedInput,
		InvokedAt:         time.Now(),
	}

	if s.eventProducer != nil {
		cmd := &event.DeviceServiceInvokeCommand{
			ID:                invocation.UUID,
			Version:           "1.0",
			Method:            "thing.service." + serviceIdentifier,
			Params:            json.RawMessage(normalizedInput),
			ProductKey:        device.Product.ProductKey,
			DeviceKey:         device.DeviceKey,
			ServiceIdentifier: serviceIdentifier,
		}
		// Dispatch the RPC command to Kafka before persisting the invocation record so a failed publish never leaves a dangling pending row.
		if err := s.eventProducer.Publish(ctx, event.TopicDeviceServiceInvoke, cmd); err != nil {
			return nil, err
		}
	}

	if err := s.invocations.Create(ctx, invocation); err != nil {
		return nil, err
	}

	return invocation, nil
}

func normalizeServiceInputParams(raw string) (string, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "{}", nil
	}
	var obj map[string]any
	if err := json.Unmarshal([]byte(trimmed), &obj); err != nil || obj == nil {
		return "", ErrInvalidServiceInput
	}
	var compact bytes.Buffer
	if err := json.Compact(&compact, []byte(trimmed)); err != nil {
		return "", ErrInvalidServiceInput
	}
	return compact.String(), nil
}

func (s *ThingModelDataService) ListServiceInvocations(ctx context.Context, query dto.ListDeviceServiceInvocationsQuery) ([]model.DeviceServiceInvocation, int64, error) {
	device, err := s.devices.FindByKey(ctx, query.DeviceKey)
	if err != nil {
		return nil, 0, err
	}
	query.DeviceID = device.ID
	return s.invocations.List(ctx, query)
}

func (s *ThingModelDataService) ListProperties(ctx context.Context, deviceKey string) ([]dto.ThingModelProperty, error) {
	device, err := s.devices.FindByKey(ctx, deviceKey)
	if err != nil {
		return nil, err
	}
	tsl, err := s.tsls.FindByProductID(ctx, device.ProductID)
	if errors.Is(err, repository.ErrNotFound) {
		return []dto.ThingModelProperty{}, nil
	}
	if err != nil {
		return nil, err
	}

	var document dto.ProductTSLDocument
	if err := json.Unmarshal([]byte(tsl.TSL), &document); err != nil || document.Items == nil {
		return nil, ErrInvalidThingModel
	}
	identifiers := make([]string, 0, len(document.Items))
	for _, property := range document.Items {
		if property.Identifier == "" || property.Name == "" || property.DataType.Type == "" {
			return nil, ErrInvalidThingModel
		}
		identifiers = append(identifiers, property.Identifier)
	}
	var latest map[string]dto.TelemetryPoint
	if s.telemetry != nil {
		latest, err = s.telemetry.QueryLatest(ctx, deviceKey, identifiers)
		if err != nil {
			return nil, err
		}
	}

	properties := make([]dto.ThingModelProperty, 0, len(document.Items))
	for _, property := range document.Items {
		item := dto.ThingModelProperty{Identifier: property.Identifier, Name: property.Name, DataType: property.DataType.Type, Unit: property.DataType.Specs.Unit, AccessMode: property.AccessMode}
		if point, found := latest[property.Identifier]; found {
			reportedAt := time.UnixMilli(point.Timestamp)
			item.Value = point.Value
			item.ReportedAt = &reportedAt
		}
		properties = append(properties, item)
	}
	return properties, nil
}
