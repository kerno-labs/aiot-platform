package handler

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"aiot-backend/internal/dto"
	"aiot-backend/internal/model"
	"aiot-backend/internal/repository"
	"aiot-backend/pkg/log"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func baseHandler(t *testing.T) *Handler {
	t.Helper()
	return NewHandler(&log.Logger{Logger: zap.NewNop()})
}

func hctx(method, path string, body []byte, headers map[string]string, params gin.Params) (*gin.Context, *httptest.ResponseRecorder) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(method, path, bytes.NewReader(body))
	for key, value := range headers {
		c.Request.Header.Set(key, value)
	}
	c.Params = params
	return c, w
}

type fakeThingModelPropertyService struct {
	properties []dto.ThingModelProperty
	err        error
}

func (f fakeThingModelPropertyService) ListProperties(context.Context, string) ([]dto.ThingModelProperty, error) {
	return f.properties, f.err
}

func (f fakeThingModelPropertyService) ListServiceInvocations(context.Context, dto.ListDeviceServiceInvocationsQuery) ([]model.DeviceServiceInvocation, int64, error) {
	return nil, 0, nil
}

func (f fakeThingModelPropertyService) InvokeService(context.Context, string, string, string) (*model.DeviceServiceInvocation, error) {
	return nil, f.err
}

func TestThingModelPropertyHandler_List(t *testing.T) {
	reportedAt := time.Now()
	h := NewThingModelDataHandler(baseHandler(t), fakeThingModelPropertyService{properties: []dto.ThingModelProperty{{
		Identifier: "temperature", Name: "Temperature", DataType: "double", Unit: "°C", AccessMode: "r", Value: 25.5, ReportedAt: &reportedAt,
	}}})
	c, w := hctx(http.MethodGet, "/devices/device-1/thing-model/properties", nil, nil, gin.Params{{Key: "deviceKey", Value: "device-1"}})
	h.ListProperties(c)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestThingModelPropertyHandler_ListError(t *testing.T) {
	h := NewThingModelDataHandler(baseHandler(t), fakeThingModelPropertyService{err: repository.ErrNotFound})
	c, w := hctx(http.MethodGet, "/devices/missing/thing-model/properties", nil, nil, gin.Params{{Key: "deviceKey", Value: "missing"}})
	h.ListProperties(c)
	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}
