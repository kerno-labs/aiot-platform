package handler

import (
	"errors"
	"net/http"

	v1 "aiot-backend/api/v1"
	"aiot-backend/internal/dto"
	"aiot-backend/internal/model"
	"aiot-backend/internal/service"

	"github.com/dromara/carbon/v2"
	"github.com/gin-gonic/gin"
)

type ThingModelDataHandler struct {
	*Handler
	svc service.ThingModelDataServiceInterface
}

func NewThingModelDataHandler(h *Handler, svc service.ThingModelDataServiceInterface) *ThingModelDataHandler {
	return &ThingModelDataHandler{Handler: h, svc: svc}
}

func deviceServiceInvocationJSON(item model.DeviceServiceInvocation) v1.DeviceServiceInvocation {
	return v1.DeviceServiceInvocation{
		UUID:              item.UUID,
		InvokedAt:         carbon.CreateFromStdTime(item.InvokedAt.Local()).ToDateTimeString(),
		ServiceIdentifier: item.ServiceIdentifier,
		ServiceName:       item.ServiceName,
		InputParams:       item.InputParams,
		OutputParams:      item.OutputParams,
	}
}

// InvokeService godoc
// @Summary Invoke thing-model service on a device
// @Description Persists a service invocation record and dispatches the RPC command to the device over MQTT.
// @Tags Devices
// @Accept json
// @Produce json
// @Security Bearer
// @Param deviceKey path string true "Device key"
// @Param serviceIdentifier path string true "Thing-model service identifier"
// @Param request body v1.InvokeDeviceServiceRequest true "Service input parameters"
// @Success 200 {object} v1.ApiResponse[v1.InvokeDeviceServiceResponse] "Successful response"
// @Router /devices/{deviceKey}/thing-model/services/{serviceIdentifier}/invoke [post]
func (h *ThingModelDataHandler) InvokeService(c *gin.Context) {
	var req v1.InvokeDeviceServiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		v1.HandleError(c, http.StatusBadRequest, err, nil)
		return
	}
	invocation, err := h.svc.InvokeService(c, c.Param("deviceKey"), c.Param("serviceIdentifier"), req.InputParams)
	if err != nil {
		if errors.Is(err, service.ErrServiceNotFound) || errors.Is(err, service.ErrInvalidServiceInput) || errors.Is(err, service.ErrInvalidThingModel) || errors.Is(err, service.ErrDeviceOffline) {
			v1.HandleError(c, http.StatusBadRequest, err, nil)
			return
		}
		if errors.Is(err, service.ErrDeviceNotFound) {
			v1.HandleError(c, http.StatusNotFound, err, nil)
			return
		}
		v1.HandleError(c, http.StatusInternalServerError, err, nil)
		return
	}
	v1.HandleSuccess(c, v1.InvokeDeviceServiceResponse{
		Invocation: deviceServiceInvocationJSON(*invocation),
	})
}

// List godoc
// @Summary List thing-model service invocation records
// @Description Lists paginated thing-model service invocation records for one device.
// @Tags Devices
// @Produce json
// @Security Bearer
// @Param deviceKey path string true "Device key"
// @Param request query v1.ListDeviceServiceInvocationsRequest false "Query parameters"
// @Success 200 {object} v1.ApiResponse[v1.ListDeviceServiceInvocationsResponse] "Successful response"
// @Router /devices/{deviceKey}/thing-model/service-invocations [get]
func (h *ThingModelDataHandler) ListServiceInvocations(c *gin.Context) {
	var req v1.ListDeviceServiceInvocationsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		v1.HandleError(c, http.StatusBadRequest, err, nil)
		return
	}
	query := dto.ListDeviceServiceInvocationsQuery{
		DeviceKey:         c.Param("deviceKey"),
		ServiceIdentifier: req.ServiceIdentifier,
		StartAt:           req.StartAt,
		EndAt:             req.EndAt,
		Page:              req.Page,
		PageSize:          req.PageSize,
	}
	items, total, err := h.svc.ListServiceInvocations(c, query)
	if err != nil {
		v1.HandleError(c, http.StatusInternalServerError, err, nil)
		return
	}
	out := make([]v1.DeviceServiceInvocation, len(items))
	for i, item := range items {
		out[i] = deviceServiceInvocationJSON(item)
	}
	v1.HandleSuccess(c, v1.ListDeviceServiceInvocationsResponse{
		Invocations: out,
		Total:       total,
		Page:        req.Page,
		PageSize:    req.PageSize,
	})
}

func thingModelPropertyJSON(item dto.ThingModelProperty) v1.ThingModelProperty {
	return v1.ThingModelProperty{Identifier: item.Identifier, Name: item.Name, DataType: item.DataType, Unit: item.Unit, AccessMode: item.AccessMode, Value: item.Value, ReportedAt: formatStdTimePtr(item.ReportedAt)}
}

// ListProperties godoc
// @Summary Get device thing-model property latest values
// @Description Returns all product TSL properties in definition order with their latest telemetry values.
// @Tags Devices
// @Produce json
// @Security Bearer
// @Param deviceKey path string true "Device key"
// @Success 200 {object} v1.ApiResponse[v1.GetDeviceThingModelPropertiesResponse] "Successful response"
// @Router /devices/{deviceKey}/thing-model/properties [get]
func (h *ThingModelDataHandler) ListProperties(c *gin.Context) {
	properties, err := h.svc.ListProperties(c, c.Param("deviceKey"))
	if err != nil {
		v1.HandleError(c, http.StatusInternalServerError, err, nil)
		return
	}
	items := make([]v1.ThingModelProperty, len(properties))
	for i, property := range properties {
		items[i] = thingModelPropertyJSON(property)
	}
	v1.HandleSuccess(c, v1.GetDeviceThingModelPropertiesResponse{Items: items})
}
