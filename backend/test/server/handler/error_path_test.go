package handler_test

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"aiot-backend/internal/handler"
	"aiot-backend/internal/model"
	"aiot-backend/internal/repository"
	"aiot-backend/internal/service"
	mock_service "aiot-backend/test/mocks/service"

	"github.com/gin-gonic/gin"
	"github.com/golang/mock/gomock"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
)

func TestDeviceHandler_CreateDevice_InvalidJSON(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.POST("/devices", deviceHandler.CreateDevice)

	req, _ := http.NewRequest("POST", "/devices", bytes.NewBufferString("invalid"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestDeviceHandler_GetDevice_NotFound(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.GET("/devices/:deviceKey", deviceHandler.GetDevice)

	mockService.EXPECT().DeviceByKey(gomock.Any(), "1").Return(nil, repository.ErrNotFound)
	req, _ := http.NewRequest("GET", "/devices/1", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeviceHandler_GetDevice_ServiceError(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.GET("/devices/:deviceKey", deviceHandler.GetDevice)

	mockService.EXPECT().DeviceByKey(gomock.Any(), "abc").Return(nil, errors.New("db error"))
	req, _ := http.NewRequest("GET", "/devices/abc", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeviceHandler_GetDeviceByKey_NotFound(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.GET("/devices/key/:deviceKey", deviceHandler.GetDeviceByKey)

	mockService.EXPECT().DeviceByKey(gomock.Any(), "NONEXIST").Return(nil, repository.ErrNotFound)
	req, _ := http.NewRequest("GET", "/devices/key/NONEXIST", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeviceHandler_ListDevices_WithProductID(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.GET("/devices", deviceHandler.ListDevices)

	devices := []model.Device{{ID: 1, Name: "Device1"}}
	mockService.EXPECT().ListDevices(gomock.Any(), gomock.Any()).Return(devices, int64(1), nil)
	req, _ := http.NewRequest("GET", "/devices?productId=1", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestDeviceHandler_ListDevices_WithStates(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.GET("/devices", deviceHandler.ListDevices)

	devices := []model.Device{{ID: 1, Name: "Device1"}}
	mockService.EXPECT().ListDevices(gomock.Any(), gomock.Any()).Return(devices, int64(1), nil)
	req, _ := http.NewRequest("GET", "/devices?states=online&states=offline", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestDeviceHandler_ListDevices_WithEnabled(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.GET("/devices", deviceHandler.ListDevices)

	devices := []model.Device{{ID: 1, Name: "Device1"}}
	mockService.EXPECT().ListDevices(gomock.Any(), gomock.Any()).Return(devices, int64(1), nil)
	req, _ := http.NewRequest("GET", "/devices?enabled=true", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestDeviceHandler_ListDevices_WithSearch(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.GET("/devices", deviceHandler.ListDevices)

	devices := []model.Device{{ID: 1, Name: "Device1"}}
	mockService.EXPECT().ListDevices(gomock.Any(), gomock.Any()).Return(devices, int64(1), nil)
	req, _ := http.NewRequest("GET", "/devices?searchText=test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestDeviceHandler_UpdateDevice_InvalidJSON(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.PUT("/devices/:deviceKey", deviceHandler.UpdateDevice)

	req, _ := http.NewRequest("PUT", "/devices/1", bytes.NewBufferString("invalid"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestDeviceHandler_DeleteDevice_Success(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.DELETE("/devices/:deviceKey", deviceHandler.DeleteDevice)

	mockService.EXPECT().DeleteDeviceByKey(gomock.Any(), "1").Return(nil)
	req, _ := http.NewRequest("DELETE", "/devices/1", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestDeviceHandler_Stats_Success(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.GET("/devices/stats", deviceHandler.Stats)

	stats := service.DeviceStatistics{TotalDevices: 10, OnlineDevices: 5}
	mockService.EXPECT().Stats(gomock.Any()).Return(stats, nil)
	req, _ := http.NewRequest("GET", "/devices/stats", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestDeviceHandler_Telemetry_NotFound(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.GET("/devices/:deviceKey/telemetry", deviceHandler.Telemetry)

	mockService.EXPECT().Telemetry(gomock.Any(), "D001").Return("", repository.ErrNotFound)
	req, _ := http.NewRequest("GET", "/devices/D001/telemetry", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeviceHandler_GetTags_NotFound(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.GET("/devices/:deviceKey/tags", deviceHandler.GetTags)

	mockService.EXPECT().Tags(gomock.Any(), "D001").Return(nil, repository.ErrNotFound)
	req, _ := http.NewRequest("GET", "/devices/D001/tags", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeviceHandler_PutTags_InvalidJSON(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.PUT("/devices/:deviceKey/tags", deviceHandler.PutTags)

	req, _ := http.NewRequest("PUT", "/devices/D001/tags", bytes.NewBufferString("invalid"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestDeviceHandler_DeleteTags_Success(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.DELETE("/devices/:deviceKey/tags", deviceHandler.DeleteTags)

	mockService.EXPECT().RemoveTags(gomock.Any(), "D001", []string{"key1"}).Return(nil)
	body, _ := json.Marshal(map[string]interface{}{"keys": []string{"key1"}})
	req, _ := http.NewRequest("DELETE", "/devices/D001/tags", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestDeviceHandler_DeleteTags_InvalidJSON(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.DELETE("/devices/:deviceKey/tags", deviceHandler.DeleteTags)

	req, _ := http.NewRequest("DELETE", "/devices/D001/tags", bytes.NewBufferString("invalid"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestDeviceHandler_GetShadow_NotFound(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.GET("/devices/:deviceKey/shadow", deviceHandler.GetShadow)

	mockService.EXPECT().Shadow(gomock.Any(), "D001").Return(nil, repository.ErrNotFound)
	req, _ := http.NewRequest("GET", "/devices/D001/shadow", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeviceHandler_History_Success(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.GET("/devices/:deviceKey/shadow/history", deviceHandler.History)

	history := []model.DeviceShadowHistory{{ID: 1, DeviceID: 1, Version: 1, Source: "device"}}
	mockService.EXPECT().ShadowHistory(gomock.Any(), "D001").Return(history, nil)
	req, _ := http.NewRequest("GET", "/devices/D001/shadow/history", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestDeviceHandler_ClearPushRecords_Success(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.DELETE("/devices/:deviceKey/push-records", deviceHandler.ClearPushRecords)

	mockService.EXPECT().ClearPushRecords(gomock.Any(), "D001", gomock.Any()).Return(int64(5), nil)
	req, _ := http.NewRequest("DELETE", "/devices/D001/push-records", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestDeviceHandler_ClearPushRecords_WithBeforeTime(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.DELETE("/devices/:deviceKey/push-records", deviceHandler.ClearPushRecords)

	before := time.Now().Format(time.RFC3339)
	mockService.EXPECT().ClearPushRecords(gomock.Any(), "D001", gomock.Any()).Return(int64(5), nil)
	req, _ := http.NewRequest("DELETE", "/devices/D001/push-records?before="+before, nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestDeviceHandler_SimulatePush_InvalidJSON(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.POST("/devices/:deviceKey/simulate-push", deviceHandler.SimulatePush)

	req, _ := http.NewRequest("POST", "/devices/D001/simulate-push", bytes.NewBufferString("invalid"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestDeviceHandler_UpdateDevice_InvalidID(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.PUT("/devices/:deviceKey", deviceHandler.UpdateDevice)

	mockService.EXPECT().UpdateDeviceByKey(gomock.Any(), "abc", "Test", "").Return(nil, errors.New("not found"))
	body, _ := json.Marshal(map[string]string{"name": "Test"})
	req, _ := http.NewRequest("PUT", "/devices/abc", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeviceHandler_UpdateDevice_ServiceError(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.PUT("/devices/:deviceKey", deviceHandler.UpdateDevice)

	mockService.EXPECT().UpdateDeviceByKey(gomock.Any(), "1", "Test", "").Return(nil, errors.New("invalid status transition"))
	body, _ := json.Marshal(map[string]string{"name": "Test"})
	req, _ := http.NewRequest("PUT", "/devices/1", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeviceHandler_DeleteDevice_ServiceError(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.DELETE("/devices/:deviceKey", deviceHandler.DeleteDevice)

	mockService.EXPECT().DeleteDeviceByKey(gomock.Any(), "1").Return(errors.New("db error"))
	req, _ := http.NewRequest("DELETE", "/devices/1", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeviceHandler_Activate_ServiceError(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.POST("/devices/:deviceKey/activate", deviceHandler.Activate)

	mockService.EXPECT().ActivateByKey(gomock.Any(), "1").Return(nil, errors.New("device already activated"))
	req, _ := http.NewRequest("POST", "/devices/1/activate", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeviceHandler_Enabled_BindError(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.POST("/devices/:deviceKey/enabled", deviceHandler.Enabled)

	req, _ := http.NewRequest("POST", "/devices/1/enabled", bytes.NewBufferString("invalid"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestDeviceHandler_Enabled_ServiceError(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.POST("/devices/:deviceKey/enabled", deviceHandler.Enabled)

	mockService.EXPECT().SetEnabledByKey(gomock.Any(), "1", true).Return(nil, errors.New("not found"))
	body, _ := json.Marshal(map[string]bool{"enabled": true})
	req, _ := http.NewRequest("POST", "/devices/1/enabled", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeviceHandler_Stats_Error(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.GET("/devices/stats", deviceHandler.Stats)

	mockService.EXPECT().Stats(gomock.Any()).Return(service.DeviceStatistics{}, errors.New("db error"))
	req, _ := http.NewRequest("GET", "/devices/stats", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeviceHandler_SimulatePush_ServiceError(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.POST("/devices/:deviceKey/simulate-push", deviceHandler.SimulatePush)

	mockService.EXPECT().SimulatePush(gomock.Any(), "D001", `{"temp":25}`, "").Return(nil, errors.New("device not found"))
	body, _ := json.Marshal(map[string]string{"payload": `{"temp":25}`})
	req, _ := http.NewRequest("POST", "/devices/D001/simulate-push", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeviceHandler_SimulatePush_WithUserID(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.POST("/devices/:deviceKey/simulate-push", deviceHandler.SimulatePush)

	record := &model.DevicePushRecord{ID: 1, DeviceID: 1, Status: "success"}
	mockService.EXPECT().SimulatePush(gomock.Any(), "D001", `{"temp":25}`, "user123").Return(record, nil)
	body, _ := json.Marshal(map[string]string{"payload": `{"temp":25}`})
	req, _ := http.NewRequest("POST", "/devices/D001/simulate-push", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "user123")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestDeviceHandler_PushRecords_ServiceError(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.GET("/devices/:deviceKey/push-records", deviceHandler.PushRecords)

	mockService.EXPECT().ListPushRecords(gomock.Any(), "D001", 1, 10, "", "").Return(nil, int64(0), errors.New("db error"))
	req, _ := http.NewRequest("GET", "/devices/D001/push-records", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeviceHandler_PushRecord_InvalidID(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.GET("/devices/:deviceKey/push-records/:pushRecordId", deviceHandler.PushRecord)

	req, _ := http.NewRequest("GET", "/devices/D001/push-records/abc", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestDeviceHandler_PushRecord_ServiceError(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.GET("/devices/:deviceKey/push-records/:pushRecordId", deviceHandler.PushRecord)

	mockService.EXPECT().PushRecord(gomock.Any(), int64(1)).Return(nil, errors.New("not found"))
	req, _ := http.NewRequest("GET", "/devices/D001/push-records/1", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeviceHandler_ClearPushRecords_ServiceError(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.DELETE("/devices/:deviceKey/push-records", deviceHandler.ClearPushRecords)

	mockService.EXPECT().ClearPushRecords(gomock.Any(), "D001", gomock.Any()).Return(int64(0), errors.New("db error"))
	req, _ := http.NewRequest("DELETE", "/devices/D001/push-records", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeviceHandler_ClearPushRecords_WithMilliseconds(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.DELETE("/devices/:deviceKey/push-records", deviceHandler.ClearPushRecords)

	mockService.EXPECT().ClearPushRecords(gomock.Any(), "D001", gomock.Any()).Return(int64(3), nil)
	req, _ := http.NewRequest("DELETE", "/devices/D001/push-records?beforeTimestamp=1700000000000", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestDeviceHandler_ClearPushRecords_InvalidBeforeTimestamp(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.DELETE("/devices/:deviceKey/push-records", deviceHandler.ClearPushRecords)

	req, _ := http.NewRequest("DELETE", "/devices/D001/push-records?beforeTimestamp=abc", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestDeviceHandler_ClearPushRecords_NegativeBeforeTimestamp(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.DELETE("/devices/:deviceKey/push-records", deviceHandler.ClearPushRecords)

	req, _ := http.NewRequest("DELETE", "/devices/D001/push-records?beforeTimestamp=-1", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestDeviceHandler_BatchUpload_NoFile(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.POST("/devices/batch-upload", deviceHandler.BatchUpload)

	req, _ := http.NewRequest("POST", "/devices/batch-upload", nil)
	req.Header.Set("Content-Type", "multipart/form-data")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestDeviceHandler_Desired_ServiceError(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.PUT("/devices/:deviceKey/shadow/desired", deviceHandler.Desired)

	desired := map[string]any{"key": "val"}
	mockService.EXPECT().MutateShadow(gomock.Any(), "1", int64(0), "app", &desired, nil, false).Return(nil, errors.New("version conflict"))
	body, _ := json.Marshal(map[string]any{"version": 0, "desired": desired})
	req, _ := http.NewRequest("PUT", "/devices/1/shadow/desired", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeviceHandler_ClearDesired_ServiceError(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.DELETE("/devices/:deviceKey/shadow/desired", deviceHandler.ClearDesired)

	mockService.EXPECT().MutateShadow(gomock.Any(), "1", int64(0), "app", nil, nil, true).Return(nil, errors.New("not found"))
	body, _ := json.Marshal(map[string]any{"version": 0})
	req, _ := http.NewRequest("DELETE", "/devices/1/shadow/desired", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeviceHandler_Telemetry_ServiceError(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.GET("/devices/:deviceKey/telemetry", deviceHandler.Telemetry)

	mockService.EXPECT().Telemetry(gomock.Any(), "D001").Return("", errors.New("redis error"))
	req, _ := http.NewRequest("GET", "/devices/D001/telemetry", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeviceHandler_GetTags_ServiceError(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.GET("/devices/:deviceKey/tags", deviceHandler.GetTags)

	mockService.EXPECT().Tags(gomock.Any(), "D001").Return(nil, errors.New("db error"))
	req, _ := http.NewRequest("GET", "/devices/D001/tags", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeviceHandler_PutTags_ServiceError(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.PUT("/devices/:deviceKey/tags", deviceHandler.PutTags)

	mockService.EXPECT().SetTags(gomock.Any(), "D001", map[string]string{"k": "v"}, true).Return(nil, errors.New("invalid tag key"))
	body, _ := json.Marshal(map[string]interface{}{"tags": map[string]string{"k": "v"}})
	req, _ := http.NewRequest("PUT", "/devices/D001/tags", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeviceHandler_DeleteTags_ServiceError(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.DELETE("/devices/:deviceKey/tags", deviceHandler.DeleteTags)

	mockService.EXPECT().RemoveTags(gomock.Any(), "D001", []string{"key1"}).Return(errors.New("db error"))
	body, _ := json.Marshal(map[string]interface{}{"keys": []string{"key1"}})
	req, _ := http.NewRequest("DELETE", "/devices/D001/tags", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeviceHandler_GetShadow_ServiceError(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.GET("/devices/:deviceKey/shadow", deviceHandler.GetShadow)

	mockService.EXPECT().Shadow(gomock.Any(), "D001").Return(nil, errors.New("not found"))
	req, _ := http.NewRequest("GET", "/devices/D001/shadow", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeviceHandler_History_ServiceError(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.GET("/devices/:deviceKey/shadow/history", deviceHandler.History)

	mockService.EXPECT().ShadowHistory(gomock.Any(), "D001").Return(nil, errors.New("db error"))
	req, _ := http.NewRequest("GET", "/devices/D001/shadow/history", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeviceHandler_GetDeviceByKey_ServiceError(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.GET("/devices/key/:deviceKey", deviceHandler.GetDeviceByKey)

	mockService.EXPECT().DeviceByKey(gomock.Any(), "NONEXIST").Return(nil, errors.New("not found"))
	req, _ := http.NewRequest("GET", "/devices/key/NONEXIST", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeviceHandler_ListDevices_ServiceError(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockService := mock_service.NewMockDeviceServiceInterface(ctrl)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	config := viper.New()
	deviceHandler := handler.NewDeviceHandler(h, mockService, config)
	router.GET("/devices", deviceHandler.ListDevices)

	mockService.EXPECT().ListDevices(gomock.Any(), gomock.Any()).Return(nil, int64(0), errors.New("db error"))
	req, _ := http.NewRequest("GET", "/devices", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}
