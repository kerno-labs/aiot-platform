package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	v1 "aiot-backend/api/v1"
	"aiot-backend/internal/dto"
	"aiot-backend/internal/model"
	"aiot-backend/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/spf13/viper"
)

type DeviceHandler struct {
	*Handler
	svc    service.DeviceServiceInterface
	config *viper.Viper
}

func NewDeviceHandler(h *Handler, svc service.DeviceServiceInterface, config *viper.Viper) *DeviceHandler {
	return &DeviceHandler{Handler: h, svc: svc, config: config}
}

func deviceJSON(device model.Device) v1.Device {
	return v1.Device{
		ID:              device.ID,
		DeviceKey:       device.DeviceKey,
		Name:            device.Name,
		ProductID:       device.ProductID,
		ProductKey:      device.Product.ProductKey,
		ProductName:     device.Product.Name,
		State:           device.State.State,
		Enabled:         device.Enabled,
		LastOnlineTime:  device.State.LastOnlineTime,
		LastOfflineTime: device.State.LastOfflineTime,
		CreatedAt:       device.CreatedAt,
		UpdatedAt:       device.UpdatedAt,
		DeletedAt:       deletedAt(device.DeletedAt),
	}
}

func deviceTagJSON(tag model.DeviceTag) v1.DeviceTag {
	return v1.DeviceTag{
		ID: tag.ID, DeviceID: tag.DeviceID, Key: tag.Key, Value: tag.Value, Source: tag.Source,
		CreatedAt: tag.CreatedAt, UpdatedAt: tag.UpdatedAt, DeletedAt: deletedAt(tag.DeletedAt),
	}
}

func deviceTagsJSON(tags []model.DeviceTag) []v1.DeviceTag {
	items := make([]v1.DeviceTag, len(tags))
	for i, tag := range tags {
		items[i] = deviceTagJSON(tag)
	}
	return items
}

func shadowHistoryJSON(history model.DeviceShadowHistory) v1.DeviceShadowHistory {
	var desired, reported any
	_ = json.Unmarshal([]byte(history.Desired), &desired)
	_ = json.Unmarshal([]byte(history.Reported), &reported)
	return v1.DeviceShadowHistory{
		ID: history.ID, DeviceID: history.DeviceID, Version: history.Version, Source: history.Source,
		Desired: desired, Reported: reported, CreatedAt: history.CreatedAt,
	}
}

func pushRecordJSON(record model.DevicePushRecord) v1.PushRecord {
	return v1.PushRecord{
		ID: record.ID, DeviceID: record.DeviceID, OperationType: record.OperationType, OperationName: record.OperationName,
		Payload: record.Payload, Status: record.Status, ErrorMessage: record.ErrorMessage, CreatedBy: record.CreatedBy,
		CreatedAt: record.CreatedAt, UpdatedAt: record.UpdatedAt,
	}
}

// CreateDevice godoc
// @Summary Create device
// @Schemes
// @Description Creates device.
// @Tags Devices
// @Accept json
// @Produce json
// @Security Bearer
// @Param request body v1.CreateDeviceRequest true "params"
// @Success 200 {object} v1.ApiResponse[v1.CreateDeviceResponse] "Successful response"
// @Router /devices [post]
func (h *DeviceHandler) CreateDevice(c *gin.Context) {
	var req v1.CreateDeviceRequest
	if e := c.ShouldBindJSON(&req); e != nil {
		v1.HandleError(c, http.StatusBadRequest, e, nil)
		return
	}
	d, e := h.svc.CreateDevice(c, &model.Device{Name: req.Name, ProductID: req.ProductID, Enabled: req.Enabled})
	if e != nil {
		v1.HandleError(c, http.StatusInternalServerError, e, nil)
		return
	}
	v1.HandleSuccess(c, v1.CreateDeviceResponse{Device: deviceJSON(*d)})
}

// GetDevice godoc
// @Summary Get device
// @Schemes
// @Description Returns device.
// @Tags Devices
// @Accept json
// @Produce json
// @Security Bearer
// @Param deviceKey path string true "Device key"
// @Success 200 {object} v1.ApiResponse[v1.GetDeviceResponse] "Successful response"
// @Router /devices/{deviceKey} [get]
func (h *DeviceHandler) GetDevice(c *gin.Context) {
	d, e := h.svc.DeviceByKey(c, c.Param("deviceKey"))
	if e != nil {
		v1.HandleError(c, http.StatusInternalServerError, e, nil)
		return
	}
	v1.HandleSuccess(c, v1.GetDeviceResponse{Device: deviceJSON(*d)})
}

// GetDeviceByKey preserves the internal entry point; the public route uses /devices/:deviceKey.
func (h *DeviceHandler) GetDeviceByKey(c *gin.Context) {
	h.GetDevice(c)
}

// ListDevices godoc
// @Summary List devices
// @Schemes
// @Description Lists devices with pagination and optional product, state, enabled, and text filters.
// @Tags Devices
// @Accept json
// @Produce json
// @Security Bearer
// @Param request query v1.ListDevicesRequest false "Query parameters"
// @Success 200 {object} v1.ApiResponse[v1.ListDevicesResponse] "Successful response"
// @Router /devices [get]
func (h *DeviceHandler) ListDevices(c *gin.Context) {
	var req v1.ListDevicesRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		v1.HandleError(c, http.StatusBadRequest, err, nil)
		return
	}
	d, n, e := h.svc.ListDevices(c, dto.ListDevicesQuery{
		Page:      req.Page,
		PageSize:  req.PageSize,
		ProductID: req.ProductID,
		States:    req.States,
		Enabled:   req.Enabled,
		Search:    req.SearchText,
	})
	if e != nil {
		v1.HandleError(c, http.StatusInternalServerError, e, nil)
		return
	}
	out := make([]v1.Device, 0, len(d))
	for _, v := range d {
		out = append(out, deviceJSON(v))
	}
	v1.HandleSuccess(c, v1.ListDevicesResponse{Devices: out, Total: n, Page: req.Page, PageSize: req.PageSize})
}

// UpdateDevice godoc
// @Summary Update device
// @Schemes
// @Description Updates device.
// @Tags Devices
// @Accept json
// @Produce json
// @Security Bearer
// @Param deviceKey path string true "Device key"
// @Param request body v1.UpdateDeviceRequest true "params"
// @Success 200 {object} v1.ApiResponse[v1.UpdateDeviceResponse] "Successful response"
// @Router /devices/{deviceKey} [put]
func (h *DeviceHandler) UpdateDevice(c *gin.Context) {
	var req v1.UpdateDeviceRequest
	if e := c.ShouldBindJSON(&req); e != nil {
		v1.HandleError(c, http.StatusBadRequest, e, nil)
		return
	}
	d, e := h.svc.UpdateDeviceByKey(c, c.Param("deviceKey"), req.Name, req.State)
	if e != nil {
		v1.HandleError(c, http.StatusInternalServerError, e, nil)
		return
	}
	v1.HandleSuccess(c, v1.UpdateDeviceResponse{Device: deviceJSON(*d)})
}

// DeleteDevice godoc
// @Summary Delete Device
// @Schemes
// @Description Deletes Device.
// @Tags Devices
// @Accept json
// @Produce json
// @Security Bearer
// @Param deviceKey path string true "Device key"
// @Success 200 {object} v1.ApiResponse[v1.DeviceSuccessResponse] "Successful response"
// @Router /devices/{deviceKey} [delete]
func (h *DeviceHandler) DeleteDevice(c *gin.Context) {
	e := h.svc.DeleteDeviceByKey(c, c.Param("deviceKey"))
	if e != nil {
		v1.HandleError(c, http.StatusInternalServerError, e, nil)
		return
	}
	v1.HandleSuccess(c, v1.DeviceSuccessResponse{Success: true})
}

// Activate godoc
// @Summary Activate device
// @Schemes
// @Description Activates device.
// @Tags Devices
// @Accept json
// @Produce json
// @Security Bearer
// @Param deviceKey path string true "Device key"
// @Success 200 {object} v1.ApiResponse[v1.ActivateDeviceResponse] "Successful response"
// @Router /devices/{deviceKey}/activate [post]
func (h *DeviceHandler) Activate(c *gin.Context) {
	d, e := h.svc.ActivateByKey(c, c.Param("deviceKey"))
	if e != nil {
		v1.HandleError(c, http.StatusInternalServerError, e, nil)
		return
	}
	v1.HandleSuccess(c, v1.ActivateDeviceResponse{Device: deviceJSON(*d)})
}

// Enabled godoc
// @Summary Set device enabled state
// @Schemes
// @Description Sets device enabled state.
// @Tags Devices
// @Accept json
// @Produce json
// @Security Bearer
// @Param deviceKey path string true "Device key"
// @Param request body v1.SetDeviceEnabledRequest true "params"
// @Success 200 {object} v1.ApiResponse[v1.SetDeviceEnabledResponse] "Successful response"
// @Router /devices/{deviceKey}/enabled [post]
func (h *DeviceHandler) Enabled(c *gin.Context) {
	var req v1.SetDeviceEnabledRequest
	e := c.ShouldBindJSON(&req)
	if e != nil {
		v1.HandleError(c, http.StatusBadRequest, e, nil)
		return
	}
	d, e := h.svc.SetEnabledByKey(c, c.Param("deviceKey"), req.Enabled)
	if e != nil {
		v1.HandleError(c, http.StatusInternalServerError, e, nil)
		return
	}
	v1.HandleSuccess(c, v1.SetDeviceEnabledResponse{Device: deviceJSON(*d)})
}

// Stats godoc
// @Summary Get device statistics
// @Schemes
// @Description Returns device statistics.
// @Tags Devices
// @Accept json
// @Produce json
// @Security Bearer
// @Success 200 {object} v1.ApiResponse[v1.DeviceStatisticsResponse] "Successful response"
// @Router /device-statistics [get]
func (h *DeviceHandler) Stats(c *gin.Context) {
	x, e := h.svc.Stats(c)
	if e != nil {
		v1.HandleError(c, http.StatusInternalServerError, e, nil)
		return
	}
	v1.HandleSuccess(c, v1.DeviceStatisticsResponse{
		TotalDevices: x.TotalDevices, ActivatedDevices: x.ActivatedDevices, OnlineDevices: x.OnlineDevices,
		OfflineDevices: x.OfflineDevices, InactiveDevices: x.InactiveDevices,
	})
}

// Telemetry godoc
// @Summary Get device telemetry
// @Schemes
// @Description Returns device telemetry.
// @Tags Devices
// @Accept json
// @Produce json
// @Security Bearer
// @Param deviceKey path string true "Device key"
// @Success 200 {object} v1.ApiResponse[v1.TelemetryResponse] "Successful response"
// @Router /devices/{deviceKey}/telemetry [get]
func (h *DeviceHandler) Telemetry(c *gin.Context) {
	x, e := h.svc.Telemetry(c, c.Param("deviceKey"))
	if e != nil {
		v1.HandleError(c, http.StatusInternalServerError, e, nil)
		return
	}
	v1.HandleSuccess(c, v1.TelemetryResponse{Telemetry: x})
}

// GetTags godoc
// @Summary List device tags
// @Schemes
// @Description Lists device tags.
// @Tags Devices
// @Accept json
// @Produce json
// @Security Bearer
// @Param deviceKey path string true "Device key"
// @Success 200 {object} v1.ApiResponse[v1.ListDeviceTagsResponse] "Successful response"
// @Router /devices/{deviceKey}/tags [get]
func (h *DeviceHandler) GetTags(c *gin.Context) {
	x, e := h.svc.Tags(c, c.Param("deviceKey"))
	if e != nil {
		v1.HandleError(c, http.StatusInternalServerError, e, nil)
		return
	}
	v1.HandleSuccess(c, v1.ListDeviceTagsResponse{Tags: deviceTagsJSON(x)})
}

// PutTags godoc
// @Summary Replace device tags
// @Schemes
// @Description Replaces device tags.
// @Tags Devices
// @Accept json
// @Produce json
// @Security Bearer
// @Param deviceKey path string true "Device key"
// @Param request body v1.SetDeviceTagsRequest true "params"
// @Success 200 {object} v1.ApiResponse[v1.ListDeviceTagsResponse] "Successful response"
// @Router /devices/{deviceKey}/tags [put]
func (h *DeviceHandler) PutTags(c *gin.Context) {
	var req v1.SetDeviceTagsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		v1.HandleError(c, http.StatusBadRequest, err, nil)
		return
	}
	x, err := h.svc.SetTags(c, c.Param("deviceKey"), req.Tags, true)
	if err != nil {
		v1.HandleError(c, http.StatusInternalServerError, err, nil)
		return
	}
	v1.HandleSuccess(c, v1.ListDeviceTagsResponse{Tags: deviceTagsJSON(x)})
}

// PostTags godoc
// @Summary Add device tags
// @Schemes
// @Description Adds device tags.
// @Tags Devices
// @Accept json
// @Produce json
// @Security Bearer
// @Param deviceKey path string true "Device key"
// @Param request body v1.SetDeviceTagsRequest true "params"
// @Success 200 {object} v1.ApiResponse[v1.ListDeviceTagsResponse] "Successful response"
// @Router /devices/{deviceKey}/tags [post]
func (h *DeviceHandler) PostTags(c *gin.Context) {
	var req v1.SetDeviceTagsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		v1.HandleError(c, http.StatusBadRequest, err, nil)
		return
	}
	x, err := h.svc.SetTags(c, c.Param("deviceKey"), req.Tags, false)
	if err != nil {
		v1.HandleError(c, http.StatusInternalServerError, err, nil)
		return
	}
	v1.HandleSuccess(c, v1.ListDeviceTagsResponse{Tags: deviceTagsJSON(x)})
}

// DeleteTags godoc
// @Summary Delete device tags
// @Schemes
// @Description Deletes device tags.
// @Tags Devices
// @Accept json
// @Produce json
// @Security Bearer
// @Param deviceKey path string true "Device key"
// @Param request body v1.DeleteDeviceTagsRequest true "params"
// @Success 200 {object} v1.ApiResponse[v1.DeviceSuccessResponse] "Successful response"
// @Router /devices/{deviceKey}/tags [delete]
func (h *DeviceHandler) DeleteTags(c *gin.Context) {
	var req v1.DeleteDeviceTagsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		v1.HandleError(c, http.StatusBadRequest, err, nil)
		return
	}
	if err := h.svc.RemoveTags(c, c.Param("deviceKey"), req.Keys); err != nil {
		v1.HandleError(c, http.StatusInternalServerError, err, nil)
		return
	}
	v1.HandleSuccess(c, v1.DeviceSuccessResponse{Success: true})
}
func shadowJSON(x *model.DeviceShadow) v1.Shadow {
	var d, r, m any
	_ = json.Unmarshal([]byte(x.Desired), &d)
	_ = json.Unmarshal([]byte(x.Reported), &r)
	_ = json.Unmarshal([]byte(x.Metadata), &m)
	dm := map[string]any{}
	if ds, ok := d.(map[string]any); ok {
		rs, _ := r.(map[string]any)
		for k, v := range ds {
			if fmt.Sprint(rs[k]) != fmt.Sprint(v) {
				dm[k] = v
			}
		}
	}
	// When metadata is absent, synthesize the standard per-property timestamp structure.
	if m == nil || m == "" {
		metaMap := map[string]any{
			"desired":  map[string]any{},
			"reported": map[string]any{},
		}
		nowTs := x.UpdatedAt.Unix()
		if ds, ok := d.(map[string]any); ok {
			dMeta := map[string]any{}
			for k := range ds {
				dMeta[k] = map[string]any{"timestamp": nowTs}
			}
			metaMap["desired"] = dMeta
		}
		if rs, ok := r.(map[string]any); ok {
			rMeta := map[string]any{}
			for k := range rs {
				rMeta[k] = map[string]any{"timestamp": nowTs}
			}
			metaMap["reported"] = rMeta
		}
		m = metaMap
	}

	state := v1.ShadowState{
		Desired:  d,
		Reported: r,
		Delta:    dm,
	}

	return v1.Shadow{
		State:     state,
		Desired:   d,
		Reported:  r,
		Delta:     dm,
		Metadata:  m,
		Version:   x.Version,
		Timestamp: x.UpdatedAt.Unix(),
		UpdatedAt: x.UpdatedAt,
	}
}

// GetShadow godoc
// @Summary Get device shadow
// @Schemes
// @Description Returns device shadow.
// @Tags Devices
// @Accept json
// @Produce json
// @Security Bearer
// @Param deviceKey path string true "Device key"
// @Success 200 {object} v1.ApiResponse[v1.Shadow] "Successful response"
// @Router /devices/{deviceKey}/shadow [get]
func (h *DeviceHandler) GetShadow(c *gin.Context) {
	x, e := h.svc.Shadow(c, c.Param("deviceKey"))
	if e != nil {
		v1.HandleError(c, http.StatusInternalServerError, e, nil)
		return
	}
	v1.HandleSuccess(c, shadowJSON(x))
}

// Desired godoc
// @Summary Update desired device shadow
// @Schemes
// @Description Updates desired device shadow.
// @Tags Devices
// @Accept json
// @Produce json
// @Security Bearer
// @Param deviceKey path string true "Device key"
// @Param request body v1.UpdateDesiredShadowRequest true "params"
// @Success 200 {object} v1.ApiResponse[v1.Shadow] "Successful response"
// @Router /devices/{deviceKey}/shadow/desired [put]
func (h *DeviceHandler) Desired(c *gin.Context) {
	var req v1.UpdateDesiredShadowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		v1.HandleError(c, http.StatusBadRequest, err, nil)
		return
	}
	x, err := h.svc.MutateShadow(c, c.Param("deviceKey"), req.Version, "app", &req.Desired, nil, false)
	if err != nil {
		v1.HandleError(c, http.StatusInternalServerError, err, nil)
		return
	}
	v1.HandleSuccess(c, shadowJSON(x))
}

// ClearDesired godoc
// @Summary Clear desired device shadow
// @Schemes
// @Description Clears desired device shadow.
// @Tags Devices
// @Accept json
// @Produce json
// @Security Bearer
// @Param deviceKey path string true "Device key"
// @Param request body v1.ClearDesiredShadowRequest true "params"
// @Success 200 {object} v1.ApiResponse[v1.Shadow] "Successful response"
// @Router /devices/{deviceKey}/shadow/desired [delete]
func (h *DeviceHandler) ClearDesired(c *gin.Context) {
	var req v1.ClearDesiredShadowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		v1.HandleError(c, http.StatusBadRequest, err, nil)
		return
	}
	x, e := h.svc.MutateShadow(c, c.Param("deviceKey"), req.Version, "app", nil, nil, true)
	if e != nil {
		v1.HandleError(c, http.StatusInternalServerError, e, nil)
		return
	}
	v1.HandleSuccess(c, shadowJSON(x))
}

// History godoc
// @Summary List device shadow history
// @Schemes
// @Description Lists device shadow history.
// @Tags Devices
// @Accept json
// @Produce json
// @Security Bearer
// @Param deviceKey path string true "Device key"
// @Success 200 {object} v1.ApiResponse[v1.ListDeviceShadowHistoryResponse] "Successful response"
// @Router /devices/{deviceKey}/shadow/history [get]
func (h *DeviceHandler) History(c *gin.Context) {
	x, e := h.svc.ShadowHistory(c, c.Param("deviceKey"))
	if e != nil {
		v1.HandleError(c, http.StatusInternalServerError, e, nil)
		return
	}
	items := make([]v1.DeviceShadowHistory, len(x))
	for i, history := range x {
		items[i] = shadowHistoryJSON(history)
	}
	v1.HandleSuccess(c, v1.ListDeviceShadowHistoryResponse{History: items})
}

// SimulatePush godoc
// @Summary Simulate downstream push
// @Schemes
// @Description Simulates downstream push.
// @Tags Devices
// @Accept json
// @Produce json
// @Security Bearer
// @Param deviceKey path string true "Device key"
// @Param request body v1.SimulatePushRequest true "params"
// @Success 200 {object} v1.ApiResponse[v1.SimulatePushResponse] "Successful response"
// @Router /devices/{deviceKey}/simulate-push [post]
func (h *DeviceHandler) SimulatePush(c *gin.Context) {
	var req v1.SimulatePushRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		v1.HandleError(c, http.StatusBadRequest, err, nil)
		return
	}
	record, err := h.svc.SimulatePush(c, c.Param("deviceKey"), req.Payload, c.GetHeader("X-User-ID"))
	if err != nil {
		v1.HandleError(c, http.StatusInternalServerError, err, nil)
		return
	}
	v1.HandleSuccess(c, v1.SimulatePushResponse{PushRecordID: strconv.FormatInt(record.ID, 10), Timestamp: record.CreatedAt.UnixMilli(), Status: record.Status, Message: "success"})
}

// PushRecords godoc
// @Summary List downstream push records
// @Schemes
// @Description Lists downstream push records.
// @Tags Devices
// @Accept json
// @Produce json
// @Security Bearer
// @Param deviceKey path string true "Device key"
// @Param request query v1.ListPushRecordsRequest false "Query parameters"
// @Success 200 {object} v1.ApiResponse[v1.ListPushRecordsResponse] "Successful response"
// @Router /devices/{deviceKey}/push-records [get]
func (h *DeviceHandler) PushRecords(c *gin.Context) {
	var req v1.ListPushRecordsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		v1.HandleError(c, http.StatusBadRequest, err, nil)
		return
	}
	records, total, err := h.svc.ListPushRecords(c, c.Param("deviceKey"), req.Page, req.PageSize, req.OperationType, req.Status)
	if err != nil {
		v1.HandleError(c, http.StatusInternalServerError, err, nil)
		return
	}
	items := make([]v1.PushRecord, len(records))
	for i, record := range records {
		items[i] = pushRecordJSON(record)
	}
	v1.HandleSuccess(c, v1.ListPushRecordsResponse{Records: items, Total: total, Page: req.Page, PageSize: req.PageSize})
}

// PushRecord godoc
// @Summary Get downstream push record
// @Schemes
// @Description Returns downstream push record.
// @Tags Devices
// @Accept json
// @Produce json
// @Security Bearer
// @Param pushRecordId path int true "Push record ID"
// @Success 200 {object} v1.ApiResponse[v1.GetPushRecordResponse] "Successful response"
// @Router /devices/push-records/{pushRecordId} [get]
func (h *DeviceHandler) PushRecord(c *gin.Context) {
	pushRecordID, err := strconv.ParseInt(c.Param("pushRecordId"), 10, 64)
	if err != nil {
		v1.HandleError(c, http.StatusBadRequest, err, nil)
		return
	}
	record, err := h.svc.PushRecord(c, pushRecordID)
	if err != nil {
		v1.HandleError(c, http.StatusInternalServerError, err, nil)
		return
	}
	v1.HandleSuccess(c, v1.GetPushRecordResponse{Record: pushRecordJSON(*record)})
}

// ClearPushRecords godoc
// @Summary Clear downstream push records
// @Schemes
// @Description Clears downstream push records.
// @Tags Devices
// @Accept json
// @Produce json
// @Security Bearer
// @Param deviceKey path string true "Device key"
// @Param request query v1.ClearPushRecordsRequest false "Query parameters"
// @Success 200 {object} v1.ApiResponse[v1.ClearPushRecordsResponse] "Successful response"
// @Router /devices/{deviceKey}/push-records [delete]
func (h *DeviceHandler) ClearPushRecords(c *gin.Context) {
	var req v1.ClearPushRecordsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		v1.HandleError(c, http.StatusBadRequest, err, nil)
		return
	}

	var before *time.Time
	if req.BeforeTimestamp != nil {
		value := time.UnixMilli(*req.BeforeTimestamp)
		before = &value
	}
	deletedCount, err := h.svc.ClearPushRecords(c, c.Param("deviceKey"), before)
	if err != nil {
		v1.HandleError(c, http.StatusInternalServerError, err, nil)
		return
	}
	v1.HandleSuccess(c, v1.ClearPushRecordsResponse{DeletedCount: deletedCount, Success: true})
}

// BatchTemplate godoc
// @Summary Download device import template
// @Schemes
// @Description Downloads device import template.
// @Tags Devices
// @Produce octet-stream
// @Security Bearer
// @Success 200 {file} file "Successful response"
// @Router /devices/batch/template [get]
func (h *DeviceHandler) BatchTemplate(c *gin.Context) {
	b, e := h.svc.BatchTemplate()
	if e != nil {
		v1.HandleError(c, http.StatusInternalServerError, e, nil)
		return
	}
	c.Header("Content-Disposition", "attachment; filename=device_import_template.xlsx")
	c.Data(200, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", b)
}

// BatchUpload godoc
// @Summary Import devices in bulk
// @Schemes
// @Description Imports devices in bulk.
// @Tags Devices
// @Accept multipart/form-data
// @Produce json
// @Security Bearer
// @Param file formData file true "Upload file"
// @Success 200 {object} v1.ApiResponse[v1.BatchUploadDevicesResponse] "Successful response"
// @Router /devices/batch/upload [post]
func (h *DeviceHandler) BatchUpload(c *gin.Context) {
	f, _, e := c.Request.FormFile("file")
	if e != nil {
		v1.HandleError(c, http.StatusBadRequest, e, nil)
		return
	}
	defer f.Close()
	b, e := io.ReadAll(io.LimitReader(f, 10<<20))
	if e != nil {
		v1.HandleError(c, http.StatusBadRequest, e, nil)
		return
	}
	n, errs, e := h.svc.BatchCreate(c, b)
	if e != nil {
		v1.HandleError(c, http.StatusInternalServerError, e, nil)
		return
	}
	items := make([]v1.BatchUploadError, len(errs))
	for i, item := range errs {
		items[i] = v1.BatchUploadError{Row: item.Row, ProductKey: item.ProductKey, DeviceName: item.DeviceName, Error: item.Error}
	}
	v1.HandleSuccess(c, v1.BatchUploadDevicesResponse{SuccessCount: n, FailureCount: len(items), Errors: items})
}
