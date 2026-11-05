package handler_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"aiot-backend/internal/dto"
	"aiot-backend/internal/handler"
	"aiot-backend/internal/model"
	"aiot-backend/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

type invocationServiceStub struct {
	items      []model.DeviceServiceInvocation
	invocation *model.DeviceServiceInvocation
	total      int64
	err        error
}

func (s invocationServiceStub) ListProperties(context.Context, string) ([]dto.ThingModelProperty, error) {
	return nil, nil
}

func (s invocationServiceStub) ListServiceInvocations(context.Context, dto.ListDeviceServiceInvocationsQuery) ([]model.DeviceServiceInvocation, int64, error) {
	return s.items, s.total, s.err
}

func (s invocationServiceStub) InvokeService(context.Context, string, string, string) (*model.DeviceServiceInvocation, error) {
	return s.invocation, s.err
}

func setupDeviceServiceInvocationRouter(service service.ThingModelDataServiceInterface) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handler{}
	invocationHandler := handler.NewThingModelDataHandler(h, service)

	router.GET("/devices/:deviceKey/thing-model/service-invocations", invocationHandler.ListServiceInvocations)
	router.POST("/devices/:deviceKey/thing-model/services/:serviceIdentifier/invoke", invocationHandler.InvokeService)

	return router
}

func TestDeviceServiceInvocationHandler_List_Success(t *testing.T) {
	output := `{"status":"ok"}`
	invocations := []model.DeviceServiceInvocation{
		{
			UUID:              "test-uuid-1",
			DeviceID:          1,
			ServiceIdentifier: "reboot",
			ServiceName:       "Reboot Device",
			InputParams:       `{"force":true}`,
			OutputParams:      &output,
			InvokedAt:         time.Now(),
		},
	}
	router := setupDeviceServiceInvocationRouter(invocationServiceStub{items: invocations, total: 1})

	req, _ := http.NewRequest("GET", "/devices/D001/thing-model/service-invocations?page=1&pageSize=10", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestDeviceServiceInvocationHandler_List_BadRequest(t *testing.T) {
	router := setupDeviceServiceInvocationRouter(invocationServiceStub{})

	req, _ := http.NewRequest("GET", "/devices/D001/thing-model/service-invocations?startAt=invalid-time-format", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestDeviceServiceInvocationHandler_List_Error(t *testing.T) {
	router := setupDeviceServiceInvocationRouter(invocationServiceStub{err: gorm.ErrRecordNotFound})

	req, _ := http.NewRequest("GET", "/devices/NON_EXISTENT/thing-model/service-invocations", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeviceServiceInvocationHandler_Invoke_Success(t *testing.T) {
	inv := &model.DeviceServiceInvocation{
		UUID:              "inv-100",
		DeviceID:          1,
		ServiceIdentifier: "reboot",
		ServiceName:       "Reboot Device",
		InputParams:       `{"delay":5}`,
		InvokedAt:         time.Now(),
	}
	router := setupDeviceServiceInvocationRouter(invocationServiceStub{invocation: inv})

	req, _ := http.NewRequest("POST", "/devices/D001/thing-model/services/reboot/invoke", strings.NewReader(`{"inputParams":"{\"delay\":5}"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"uuid":"inv-100"`)
}

func TestDeviceServiceInvocationHandler_Invoke_BadRequest(t *testing.T) {
	router := setupDeviceServiceInvocationRouter(invocationServiceStub{err: service.ErrInvalidServiceInput})

	req, _ := http.NewRequest("POST", "/devices/D001/thing-model/services/reboot/invoke", strings.NewReader(`{"inputParams":"invalid"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestDeviceServiceInvocationHandler_Invoke_DeviceOffline(t *testing.T) {
	router := setupDeviceServiceInvocationRouter(invocationServiceStub{err: service.ErrDeviceOffline})

	req, _ := http.NewRequest("POST", "/devices/D001/thing-model/services/reboot/invoke", strings.NewReader(`{"inputParams":"{}"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}
