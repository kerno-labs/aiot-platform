package v1

import "time"

type ListDeviceServiceInvocationsRequest struct {
	PageRequest
	ServiceIdentifier string     `form:"serviceIdentifier"`
	StartAt           *time.Time `form:"startAt" time_format:"2006-01-02 15:04:05"`
	EndAt             *time.Time `form:"endAt" time_format:"2006-01-02 15:04:05"`
} //@name ListDeviceServiceInvocationsRequest

type InvokeDeviceServiceRequest struct {
	InputParams string `json:"inputParams"`
} //@name InvokeDeviceServiceRequest

type DeviceServiceInvocation struct {
	UUID              string  `json:"uuid"`
	InvokedAt         string  `json:"invokedAt"`
	ServiceIdentifier string  `json:"serviceIdentifier"`
	ServiceName       string  `json:"serviceName"`
	InputParams       string  `json:"inputParams"`
	OutputParams      *string `json:"outputParams"`
} //@name DeviceServiceInvocation

type InvokeDeviceServiceResponse struct {
	Invocation DeviceServiceInvocation `json:"invocation"`
} //@name DeviceInvokeServiceResponse

type ListDeviceServiceInvocationsResponse struct {
	Invocations []DeviceServiceInvocation `json:"invocations"`
	Total       int64                     `json:"total"`
	Page        int                       `json:"page"`
	PageSize    int                       `json:"pageSize"`
} //@name DeviceListServiceInvocationsResponse
