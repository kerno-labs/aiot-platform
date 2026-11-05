package repository

import (
	"context"
	"testing"

	"data-engine/internal/model"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

func newTestDeviceStateRepository(t *testing.T) (DeviceStateRepository, *gorm.DB) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	err = db.AutoMigrate(&model.DeviceState{})
	require.NoError(t, err)

	repo := NewRepository(zap.NewNop(), db)
	return NewDeviceStateRepository(repo), db
}

func TestDeviceStateRepository_OnlineOfflineAndOutOfOrderProtection(t *testing.T) {
	ctx := context.Background()
	repo, db := newTestDeviceStateRepository(t)

	// 1. Seed a newly created device in inactive (2) state
	require.NoError(t, db.Create(&model.DeviceState{
		ID:        1,
		DeviceKey: "sensor_01",
		State:     model.DeviceStateInactive,
	}).Error)

	// 2. First connection at t=1000 -> state becomes online (1), last_online_time=1000
	require.NoError(t, repo.MarkOnline(ctx, "sensor_01", 1000))
	var state model.DeviceState
	require.NoError(t, db.First(&state, "device_key = ?", "sensor_01").Error)
	assert.Equal(t, model.DeviceStateOnline, state.State)
	require.NotNil(t, state.LastOnlineTime)
	assert.Equal(t, int64(1000), *state.LastOnlineTime)
	assert.Nil(t, state.LastOfflineTime)

	// 3. Out-of-order older online event at t=900 -> last_online_time stays 1000
	require.NoError(t, repo.MarkOnline(ctx, "sensor_01", 900))
	require.NoError(t, db.First(&state, "device_key = ?", "sensor_01").Error)
	assert.Equal(t, model.DeviceStateOnline, state.State)
	require.NotNil(t, state.LastOnlineTime)
	assert.Equal(t, int64(1000), *state.LastOnlineTime)

	// 4. Normal disconnect at t=2000 (>= 1000) -> state becomes offline (0), last_offline_time=2000
	require.NoError(t, repo.MarkOffline(ctx, "sensor_01", 2000))
	require.NoError(t, db.First(&state, "device_key = ?", "sensor_01").Error)
	assert.Equal(t, model.DeviceStateOffline, state.State)
	require.NotNil(t, state.LastOnlineTime)
	assert.Equal(t, int64(1000), *state.LastOnlineTime)
	require.NotNil(t, state.LastOfflineTime)
	assert.Equal(t, int64(2000), *state.LastOfflineTime)

	// 4b. Delayed connect from an older session at t=1500 (< last_offline_time=2000) -> ignored! State stays offline (0) and last_online_time stays 1000
	require.NoError(t, repo.MarkOnline(ctx, "sensor_01", 1500))
	require.NoError(t, db.First(&state, "device_key = ?", "sensor_01").Error)
	assert.Equal(t, model.DeviceStateOffline, state.State)
	require.NotNil(t, state.LastOnlineTime)
	assert.Equal(t, int64(1000), *state.LastOnlineTime)

	// 4c. Out-of-order older disconnect at t=1800 (>= last_online_time=1000 but < last_offline_time=2000) -> last_offline_time stays 2000
	require.NoError(t, repo.MarkOffline(ctx, "sensor_01", 1800))
	require.NoError(t, db.First(&state, "device_key = ?", "sensor_01").Error)
	assert.Equal(t, model.DeviceStateOffline, state.State)
	require.NotNil(t, state.LastOfflineTime)
	assert.Equal(t, int64(2000), *state.LastOfflineTime)

	// 5. Reconnect at t=3000 -> state becomes online (1), last_online_time=3000, last_offline_time preserved as 2000
	require.NoError(t, repo.MarkOnline(ctx, "sensor_01", 3000))
	require.NoError(t, db.First(&state, "device_key = ?", "sensor_01").Error)
	assert.Equal(t, model.DeviceStateOnline, state.State)
	require.NotNil(t, state.LastOnlineTime)
	assert.Equal(t, int64(3000), *state.LastOnlineTime)
	require.NotNil(t, state.LastOfflineTime)
	assert.Equal(t, int64(2000), *state.LastOfflineTime)

	// 6. Delayed disconnect from previous session at t=2500 (< 3000) -> ignored! Remains online (1)
	require.NoError(t, repo.MarkOffline(ctx, "sensor_01", 2500))
	require.NoError(t, db.First(&state, "device_key = ?", "sensor_01").Error)
	assert.Equal(t, model.DeviceStateOnline, state.State)
	require.NotNil(t, state.LastOnlineTime)
	assert.Equal(t, int64(3000), *state.LastOnlineTime)
	require.NotNil(t, state.LastOfflineTime)
	assert.Equal(t, int64(2000), *state.LastOfflineTime)

	// 7. Unknown device key (e.g. internal MQTT client) -> safely no-op without error
	require.NoError(t, repo.MarkOnline(ctx, "0things-transport-mqtt", 4000))
	require.NoError(t, repo.MarkOffline(ctx, "0things-transport-mqtt", 5000))
	var count int64
	require.NoError(t, db.Model(&model.DeviceState{}).Count(&count).Error)
	assert.Equal(t, int64(1), count)
}
