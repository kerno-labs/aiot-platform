package service

import (
	"context"
	"testing"

	"aiot-backend/internal/event"
	"aiot-backend/internal/model"
	"aiot-backend/internal/repository"
	"aiot-backend/internal/tenant"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func newOTATestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)
	require.NoError(t, db.AutoMigrate(
		&model.OTAPackage{}, &model.DeviceUpgradeStatus{}, &model.UpgradeBatch{},
		&model.Product{}, &model.ProductProtocol{}, &model.Device{}, &model.DeviceState{},
	))
	return db
}

func newOTAServiceForTest(t *testing.T) (*OTAService, *gorm.DB) {
	db := newOTATestDB(t)
	repo := repository.NewOTARepository(db)
	productRepo := repository.NewProductRepository(db)
	deviceRepo := repository.NewDeviceRepository(db, nil)
	return NewOTAService(repo, productRepo, deviceRepo, nil), db
}

func seedOTAProductAndDevices(t *testing.T, db *gorm.DB) (int64, []string) {
	t.Helper()
	ctx := tenant.WithOrganization(context.Background(), "org-1")
	product := &model.Product{ProductKey: "P001", Name: "Sensor", OrganizationID: "org-1"}
	require.NoError(t, db.WithContext(ctx).Create(product).Error)
	dev1 := &model.Device{DeviceKey: "D1", Name: "d1", ProductID: product.ID, OrganizationID: "org-1"}
	dev2 := &model.Device{DeviceKey: "D2", Name: "d2", ProductID: product.ID, OrganizationID: "org-1"}
	require.NoError(t, db.WithContext(ctx).Create(dev1).Error)
	require.NoError(t, db.WithContext(ctx).Create(dev2).Error)
	return product.ID, []string{"D1", "D2"}
}

func TestOTAService_BatchUpgradeAndReportStatus(t *testing.T) {
	ctx := tenant.WithOrganization(context.Background(), "org-1")
	svc, db := newOTAServiceForTest(t)
	_, keys := seedOTAProductAndDevices(t, db)

	pkg := &model.OTAPackage{PackageName: "fw-1", Version: "1.0.0", ProductID: 1, Status: "draft"}
	require.NoError(t, svc.Create(ctx, pkg, "P001"))

	// BatchUpgrade creates batch and records, and marks package deploying.
	batch, err := svc.BatchUpgrade(ctx, pkg.UUID, keys)
	require.NoError(t, err)
	require.EqualValues(t, 2, batch.TargetDeviceCount)
	got, _ := svc.Get(ctx, pkg.UUID)
	require.Equal(t, "deploying", got.Status)

	// PendingPackageIDs should include this package.
	pending, err := svc.repo.PendingPackageIDs(ctx)
	require.NoError(t, err)
	require.Contains(t, pending, pkg.ID)
}

func TestOTAService_ReportStatusAggregation(t *testing.T) {
	ctx := tenant.WithOrganization(context.Background(), "org-1")
	svc, db := newOTAServiceForTest(t)
	_, keys := seedOTAProductAndDevices(t, db)

	pkg := &model.OTAPackage{PackageName: "fw-2", Version: "1.0.0", ProductID: 1, Status: "draft"}
	require.NoError(t, svc.Create(ctx, pkg, "P001"))
	_, err := svc.BatchUpgrade(ctx, pkg.UUID, keys)
	require.NoError(t, err)

	// One success, one still pending -> package stays deploying.
	require.NoError(t, svc.ReportStatus(ctx, pkg.UUID, "D1", "success"))
	got, _ := svc.Get(ctx, pkg.UUID)
	require.Equal(t, "deploying", got.Status)

	// All success -> package becomes success.
	require.NoError(t, svc.ReportStatus(ctx, pkg.UUID, "D2", "success"))
	got, _ = svc.Get(ctx, pkg.UUID)
	require.Equal(t, "success", got.Status)
}

func TestOTAService_ReportStatusPartial(t *testing.T) {
	ctx := tenant.WithOrganization(context.Background(), "org-1")
	svc, db := newOTAServiceForTest(t)
	_, keys := seedOTAProductAndDevices(t, db)

	pkg := &model.OTAPackage{PackageName: "fw-3", Version: "1.0.0", ProductID: 1, Status: "draft"}
	require.NoError(t, svc.Create(ctx, pkg, "P001"))
	_, err := svc.BatchUpgrade(ctx, pkg.UUID, keys)
	require.NoError(t, err)

	require.NoError(t, svc.ReportStatus(ctx, pkg.UUID, "D1", "success"))
	require.NoError(t, svc.ReportStatus(ctx, pkg.UUID, "D2", "failed"))
	got, _ := svc.Get(ctx, pkg.UUID)
	require.Equal(t, "partial", got.Status)
}

func TestOTAService_CancelBatch(t *testing.T) {
	ctx := tenant.WithOrganization(context.Background(), "org-1")
	svc, db := newOTAServiceForTest(t)
	_, keys := seedOTAProductAndDevices(t, db)
	pkg := &model.OTAPackage{PackageName: "fw-cancel", Version: "1.0.0", ProductID: 1, Status: "draft"}
	require.NoError(t, svc.Create(ctx, pkg, "P001"))
	batch, err := svc.BatchUpgrade(ctx, pkg.UUID, keys)
	require.NoError(t, err)
	require.NoError(t, svc.CancelBatch(ctx, pkg.UUID, batch.BatchID))
	var count int64
	require.NoError(t, db.Model(&model.DeviceUpgradeStatus{}).Where("upgrade_batch_id = ? AND status = ?", batch.BatchID, "cancelled").Count(&count).Error)
	require.EqualValues(t, len(keys), count)
}

type mockEventProducer struct {
	published []any
	topics    []event.Topic
}

func (m *mockEventProducer) Publish(ctx context.Context, topic event.Topic, payload any) error {
	m.topics = append(m.topics, topic)
	m.published = append(m.published, payload)
	return nil
}

func (m *mockEventProducer) Close() error {
	return nil
}

func TestOTAService_BatchUpgrade_PublishEvent(t *testing.T) {
	ctx := tenant.WithOrganization(context.Background(), "org-1")
	db := newOTATestDB(t)
	repo := repository.NewOTARepository(db)
	productRepo := repository.NewProductRepository(db)
	deviceRepo := repository.NewDeviceRepository(db, nil)
	mockProd := &mockEventProducer{}
	svc := NewOTAService(repo, productRepo, deviceRepo, mockProd)

	_, keys := seedOTAProductAndDevices(t, db)
	pkg := &model.OTAPackage{PackageName: "fw-publish", Version: "2.0.0", ProductID: 1, FileURL: "http://example.com/fw.bin", FileSize: 1024, Checksum: "sha256sum"}
	require.NoError(t, svc.Create(ctx, pkg, "P001"))

	batch, err := svc.BatchUpgrade(ctx, pkg.UUID, keys)
	require.NoError(t, err)
	require.NotNil(t, batch)
	require.Equal(t, 2, len(mockProd.published))
	require.Equal(t, event.TopicOTAUpgradeCommand, mockProd.topics[0])

	cmd, ok := mockProd.published[0].(*event.OTAUpgradeCommand)
	require.True(t, ok)
	require.Equal(t, batch.BatchID, cmd.BatchID)
	require.Equal(t, "2.0.0", cmd.TargetVersion)
	require.Equal(t, "http://example.com/fw.bin", cmd.DownloadURL)
}

func TestOTAService_BatchUpgrade_ProtocolRouting(t *testing.T) {
	ctx := tenant.WithOrganization(context.Background(), "org-1")
	db := newOTATestDB(t)
	repo := repository.NewOTARepository(db)
	productRepo := repository.NewProductRepository(db)
	deviceRepo := repository.NewDeviceRepository(db, nil)
	mockProd := &mockEventProducer{}
	svc := NewOTAService(repo, productRepo, deviceRepo, mockProd)

	// Create HTTP product & device
	httpProd := &model.Product{ProductKey: "P_HTTP", Name: "HTTP Sensor", OrganizationID: "org-1", AccessProtocol: "http"}
	require.NoError(t, db.WithContext(ctx).Create(httpProd).Error)
	httpDev := &model.Device{DeviceKey: "DEV_HTTP", Name: "http_dev", ProductID: httpProd.ID, OrganizationID: "org-1"}
	require.NoError(t, db.WithContext(ctx).Create(httpDev).Error)

	// Create MQTT product & device
	mqttProd := &model.Product{ProductKey: "P_MQTT", Name: "MQTT Meter", OrganizationID: "org-1", AccessProtocol: "mqtt"}
	require.NoError(t, db.WithContext(ctx).Create(mqttProd).Error)
	mqttDev := &model.Device{DeviceKey: "DEV_MQTT", Name: "mqtt_dev", ProductID: mqttProd.ID, OrganizationID: "org-1"}
	require.NoError(t, db.WithContext(ctx).Create(mqttDev).Error)

	// 1. Batch upgrade on HTTP device -> should NOT publish event
	pkgHTTP := &model.OTAPackage{PackageName: "fw-http", Version: "1.0.0", ProductID: httpProd.ID, FileURL: "http://example.com/http.bin"}
	require.NoError(t, svc.Create(ctx, pkgHTTP, "P_HTTP"))
	_, err := svc.BatchUpgrade(ctx, pkgHTTP.UUID, []string{"DEV_HTTP"})
	require.NoError(t, err)
	require.Equal(t, 0, len(mockProd.published))

	// 2. Batch upgrade on MQTT device -> should publish to TopicOTAUpgradeCommand
	pkgMQTT := &model.OTAPackage{PackageName: "fw-mqtt", Version: "1.0.0", ProductID: mqttProd.ID, FileURL: "http://example.com/mqtt.bin"}
	require.NoError(t, svc.Create(ctx, pkgMQTT, "P_MQTT"))
	_, err = svc.BatchUpgrade(ctx, pkgMQTT.UUID, []string{"DEV_MQTT"})
	require.NoError(t, err)
	require.Equal(t, 1, len(mockProd.published))
	require.Equal(t, event.TopicOTAUpgradeCommand, mockProd.topics[0])
}
