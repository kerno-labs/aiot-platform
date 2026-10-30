// Package v1 owns the version 1 HTTP contracts and mirrors device-service.
package v1

import "time"

type CreateDeviceRequest struct {
	Name      string `json:"name" binding:"required"`
	ProductID int64  `json:"productId" binding:"required"`
	Enabled   bool   `json:"enabled"`
} //@name DeviceCreateDeviceRequest

type UpdateDeviceRequest struct {
	Name  string `json:"name"`
	State string `json:"state"`
} //@name DeviceUpdateDeviceRequest

type SetDeviceEnabledRequest struct {
	Enabled bool `json:"enabled"`
} //@name DeviceSetDeviceEnabledRequest

type SetDeviceTagsRequest struct {
	Tags map[string]string `json:"tags" binding:"required"`
} //@name DeviceSetDeviceTagsRequest

type DeleteDeviceTagsRequest struct {
	Keys []string `json:"keys" binding:"required"`
} //@name DeviceDeleteDeviceTagsRequest

type UpdateDesiredShadowRequest struct {
	Desired map[string]any `json:"desired" binding:"required"`
	Version int64          `json:"version"`
} //@name DeviceUpdateDesiredShadowRequest

type ClearDesiredShadowRequest struct {
	Version int64 `json:"version"`
} //@name DeviceClearDesiredShadowRequest

type SimulatePushRequest struct {
	Payload string `json:"payload"`
} //@name DeviceSimulatePushRequest

type ListDevicesRequest struct {
	PageRequest
	ProductID  int64    `form:"productId"`
	States     []string `form:"states"`
	Enabled    *bool    `form:"enabled"`
	SearchText string   `form:"searchText"`
} //@name DeviceListDevicesRequest

type ListPushRecordsRequest struct {
	PageRequest
	OperationType string `form:"operationType"`
	Status        string `form:"status"`
} //@name DeviceListPushRecordsRequest

type Device struct {
	ID              int64      `json:"id"`
	DeviceKey       string     `json:"deviceKey"`
	Name            string     `json:"name"`
	ProductID       int64      `json:"productId"`
	ProductKey      string     `json:"productKey"`
	ProductName     string     `json:"productName"`
	State           string     `json:"state"`
	Enabled         bool       `json:"enabled"`
	LastOnlineTime  *int64     `json:"lastOnlineTime"`
	LastOfflineTime *int64     `json:"lastOfflineTime"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
	DeletedAt       *time.Time `json:"deletedAt,omitempty"`
} //@name Device

type CreateDeviceResponse struct {
	Device Device `json:"device"`
} //@name DeviceCreateDeviceResponse

type GetDeviceResponse struct {
	Device Device `json:"device"`
} //@name DeviceGetDeviceResponse

type UpdateDeviceResponse struct {
	Device Device `json:"device"`
} //@name DeviceUpdateDeviceResponse

type ActivateDeviceResponse struct {
	Device Device `json:"device"`
} //@name DeviceActivateDeviceResponse

type SetDeviceEnabledResponse struct {
	Device Device `json:"device"`
} //@name DeviceSetDeviceEnabledResponse

type ListDevicesResponse struct {
	Devices  []Device `json:"devices"`
	Total    int64    `json:"total"`
	Page     int      `json:"page"`
	PageSize int      `json:"pageSize"`
} //@name DeviceListDevicesResponse

type DeviceSuccessResponse struct {
	Success bool `json:"success"`
} //@name DeviceSuccessResponse

type TelemetryResponse struct {
	Telemetry string `json:"telemetry"`
} //@name DeviceTelemetryResponse

type DeviceStatisticsResponse struct {
	TotalDevices     int64 `json:"totalDevices"`
	ActivatedDevices int64 `json:"activatedDevices"`
	OnlineDevices    int64 `json:"onlineDevices"`
	OfflineDevices   int64 `json:"offlineDevices"`
	InactiveDevices  int64 `json:"inactiveDevices"`
} //@name DeviceStatisticsResponse

type ShadowState struct {
	Desired  any            `json:"desired"`
	Reported any            `json:"reported"`
	Delta    map[string]any `json:"delta"`
} //@name DeviceShadowState

type Shadow struct {
	State     ShadowState    `json:"state"`
	Desired   any            `json:"desired,omitempty"`
	Reported  any            `json:"reported,omitempty"`
	Delta     map[string]any `json:"delta,omitempty"`
	Metadata  any            `json:"metadata"`
	Version   int64          `json:"version"`
	Timestamp int64          `json:"timestamp"`
	UpdatedAt time.Time      `json:"updatedAt"`
} //@name DeviceShadow

type DeviceTag struct {
	ID        int64      `json:"id"`
	DeviceID  int64      `json:"deviceId"`
	Key       string     `json:"key"`
	Value     string     `json:"value"`
	Source    string     `json:"source"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
	DeletedAt *time.Time `json:"deletedAt,omitempty"`
} //@name DeviceTag

type ListDeviceTagsResponse struct {
	Tags []DeviceTag `json:"tags"`
} //@name DeviceListDeviceTagsResponse

type DeviceShadowHistory struct {
	ID        int64     `json:"id"`
	DeviceID  int64     `json:"deviceId"`
	Version   int64     `json:"version"`
	Source    string    `json:"source"`
	Desired   any       `json:"desired"`
	Reported  any       `json:"reported"`
	CreatedAt time.Time `json:"createdAt"`
} //@name DeviceShadowHistory

type ListDeviceShadowHistoryResponse struct {
	History []DeviceShadowHistory `json:"history"`
} //@name DeviceListDeviceShadowHistoryResponse

type PushRecord struct {
	ID            int64     `json:"id"`
	DeviceID      int64     `json:"deviceId"`
	OperationType string    `json:"operationType"`
	OperationName string    `json:"operationName"`
	Payload       string    `json:"payload"`
	Status        string    `json:"status"`
	ErrorMessage  string    `json:"errorMessage"`
	CreatedBy     string    `json:"createdBy"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
} //@name DevicePushRecord

type SimulatePushResponse struct {
	PushRecordID string `json:"pushRecordId"`
	Timestamp    int64  `json:"timestamp"`
	Status       string `json:"status"`
	Message      string `json:"message"`
} //@name DeviceSimulatePushResponse

type ListPushRecordsResponse struct {
	Records  []PushRecord `json:"records"`
	Total    int64        `json:"total"`
	Page     int          `json:"page"`
	PageSize int          `json:"pageSize"`
} //@name DeviceListPushRecordsResponse

type GetPushRecordResponse struct {
	Record PushRecord `json:"record"`
} //@name DeviceGetPushRecordResponse

type ClearPushRecordsRequest struct {
	BeforeTimestamp *int64 `form:"beforeTimestamp" binding:"omitempty,gt=0"`
}

type ClearPushRecordsResponse struct {
	DeletedCount int64 `json:"deletedCount"`
	Success      bool  `json:"success"`
} //@name DeviceClearPushRecordsResponse

type BatchUploadError struct {
	Row        int    `json:"row"`
	ProductKey string `json:"productKey"`
	DeviceName string `json:"deviceName"`
	Error      string `json:"error"`
} //@name DeviceBatchUploadError

type BatchUploadDevicesResponse struct {
	SuccessCount int                `json:"successCount"`
	FailureCount int                `json:"failureCount"`
	Errors       []BatchUploadError `json:"errors"`
} //@name DeviceBatchUploadDevicesResponse
