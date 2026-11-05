package model

import "time"

const (
	DeviceStateOffline  = 0
	DeviceStateOnline   = 1
	DeviceStateInactive = 2
)

// DeviceState represents the device_states table entity.
// State values: 0 = offline, 1 = online, 2 = inactive.
type DeviceState struct {
	ID              int64     `gorm:"column:id;primaryKey"`
	DeviceKey       string    `gorm:"column:device_key"`
	State           int       `gorm:"column:state"`
	LastOnlineTime  *int64    `gorm:"column:last_online_time"`
	LastOfflineTime *int64    `gorm:"column:last_offline_time"`
	CreatedAt       time.Time `gorm:"column:created_at"`
	UpdatedAt       time.Time `gorm:"column:updated_at"`
}

func (DeviceState) TableName() string { return "device_states" }
