package handler

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"aiot-backend/internal/model"
	"aiot-backend/internal/repository"
	"aiot-backend/internal/service"
	"aiot-backend/pkg/log"
	mock_service "aiot-backend/test/mocks/service"

	"github.com/gin-gonic/gin"
	"github.com/golang/mock/gomock"
	"github.com/spf13/viper"
)

func newTestDeviceHandler(t *testing.T, ctrl *gomock.Controller, cfg *viper.Viper) (*DeviceHandler, *mock_service.MockDeviceServiceInterface) {
	t.Helper()
	conf := viper.New()
	conf.Set("log.log_file_name", filepath.Join(t.TempDir(), "out.log"))
	logger := log.NewLog(conf)
	m := mock_service.NewMockDeviceServiceInterface(ctrl)
	return NewDeviceHandler(NewHandler(logger), m, cfg), m
}

func mountDevice(r *gin.Engine, h *DeviceHandler) {
	g := r.Group("/devices")
	g.POST("", h.CreateDevice)
	g.GET("", h.ListDevices)
	g.GET("/key/:deviceKey", h.GetDeviceByKey)
	g.GET("/batch/template", h.BatchTemplate)
	g.POST("/batch/upload", h.BatchUpload)
	g.GET("/statistics", h.Stats)
	g.GET("/:deviceKey", h.GetDevice)
	g.PUT("/:deviceKey", h.UpdateDevice)
	g.DELETE("/:deviceKey", h.DeleteDevice)
	g.POST("/:deviceKey/activate", h.Activate)
	g.POST("/:deviceKey/enabled", h.Enabled)
	g.GET("/:deviceKey/telemetry", h.Telemetry)
	g.GET("/:deviceKey/tags", h.GetTags)
	g.PUT("/:deviceKey/tags", h.PutTags)
	g.POST("/:deviceKey/tags", h.PostTags)
	g.DELETE("/:deviceKey/tags", h.DeleteTags)
	g.GET("/:deviceKey/shadow", h.GetShadow)
	g.PUT("/:deviceKey/shadow/desired", h.Desired)
	g.DELETE("/:deviceKey/shadow/desired", h.ClearDesired)
	g.GET("/:deviceKey/shadow/history", h.History)
	g.POST("/:deviceKey/simulate-push", h.SimulatePush)
	g.GET("/:deviceKey/push-records", h.PushRecords)
	g.DELETE("/:deviceKey/push-records", h.ClearPushRecords)
	r.GET("/devices/push-records/:pushRecordId", h.PushRecord)
}

func doDeviceReq(h *DeviceHandler, method, path string, body []byte, hdr map[string]string) *httptest.ResponseRecorder {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	mountDevice(r, h)
	req := httptest.NewRequest(method, path, bytes.NewReader(body))
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	for k, v := range hdr {
		req.Header.Set(k, v)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func sampleDevice() *model.Device {
	return &model.Device{
		ID:        1,
		DeviceKey: "dk1",
		Product:   model.Product{ProductKey: "pk", Name: "pn"},
		State:     model.DeviceState{State: "online"},
	}
}

func TestDeviceHandler_CreateDevice(t *testing.T) {
	ctrl := gomock.NewController(t)
	h, m := newTestDeviceHandler(t, ctrl, viper.New())
	m.EXPECT().CreateDevice(gomock.Any(), gomock.Any()).Return(sampleDevice(), nil)
	w := doDeviceReq(h, http.MethodPost, "/devices", []byte(`{"name":"d1","productId":2,"metadata":{"key":"value"}}`), nil)
	if w.Code != http.StatusOK {
		t.Fatalf("got %d body %s", w.Code, w.Body.String())
	}
	if strings.Contains(w.Body.String(), `"metadata"`) {
		t.Fatalf("device response unexpectedly includes metadata: %s", w.Body.String())
	}
}

func TestDeviceHandler_CreateDevice_BindError(t *testing.T) {
	ctrl := gomock.NewController(t)
	h, _ := newTestDeviceHandler(t, ctrl, viper.New())
	w := doDeviceReq(h, http.MethodPost, "/devices", []byte(`{bad`), nil)
	if w.Code == http.StatusOK {
		t.Fatalf("expected error status, got 200")
	}
}

func TestDeviceHandler_GetDevice(t *testing.T) {
	ctrl := gomock.NewController(t)
	h, m := newTestDeviceHandler(t, ctrl, viper.New())
	m.EXPECT().DeviceByKey(gomock.Any(), "1").Return(sampleDevice(), nil)
	w := doDeviceReq(h, http.MethodGet, "/devices/1", nil, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("got %d", w.Code)
	}
}

func TestDeviceHandler_GetDeviceByKey(t *testing.T) {
	ctrl := gomock.NewController(t)
	h, m := newTestDeviceHandler(t, ctrl, viper.New())
	m.EXPECT().DeviceByKey(gomock.Any(), "dk1").Return(sampleDevice(), nil)
	w := doDeviceReq(h, http.MethodGet, "/devices/key/dk1", nil, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("got %d", w.Code)
	}
}

func TestDeviceHandler_ListDevices(t *testing.T) {
	ctrl := gomock.NewController(t)
	h, m := newTestDeviceHandler(t, ctrl, viper.New())
	m.EXPECT().ListDevices(gomock.Any(), gomock.Any()).
		Return([]model.Device{*sampleDevice()}, int64(1), nil)
	w := doDeviceReq(h, http.MethodGet, "/devices?productId=2&searchText=q&enabled=true", nil, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("got %d", w.Code)
	}
}

func TestDeviceHandler_UpdateDevice(t *testing.T) {
	ctrl := gomock.NewController(t)
	h, m := newTestDeviceHandler(t, ctrl, viper.New())
	m.EXPECT().UpdateDeviceByKey(gomock.Any(), "1", "n", "").Return(sampleDevice(), nil)
	w := doDeviceReq(h, http.MethodPut, "/devices/1", []byte(`{"name":"n"}`), nil)
	if w.Code != http.StatusOK {
		t.Fatalf("got %d", w.Code)
	}
}

func TestDeviceHandler_DeleteDevice(t *testing.T) {
	ctrl := gomock.NewController(t)
	h, m := newTestDeviceHandler(t, ctrl, viper.New())
	m.EXPECT().DeleteDeviceByKey(gomock.Any(), "1").Return(nil)
	w := doDeviceReq(h, http.MethodDelete, "/devices/1", nil, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("got %d", w.Code)
	}
}

func TestDeviceHandler_Activate(t *testing.T) {
	ctrl := gomock.NewController(t)
	h, m := newTestDeviceHandler(t, ctrl, viper.New())
	m.EXPECT().ActivateByKey(gomock.Any(), "1").Return(sampleDevice(), nil)
	w := doDeviceReq(h, http.MethodPost, "/devices/1/activate", nil, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("got %d", w.Code)
	}
}

func TestDeviceHandler_Enabled(t *testing.T) {
	ctrl := gomock.NewController(t)
	h, m := newTestDeviceHandler(t, ctrl, viper.New())
	m.EXPECT().SetEnabledByKey(gomock.Any(), "1", true).Return(sampleDevice(), nil)
	w := doDeviceReq(h, http.MethodPost, "/devices/1/enabled", []byte(`{"enabled":true}`), nil)
	if w.Code != http.StatusOK {
		t.Fatalf("got %d", w.Code)
	}
}

func TestDeviceHandler_Stats(t *testing.T) {
	ctrl := gomock.NewController(t)
	h, m := newTestDeviceHandler(t, ctrl, viper.New())
	m.EXPECT().Stats(gomock.Any()).Return(service.DeviceStatistics{TotalDevices: 5, ActivatedDevices: 1, OnlineDevices: 2, OfflineDevices: 1, InactiveDevices: 1}, nil)
	w := doDeviceReq(h, http.MethodGet, "/devices/statistics", nil, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("got %d", w.Code)
	}
}

func TestDeviceHandler_Telemetry(t *testing.T) {
	ctrl := gomock.NewController(t)
	h, m := newTestDeviceHandler(t, ctrl, viper.New())
	m.EXPECT().Telemetry(gomock.Any(), "1").Return("{}", nil)
	w := doDeviceReq(h, http.MethodGet, "/devices/1/telemetry", nil, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("got %d", w.Code)
	}
}

func TestDeviceHandler_GetTags(t *testing.T) {
	ctrl := gomock.NewController(t)
	h, m := newTestDeviceHandler(t, ctrl, viper.New())
	m.EXPECT().Tags(gomock.Any(), "1").Return([]model.DeviceTag{{ID: 1, Key: "k", Value: "v"}}, nil)
	w := doDeviceReq(h, http.MethodGet, "/devices/1/tags", nil, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("got %d", w.Code)
	}
}

func TestDeviceHandler_PutTags(t *testing.T) {
	ctrl := gomock.NewController(t)
	h, m := newTestDeviceHandler(t, ctrl, viper.New())
	m.EXPECT().SetTags(gomock.Any(), "1", map[string]string{"k": "v"}, true).Return([]model.DeviceTag{{ID: 1, Key: "k", Value: "v"}}, nil)
	w := doDeviceReq(h, http.MethodPut, "/devices/1/tags", []byte(`{"tags":{"k":"v"}}`), nil)
	if w.Code != http.StatusOK {
		t.Fatalf("got %d", w.Code)
	}
}

func TestDeviceHandler_PostTags(t *testing.T) {
	ctrl := gomock.NewController(t)
	h, m := newTestDeviceHandler(t, ctrl, viper.New())
	m.EXPECT().SetTags(gomock.Any(), "1", map[string]string{"k": "v"}, false).Return([]model.DeviceTag{{ID: 1, Key: "k", Value: "v"}}, nil)
	w := doDeviceReq(h, http.MethodPost, "/devices/1/tags", []byte(`{"tags":{"k":"v"}}`), nil)
	if w.Code != http.StatusOK {
		t.Fatalf("got %d", w.Code)
	}
}

func TestDeviceHandler_DeleteTags(t *testing.T) {
	ctrl := gomock.NewController(t)
	h, m := newTestDeviceHandler(t, ctrl, viper.New())
	m.EXPECT().RemoveTags(gomock.Any(), "1", []string{"k"}).Return(nil)
	w := doDeviceReq(h, http.MethodDelete, "/devices/1/tags", []byte(`{"keys":["k"]}`), nil)
	if w.Code != http.StatusOK {
		t.Fatalf("got %d", w.Code)
	}
}

func TestDeviceHandler_GetShadow(t *testing.T) {
	ctrl := gomock.NewController(t)
	h, m := newTestDeviceHandler(t, ctrl, viper.New())
	m.EXPECT().Shadow(gomock.Any(), "1").Return(&model.DeviceShadow{Desired: "{}", Reported: "{}", Metadata: "{}", Version: 1}, nil)
	w := doDeviceReq(h, http.MethodGet, "/devices/1/shadow", nil, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("got %d", w.Code)
	}
}

func TestDeviceHandler_Desired(t *testing.T) {
	ctrl := gomock.NewController(t)
	h, m := newTestDeviceHandler(t, ctrl, viper.New())
	m.EXPECT().MutateShadow(gomock.Any(), "1", int64(1), "app", gomock.Any(), gomock.Nil(), false).
		Return(&model.DeviceShadow{Desired: `{"a":1}`, Reported: "{}", Metadata: "{}", Version: 2}, nil)
	w := doDeviceReq(h, http.MethodPut, "/devices/1/shadow/desired", []byte(`{"desired":{"a":1},"version":1}`), nil)
	if w.Code != http.StatusOK {
		t.Fatalf("got %d", w.Code)
	}
}

func TestDeviceHandler_ClearDesired(t *testing.T) {
	ctrl := gomock.NewController(t)
	h, m := newTestDeviceHandler(t, ctrl, viper.New())
	m.EXPECT().MutateShadow(gomock.Any(), "1", int64(1), "app", gomock.Nil(), gomock.Nil(), true).
		Return(&model.DeviceShadow{Desired: "{}", Reported: "{}", Metadata: "{}", Version: 2}, nil)
	w := doDeviceReq(h, http.MethodDelete, "/devices/1/shadow/desired", []byte(`{"version":1}`), nil)
	if w.Code != http.StatusOK {
		t.Fatalf("got %d", w.Code)
	}
}

func TestDeviceHandler_History(t *testing.T) {
	ctrl := gomock.NewController(t)
	h, m := newTestDeviceHandler(t, ctrl, viper.New())
	m.EXPECT().ShadowHistory(gomock.Any(), "1").Return([]model.DeviceShadowHistory{{ID: 1, Desired: "{}", Reported: "{}", Version: 1}}, nil)
	w := doDeviceReq(h, http.MethodGet, "/devices/1/shadow/history", nil, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("got %d", w.Code)
	}
}

func TestDeviceHandler_SimulatePush(t *testing.T) {
	ctrl := gomock.NewController(t)
	h, m := newTestDeviceHandler(t, ctrl, viper.New())
	m.EXPECT().SimulatePush(gomock.Any(), "1", "x", "u1").Return(&model.DevicePushRecord{ID: 1}, nil)
	w := doDeviceReq(h, http.MethodPost, "/devices/1/simulate-push", []byte(`{"payload":"x"}`), map[string]string{"X-User-ID": "u1"})
	if w.Code != http.StatusOK {
		t.Fatalf("got %d", w.Code)
	}
}

func TestDeviceHandler_PushRecords(t *testing.T) {
	ctrl := gomock.NewController(t)
	h, m := newTestDeviceHandler(t, ctrl, viper.New())
	m.EXPECT().ListPushRecords(gomock.Any(), "1", 1, 10, "op", "ok").Return([]model.DevicePushRecord{{ID: 1}}, int64(1), nil)
	w := doDeviceReq(h, http.MethodGet, "/devices/1/push-records?operationType=op&status=ok", nil, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("got %d", w.Code)
	}
}

func TestDeviceHandler_PushRecord(t *testing.T) {
	ctrl := gomock.NewController(t)
	h, m := newTestDeviceHandler(t, ctrl, viper.New())
	m.EXPECT().PushRecord(gomock.Any(), int64(9)).Return(&model.DevicePushRecord{ID: 9}, nil)
	w := doDeviceReq(h, http.MethodGet, "/devices/push-records/9", nil, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("got %d", w.Code)
	}
}

func TestDeviceHandler_PushRecord_InvalidID(t *testing.T) {
	ctrl := gomock.NewController(t)
	h, _ := newTestDeviceHandler(t, ctrl, viper.New())
	w := doDeviceReq(h, http.MethodGet, "/devices/push-records/abc", nil, nil)
	if w.Code == http.StatusOK {
		t.Fatalf("expected error")
	}
}

func TestDeviceHandler_ClearPushRecords(t *testing.T) {
	ctrl := gomock.NewController(t)
	h, m := newTestDeviceHandler(t, ctrl, viper.New())
	m.EXPECT().ClearPushRecords(gomock.Any(), "1", gomock.Any()).Return(int64(3), nil)
	w := doDeviceReq(h, http.MethodDelete, "/devices/1/push-records?beforeTimestamp=1700000000000", nil, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("got %d", w.Code)
	}
}

func TestDeviceHandler_BatchTemplate(t *testing.T) {
	ctrl := gomock.NewController(t)
	h, m := newTestDeviceHandler(t, ctrl, viper.New())
	m.EXPECT().BatchTemplate().Return([]byte("xlsx"), nil)
	w := doDeviceReq(h, http.MethodGet, "/devices/batch/template", nil, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("got %d", w.Code)
	}
}

func TestDeviceHandler_BatchUpload(t *testing.T) {
	ctrl := gomock.NewController(t)
	h, m := newTestDeviceHandler(t, ctrl, viper.New())
	m.EXPECT().BatchCreate(gomock.Any(), gomock.Any()).Return(2, nil, nil)
	body := &bytes.Buffer{}
	fw := multipart.NewWriter(body)
	part, _ := fw.CreateFormFile("file", "t.xlsx")
	part.Write([]byte("xlsx"))
	fw.Close()
	gin.SetMode(gin.TestMode)
	r := gin.New()
	mountDevice(r, h)
	req := httptest.NewRequest(http.MethodPost, "/devices/batch/upload", body)
	req.Header.Set("Content-Type", fw.FormDataContentType())
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("got %d body %s", w.Code, w.Body.String())
	}
}

func TestDeviceHandler_BatchUpload_NoFile(t *testing.T) {
	ctrl := gomock.NewController(t)
	h, _ := newTestDeviceHandler(t, ctrl, viper.New())
	w := doDeviceReq(h, http.MethodPost, "/devices/batch/upload", []byte(``), nil)
	if w.Code == http.StatusOK {
		t.Fatalf("expected error")
	}
}

func TestDeviceHandler_ServiceError(t *testing.T) {
	ctrl := gomock.NewController(t)
	h, m := newTestDeviceHandler(t, ctrl, viper.New())
	m.EXPECT().DeviceByKey(gomock.Any(), "1").Return(nil, repository.ErrNotFound)
	w := doDeviceReq(h, http.MethodGet, "/devices/1", nil, nil)
	if w.Code == http.StatusOK {
		t.Fatalf("expected error")
	}
}

func TestDeviceHandler_ClearPushRecords_RejectsInvalidQuery(t *testing.T) {
	for _, value := range []string{"abc", "-1", "0", "9223372036854775808"} {
		t.Run(value, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			h, _ := newTestDeviceHandler(t, ctrl, viper.New())
			w := doDeviceReq(h, http.MethodDelete, "/devices/1/push-records?beforeTimestamp="+value, nil, nil)
			if w.Code != http.StatusBadRequest {
				t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
			}
		})
	}
}

func TestDeviceHandler_ClearDesired_RejectsInvalidBody(t *testing.T) {
	for _, body := range []string{`{bad`, `{"version":"bad"}`} {
		t.Run(body, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			h, _ := newTestDeviceHandler(t, ctrl, viper.New())
			w := doDeviceReq(h, http.MethodDelete, "/devices/1/shadow/desired", []byte(body), nil)
			if w.Code != http.StatusBadRequest {
				t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
			}
		})
	}
}
