package handler

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	v1 "aiot-backend/api/v1"
	"aiot-backend/internal/dto"
	"aiot-backend/internal/model"

	"github.com/duke-git/lancet/v2/convertor"
	"gorm.io/gorm"
)

const (
	defaultDeviceLimit    = 20
	defaultTelemetryLimit = 100
	maxToolLimit          = 100
)

type MCPHandler struct {
	devices    MCPDeviceService
	thingModel MCPThingModelService
	telemetry  MCPTelemetryService
}

type MCPDeviceService interface {
	DeviceByKey(context.Context, string) (*model.Device, error)
	ListDevices(context.Context, dto.ListDevicesQuery) ([]model.Device, int64, error)
	Tags(context.Context, string) ([]model.DeviceTag, error)
	Shadow(context.Context, string) (*model.DeviceShadow, error)
}

type MCPThingModelService interface {
	ListProperties(context.Context, string) ([]dto.ThingModelProperty, error)
}

type MCPTelemetryService interface {
	QueryHistory(context.Context, dto.TelemetryQueryReq) ([]dto.TelemetryPoint, error)
}

func NewMCPHandler(
	devices MCPDeviceService,
	thingModel MCPThingModelService,
	telemetry MCPTelemetryService,
) *MCPHandler {
	return &MCPHandler{devices: devices, thingModel: thingModel, telemetry: telemetry}
}

type MCPDevice struct {
	DeviceKey   string `json:"deviceKey"`
	Name        string `json:"name"`
	ProductID   int64  `json:"productId"`
	ProductKey  string `json:"productKey"`
	ProductName string `json:"productName"`
	State       int    `json:"state"`
	Enabled     bool   `json:"enabled"`
}

type MCPDeviceDetail struct {
	Device     MCPDevice                `json:"device"`
	Tags       []model.DeviceTag        `json:"tags"`
	Shadow     *model.DeviceShadow      `json:"shadow,omitempty"`
	Properties []dto.ThingModelProperty `json:"properties"`
}

type MCPTelemetryStats struct {
	Min    *float64 `json:"min,omitempty"`
	Max    *float64 `json:"max,omitempty"`
	Avg    *float64 `json:"avg,omitempty"`
	Latest any      `json:"latest,omitempty"`
}

type MCPTelemetryHistory struct {
	Points []dto.TelemetryPoint `json:"points"`
	Stats  MCPTelemetryStats    `json:"stats"`
}

func (h *MCPHandler) QueryDevices(ctx context.Context, req v1.QueryDevicesRequest) ([]MCPDevice, error) {
	limit, err := toolLimit(req.Limit, defaultDeviceLimit)
	if err != nil {
		return nil, err
	}

	query := dto.ListDevicesQuery{Page: 1, PageSize: limit, Search: req.Keyword}
	if req.ProductID != nil {
		query.ProductID = *req.ProductID
	}
	if state, ok := parseMCPDeviceState(req.Status); ok {
		query.States = []int{state}
	}

	devices, _, err := h.devices.ListDevices(ctx, query)
	if err != nil {
		return nil, err
	}
	result := make([]MCPDevice, len(devices))
	for i, device := range devices {
		result[i] = mcpDevice(device)
	}
	return result, nil
}

func (h *MCPHandler) GetDeviceDetail(ctx context.Context, req v1.GetDeviceDetailRequest) (*MCPDeviceDetail, error) {
	if req.DeviceKey == "" {
		return nil, errors.New("deviceKey is required")
	}

	device, err := h.devices.DeviceByKey(ctx, req.DeviceKey)
	if err != nil {
		return nil, err
	}
	tags, err := h.devices.Tags(ctx, req.DeviceKey)
	if err != nil {
		return nil, err
	}
	properties, err := h.thingModel.ListProperties(ctx, req.DeviceKey)
	if err != nil {
		return nil, err
	}
	shadow, err := h.devices.Shadow(ctx, req.DeviceKey)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	return &MCPDeviceDetail{
		Device:     mcpDevice(*device),
		Tags:       tags,
		Shadow:     shadow,
		Properties: properties,
	}, nil
}

func (h *MCPHandler) QueryTelemetryHistory(ctx context.Context, req v1.QueryTelemetryHistoryRequest) (*MCPTelemetryHistory, error) {
	if req.DeviceKey == "" || req.Property == "" {
		return nil, errors.New("deviceKey and property are required")
	}
	limit, err := toolLimit(req.Limit, defaultTelemetryLimit)
	if err != nil {
		return nil, err
	}
	endTime := req.EndTime
	if endTime == 0 {
		endTime = time.Now().UnixMilli()
	}
	startTime := req.StartTime
	if startTime == 0 {
		startTime = time.UnixMilli(endTime).Add(-time.Hour).UnixMilli()
	}
	if startTime > endTime {
		return nil, errors.New("startTime must be before endTime")
	}

	if _, err := h.devices.DeviceByKey(ctx, req.DeviceKey); err != nil {
		return nil, err
	}

	points, err := h.telemetry.QueryHistory(ctx, dto.TelemetryQueryReq{
		DeviceKey: req.DeviceKey,
		Property:  req.Property,
		StartTime: startTime,
		EndTime:   endTime,
		Limit:     limit,
	})
	if err != nil {
		return nil, err
	}
	return &MCPTelemetryHistory{Points: points, Stats: telemetryStats(points)}, nil
}

func toolLimit(limit, fallback int) (int, error) {
	if limit == 0 {
		return fallback, nil
	}
	if limit < 1 || limit > maxToolLimit {
		return 0, fmt.Errorf("limit must be between 1 and %d", maxToolLimit)
	}
	return limit, nil
}

func parseMCPDeviceState(status string) (int, bool) {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "0", "offline":
		return model.DeviceStateOffline, true
	case "1", "online":
		return model.DeviceStateOnline, true
	case "2", "inactive":
		return model.DeviceStateInactive, true
	default:
		return 0, false
	}
}

func mcpDevice(device model.Device) MCPDevice {
	return MCPDevice{
		DeviceKey:   device.DeviceKey,
		Name:        device.Name,
		ProductID:   device.ProductID,
		ProductKey:  device.Product.ProductKey,
		ProductName: device.Product.Name,
		State:       device.State.State,
		Enabled:     device.Enabled,
	}
}

func telemetryStats(points []dto.TelemetryPoint) MCPTelemetryStats {
	stats := MCPTelemetryStats{}
	if len(points) == 0 {
		return stats
	}
	stats.Latest = points[len(points)-1].Value

	min, max, sum := math.MaxFloat64, -math.MaxFloat64, 0.0
	count := 0
	for _, point := range points {
		value, ok := telemetryNumber(point.Value)
		if !ok {
			continue
		}
		min = math.Min(min, value)
		max = math.Max(max, value)
		sum += value
		count++
	}
	if count == 0 {
		return stats
	}
	avg := sum / float64(count)
	stats.Min, stats.Max, stats.Avg = &min, &max, &avg
	return stats
}

func telemetryNumber(value any) (float64, bool) {
	if val, err := convertor.ToFloat(value); err == nil {
		return val, true
	}
	return 0, false
}
