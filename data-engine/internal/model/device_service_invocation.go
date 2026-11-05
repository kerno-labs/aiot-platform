package model

import "time"

// DeviceServiceInvocation records a thing-model service call for one device.
type DeviceServiceInvocation struct {
	ID                int64     `gorm:"primaryKey"`
	UUID              string    `gorm:"column:uuid;type:varchar(36);not null;uniqueIndex:uk_device_service_invocations_uuid"`
	DeviceID          int64     `gorm:"column:device_id;not null;index:idx_device_service_invocations_device_time,priority:1;index:idx_device_service_invocations_device_identifier_time,priority:1"`
	ServiceIdentifier string    `gorm:"column:service_identifier;type:varchar(128);not null;index:idx_device_service_invocations_device_identifier_time,priority:2"`
	ServiceName       string    `gorm:"column:service_name;type:varchar(255);not null"`
	InputParams       string    `gorm:"column:input_params;type:text;not null"`
	OutputParams      *string   `gorm:"column:output_params;type:text"`
	InvokedAt         time.Time `gorm:"column:invoked_at;not null;index:idx_device_service_invocations_device_time,priority:2;index:idx_device_service_invocations_device_identifier_time,priority:3"`
	CreatedAt         time.Time `gorm:"column:created_at"`
	UpdatedAt         time.Time `gorm:"column:updated_at"`
}

func (DeviceServiceInvocation) TableName() string { return "device_service_invocations" }

