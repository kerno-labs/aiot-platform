package repository

import (
	"context"
	"time"

	"data-engine/internal/model"

	"gorm.io/gen/field"
)

// DeviceStateRepository manages device online/offline state persistence in device_states.
type DeviceStateRepository interface {
	// MarkOnline marks a registered device as online and monotonically advances last_online_time.
	MarkOnline(ctx context.Context, deviceKey string, timestamp int64) error
	// MarkOffline marks a registered device as offline if no newer connection has occurred since timestamp.
	MarkOffline(ctx context.Context, deviceKey string, timestamp int64) error
}

type deviceStateRepository struct {
	*Repository
}

// NewDeviceStateRepository initializes a new DeviceStateRepository instance.
func NewDeviceStateRepository(repo *Repository) DeviceStateRepository {
	return &deviceStateRepository{Repository: repo}
}

// MarkOnline updates the device state to online (1) when no newer online/offline event has been recorded.
func (r *deviceStateRepository) MarkOnline(ctx context.Context, deviceKey string, timestamp int64) error {
	if r == nil || r.db == nil || deviceKey == "" {
		return nil
	}
	ds := useQuery(r.db).DeviceState
	return r.updateStateTransition(ctx, deviceKey, model.DeviceStateOnline, ds.LastOnlineTime, timestamp)
}

// MarkOffline updates the device state to offline (0) when no newer online/offline event has been recorded.
func (r *deviceStateRepository) MarkOffline(ctx context.Context, deviceKey string, timestamp int64) error {
	if r == nil || r.db == nil || deviceKey == "" {
		return nil
	}
	ds := useQuery(r.db).DeviceState
	return r.updateStateTransition(ctx, deviceKey, model.DeviceStateOffline, ds.LastOfflineTime, timestamp)
}

func (r *deviceStateRepository) updateStateTransition(
	ctx context.Context,
	deviceKey string,
	targetState int,
	targetTimeField field.Int64,
	timestamp int64,
) error {
	ds := useQuery(r.db).DeviceState
	_, err := ds.WithContext(ctx).
		Where(
			ds.DeviceKey.Eq(deviceKey),
			ds.WithContext(ctx).Where(ds.LastOnlineTime.IsNull()).Or(ds.LastOnlineTime.Lte(timestamp)),
			ds.WithContext(ctx).Where(ds.LastOfflineTime.IsNull()).Or(ds.LastOfflineTime.Lte(timestamp)),
		).
		UpdateSimple(
			ds.State.Value(targetState),
			targetTimeField.Value(timestamp),
			ds.UpdatedAt.Value(time.Now()),
		)
	return err
}
