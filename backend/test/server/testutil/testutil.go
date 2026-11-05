package testutil

import (
	"context"
	"testing"

	"aiot-backend/internal/model"
	"aiot-backend/internal/repository"
	"aiot-backend/internal/service"
	"aiot-backend/internal/tenant"

	"github.com/glebarez/sqlite"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func SetupTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	err = db.AutoMigrate(
		&model.Product{},
		&model.Category{},
		&model.ProductProtocol{},
		&model.ProductTSL{},
		&model.Device{},
		&model.DeviceCredential{},
		&model.DeviceState{},
		&model.DeviceTag{},
		&model.DeviceShadow{},
		&model.DeviceShadowHistory{},
		&model.DeviceEvent{},
		&model.DeviceServiceInvocation{},
		&model.DevicePushRecord{},
		&model.OTAPackage{},
		&model.UpgradeBatch{},
		&model.DeviceUpgradeStatus{},
	)
	require.NoError(t, err)

	return db
}

func SeedTestData(t *testing.T, db *gorm.DB) {
	t.Helper()
	product := &model.Product{ID: 1, ProductKey: "P001", Name: "Test Product", OrganizationID: "org-1"}
	db.Create(product)

	device := &model.Device{ID: 1, DeviceKey: "D001", Name: "Test Device", ProductID: 1, OrganizationID: "org-1", Enabled: true}
	db.Create(device)

	db.Create(&model.DeviceState{ID: 1, DeviceKey: "D001", State: model.DeviceStateOnline})
}

func NewTestRepositories(db *gorm.DB) (*repository.DeviceRepository, *repository.ProductRepository, *repository.DeviceTagRepository, *repository.DeviceShadowRepository, *repository.PushRecordRepository) {
	deviceRepo := repository.NewDeviceRepository(db, nil)
	productRepo := repository.NewProductRepository(db)
	tagRepo := repository.NewDeviceTagRepository(db)
	shadowRepo := repository.NewDeviceShadowRepository(db)
	pushRepo := repository.NewPushRecordRepository(db)

	return deviceRepo, productRepo, tagRepo, shadowRepo, pushRepo
}

func NewTestDeviceService(db *gorm.DB) *service.DeviceService {
	deviceRepo, productRepo, tagRepo, shadowRepo, pushRepo := NewTestRepositories(db)
	config := viper.New()
	config.Set("security.device_credentials_key", "test-device-credentials-key")
	return service.NewDeviceService(deviceRepo, productRepo, tagRepo, shadowRepo, pushRepo, config)
}

func NewTestProductService(db *gorm.DB) *service.ProductService {
	productRepo := repository.NewProductRepository(db)
	return service.NewProductService(productRepo)
}

func NewTestOTATotalService(db *gorm.DB) *service.OTAService {
	otaRepo := repository.NewOTARepository(db)
	productRepo := repository.NewProductRepository(db)
	deviceRepo := repository.NewDeviceRepository(db, nil)
	return service.NewOTAService(otaRepo, productRepo, deviceRepo, nil)
}

func NewTestDeviceEventService(db *gorm.DB) *service.DeviceEventService {
	eventRepo := repository.NewDeviceEventRepository(db)
	return service.NewDeviceEventService(eventRepo)
}

func NewTestThingModelDataService(db *gorm.DB) *service.ThingModelDataService {
	invocations := repository.NewDeviceServiceInvocationRepository(db)
	deviceRepo := repository.NewDeviceRepository(db, nil)
	tslRepo := repository.NewProductTSLRepository(db)
	return service.NewThingModelDataService(invocations, deviceRepo, tslRepo, nil, nil)
}

func NewTestProductTSLService(db *gorm.DB) *service.ProductTSLService {
	productRepo := repository.NewProductRepository(db)
	tslRepo := repository.NewProductTSLRepository(db)
	return service.NewProductTSLService(productRepo, tslRepo)
}

func ContextWithOrganization(ctx context.Context, organizationID string) context.Context {
	return tenant.WithOrganization(ctx, organizationID)
}
