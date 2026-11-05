package service

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"testing"

	"aiot-backend/internal/dto"
	"aiot-backend/internal/model"
	"aiot-backend/internal/repository"
	"aiot-backend/internal/security"
	"aiot-backend/internal/tenant"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/require"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

func newDeviceSvc(t *testing.T) (*DeviceService, *gorm.DB, context.Context) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(
		&model.Product{}, &model.ProductProtocol{}, &model.Device{}, &model.DeviceCredential{}, &model.DeviceState{}, &model.DeviceTag{},
		&model.DeviceShadow{}, &model.DeviceShadowHistory{}, &model.DevicePushRecord{},
	))
	require.NoError(t, db.Create(&model.Product{ID: 1, ProductKey: "P001", Name: "Test", OrganizationID: "org-1"}).Error)
	require.NoError(t, db.Create(&model.Device{ID: 1, DeviceKey: "D001", Name: "Test Device", ProductID: 1, OrganizationID: "org-1", Enabled: true}).Error)
	require.NoError(t, db.Create(&model.DeviceState{ID: 1, DeviceKey: "D001", State: model.DeviceStateOnline}).Error)

	svc := NewDeviceService(
		repository.NewDeviceRepository(db, nil),
		repository.NewProductRepository(db),
		repository.NewDeviceTagRepository(db),
		repository.NewDeviceShadowRepository(db),
		repository.NewPushRecordRepository(db),
		deviceTestConfig(),
	)
	return svc, db, tenant.WithOrganization(context.Background(), "org-1")
}

func deviceTestConfig() *viper.Viper {
	config := viper.New()
	config.Set("security.device_credentials_key", "test-device-credentials-key")
	return config
}

func TestDeviceService_CreateDevice(t *testing.T) {
	svc, db, ctx := newDeviceSvc(t)
	d, err := svc.CreateDevice(ctx, &model.Device{Name: "dev", ProductID: 1})
	require.NoError(t, err)
	require.NotEmpty(t, d.DeviceKey)
	_, parseErr := uuid.Parse(d.DeviceKey)
	require.NoError(t, parseErr)
	require.NotEmpty(t, d.DeviceUUID)
	var credential model.DeviceCredential
	require.NoError(t, db.Where("device_uuid = ?", d.DeviceUUID).First(&credential).Error)
	require.Equal(t, "mqtt", credential.CredentialType)
	require.Equal(t, d.DeviceUUID, credential.Username)
	require.NotEmpty(t, credential.Password)
	require.NotEmpty(t, credential.Salt)
	require.NotEmpty(t, credential.PasswordCiphertext)
	plaintext, err := security.DecryptCredentials(credential.PasswordCiphertext, "test-device-credentials-key")
	require.NoError(t, err)
	hash := sha256.Sum256([]byte(plaintext + credential.Salt))
	require.Equal(t, hex.EncodeToString(hash[:]), credential.Password)
}

func TestDeviceService_CreateDevice_ProductNotFound(t *testing.T) {
	svc, _, ctx := newDeviceSvc(t)
	_, err := svc.CreateDevice(ctx, &model.Device{Name: "dev", ProductID: 999})
	require.Error(t, err)
}

func TestDeviceService_CreateDevice_RequiresCredentialEncryptionKey(t *testing.T) {
	svc, db, ctx := newDeviceSvc(t)
	svc.config = viper.New()

	_, err := svc.CreateDevice(ctx, &model.Device{Name: "missing-key", ProductID: 1})
	require.Error(t, err)

	var deviceCount int64
	require.NoError(t, db.Model(&model.Device{}).Where("name = ?", "missing-key").Count(&deviceCount).Error)
	require.Zero(t, deviceCount)
}

func TestDeviceService_Device(t *testing.T) {
	svc, _, ctx := newDeviceSvc(t)
	d, err := svc.Device(ctx, 1)
	require.NoError(t, err)
	require.Equal(t, "D001", d.DeviceKey)
}

func TestDeviceService_Device_NotFound(t *testing.T) {
	svc, _, ctx := newDeviceSvc(t)
	_, err := svc.Device(ctx, 999)
	require.Error(t, err)
}

func TestDeviceService_DeviceByKey(t *testing.T) {
	svc, _, ctx := newDeviceSvc(t)
	d, err := svc.DeviceByKey(ctx, "D001")
	require.NoError(t, err)
	require.Equal(t, int64(1), d.ID)
}

func TestDeviceService_ListDevices(t *testing.T) {
	svc, _, ctx := newDeviceSvc(t)
	ds, n, err := svc.ListDevices(ctx, dto.ListDevicesQuery{Page: 1, PageSize: 10})
	require.NoError(t, err)
	require.Equal(t, int64(1), n)
	require.Len(t, ds, 1)
}

func TestDeviceService_UpdateDevice(t *testing.T) {
	svc, _, ctx := newDeviceSvc(t)
	d, err := svc.UpdateDevice(ctx, 1, "renamed", nil)
	require.NoError(t, err)
	require.Equal(t, "renamed", d.Name)
}

func TestDeviceService_UpdateDevice_StateTransition(t *testing.T) {
	svc, _, ctx := newDeviceSvc(t)
	offline := model.DeviceStateOffline
	d, err := svc.UpdateDevice(ctx, 1, "", &offline)
	require.NoError(t, err)
	require.Equal(t, model.DeviceStateOffline, d.State.State)
}

func TestDeviceService_UpdateDevice_InvalidTransition(t *testing.T) {
	svc, _, ctx := newDeviceSvc(t)
	inactive := model.DeviceStateInactive
	_, err := svc.UpdateDevice(ctx, 1, "", &inactive)
	require.Error(t, err)
}

func TestDeviceService_Activate(t *testing.T) {
	svc, db, ctx := newDeviceSvc(t)
	require.NoError(t, db.Create(&model.Device{ID: 2, DeviceKey: "D002", Name: "d2", ProductID: 1, OrganizationID: "org-1", Enabled: true}).Error)
	require.NoError(t, db.Create(&model.DeviceState{ID: 2, DeviceKey: "D002", State: model.DeviceStateInactive}).Error)
	d, err := svc.Activate(ctx, 2)
	require.NoError(t, err)
	require.Equal(t, model.DeviceStateOffline, d.State.State)
}

func TestDeviceService_Activate_AlreadyActivated(t *testing.T) {
	svc, _, ctx := newDeviceSvc(t)
	_, err := svc.Activate(ctx, 1)
	require.Error(t, err)
}

func TestDeviceService_SetEnabled(t *testing.T) {
	svc, _, ctx := newDeviceSvc(t)
	d, err := svc.SetEnabled(ctx, 1, false)
	require.NoError(t, err)
	require.False(t, d.Enabled)
}

func TestDeviceService_Stats(t *testing.T) {
	svc, _, ctx := newDeviceSvc(t)
	s, err := svc.Stats(ctx)
	require.NoError(t, err)
	require.Equal(t, int64(1), s.TotalDevices)
}

func TestDeviceService_Tags(t *testing.T) {
	svc, _, ctx := newDeviceSvc(t)
	_, err := svc.SetTags(ctx, "D001", map[string]string{"env": "prod"}, false)
	require.NoError(t, err)
	tags, err := svc.Tags(ctx, "D001")
	require.NoError(t, err)
	require.Len(t, tags, 1)
	require.NoError(t, svc.RemoveTags(ctx, "D001", []string{"env"}))
}

func TestDeviceService_SetTags_InvalidKey(t *testing.T) {
	svc, _, ctx := newDeviceSvc(t)
	_, err := svc.SetTags(ctx, "D001", map[string]string{"": "v"}, false)
	require.Error(t, err)
	require.Error(t, err)
}

func TestDeviceService_Shadow(t *testing.T) {
	svc, _, ctx := newDeviceSvc(t)
	desired := map[string]any{"power": "on"}
	sh, err := svc.MutateShadow(ctx, "D001", 0, "app", &desired, nil, false)
	require.NoError(t, err)
	require.NotZero(t, sh.Version)
	got, err := svc.Shadow(ctx, "D001")
	require.NoError(t, err)
	require.NotNil(t, got)
	hist, err := svc.ShadowHistory(ctx, "D001")
	require.NoError(t, err)
	require.NotNil(t, hist)
}

func TestDeviceService_Telemetry_NoRedis(t *testing.T) {
	svc, _, ctx := newDeviceSvc(t)
	_, err := svc.Telemetry(ctx, "D001")
	require.Error(t, err)
}

func TestDeviceService_Delete(t *testing.T) {
	svc, db, ctx := newDeviceSvc(t)
	created, err := svc.CreateDevice(ctx, &model.Device{Name: "deletable", ProductID: 1})
	require.NoError(t, err)

	require.NoError(t, svc.DeleteDevice(ctx, created.ID))
	_, err = svc.Device(ctx, created.ID)
	require.Error(t, err)

	var credential model.DeviceCredential
	require.NoError(t, db.Where("device_uuid = ?", created.DeviceUUID).First(&credential).Error)
	require.False(t, credential.Enabled)
}

func TestDeviceService_SimulatePush(t *testing.T) {
	svc, _, ctx := newDeviceSvc(t)
	rec, err := svc.SimulatePush(ctx, "D001", "payload", "u1")
	require.NoError(t, err)
	require.Equal(t, "payload", rec.Payload)
	recs, n, err := svc.ListPushRecords(ctx, "D001", 1, 10, "", "")
	require.NoError(t, err)
	require.Equal(t, int64(1), n)
	require.Len(t, recs, 1)
	got, err := svc.PushRecord(ctx, rec.ID)
	require.NoError(t, err)
	require.Equal(t, rec.ID, got.ID)
	deleted, err := svc.ClearPushRecords(ctx, "D001", nil)
	require.NoError(t, err)
	require.Equal(t, int64(1), deleted)
}

func TestDeviceService_BatchTemplate(t *testing.T) {
	svc, _, _ := newDeviceSvc(t)
	b, err := svc.BatchTemplate()
	require.NoError(t, err)
	require.NotEmpty(t, b)
}

func TestDeviceService_BatchCreate(t *testing.T) {
	svc, _, ctx := newDeviceSvc(t)
	f := excelize.NewFile()
	f.SetCellValue("Sheet1", "A1", "productKey")
	f.SetCellValue("Sheet1", "B1", "deviceName")
	f.SetCellValue("Sheet1", "A2", "P001")
	f.SetCellValue("Sheet1", "B2", "NEWDEV")
	var buf bytes.Buffer
	require.NoError(t, f.Write(&buf))
	n, errs, err := svc.BatchCreate(ctx, buf.Bytes())
	require.NoError(t, err)
	require.Equal(t, 1, n)
	require.Empty(t, errs)
}

func TestDeviceService_BatchCreate_NoData(t *testing.T) {
	svc, _, ctx := newDeviceSvc(t)
	_, _, err := svc.BatchCreate(ctx, []byte("not-an-xlsx"))
	require.Error(t, err)
}
