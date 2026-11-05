package repository

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"
)

// DeviceServiceInvocationRepository manages service invocation reply updates in device_service_invocations.
type DeviceServiceInvocationRepository interface {
	// UpdateOutput updates the output_params of a service invocation matching the device key and invocation UUID.
	UpdateOutput(ctx context.Context, deviceKey, invocationUUID, outputParams string) error
}

type deviceServiceInvocationRepository struct {
	*Repository
}

// NewDeviceServiceInvocationRepository initializes a new DeviceServiceInvocationRepository instance.
func NewDeviceServiceInvocationRepository(repo *Repository) DeviceServiceInvocationRepository {
	return &deviceServiceInvocationRepository{Repository: repo}
}

// UpdateOutput resolves the device ID by device_key and updates output_params on the matching invocation record.
func (r *deviceServiceInvocationRepository) UpdateOutput(ctx context.Context, deviceKey, invocationUUID, outputParams string) error {
	if r == nil || r.db == nil || deviceKey == "" || invocationUUID == "" {
		return nil
	}
	q := useQuery(r.db)
	device, err := q.Device.WithContext(ctx).Where(q.Device.DeviceKey.Eq(deviceKey)).First()
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}

	inv := q.DeviceServiceInvocation
	_, err = inv.WithContext(ctx).
		Where(inv.UUID.Eq(invocationUUID), inv.DeviceID.Eq(device.ID)).
		UpdateSimple(
			inv.OutputParams.Value(outputParams),
			inv.UpdatedAt.Value(time.Now()),
		)
	return err
}

