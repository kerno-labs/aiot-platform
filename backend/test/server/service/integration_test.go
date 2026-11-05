package service_test

import (
	"context"
	"testing"
	"time"

	"aiot-backend/internal/dto"
	"aiot-backend/internal/model"
	"aiot-backend/internal/tenant"
	"aiot-backend/test/server/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func ctx() context.Context {
	return tenant.WithOrganization(context.Background(), "org-1")
}

func TestIntegrationDeviceService_CreateDevice(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	device := &model.Device{Name: "New Device", ProductID: 1, OrganizationID: "org-1"}
	result, err := svc.CreateDevice(ctx(), device)
	require.NoError(t, err)
	assert.NotZero(t, result.ID)
}

func TestIntegrationDeviceService_Device(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	device, err := svc.Device(ctx(), 1)
	require.NoError(t, err)
	assert.Equal(t, "D001", device.DeviceKey)
}

func TestIntegrationDeviceService_DeviceByKey(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	device, err := svc.DeviceByKey(ctx(), "D001")
	require.NoError(t, err)
	assert.Equal(t, int64(1), device.ID)
}

func TestIntegrationDeviceService_ListDevices(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	devices, total, err := svc.ListDevices(ctx(), dto.ListDevicesQuery{Page: 1, PageSize: 10})
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Len(t, devices, 1)
}

func TestIntegrationDeviceService_ListDevices_WithSearch(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	devices, _, err := svc.ListDevices(ctx(), dto.ListDevicesQuery{Page: 1, PageSize: 10, Search: "Test"})
	require.NoError(t, err)
	assert.Len(t, devices, 1)
}

func TestIntegrationDeviceService_ListDevices_WithProductID(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	devices, _, err := svc.ListDevices(ctx(), dto.ListDevicesQuery{Page: 1, PageSize: 10, ProductID: 1})
	require.NoError(t, err)
	assert.Len(t, devices, 1)
}

func TestIntegrationDeviceService_ListDevices_WithState(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	devices, _, err := svc.ListDevices(ctx(), dto.ListDevicesQuery{Page: 1, PageSize: 10, States: []int{model.DeviceStateOnline}})
	require.NoError(t, err)
	assert.Len(t, devices, 1)
}

func TestIntegrationDeviceService_ListDevices_WithEnabled(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	enabled := true
	devices, _, err := svc.ListDevices(ctx(), dto.ListDevicesQuery{Page: 1, PageSize: 10, Enabled: &enabled})
	require.NoError(t, err)
	assert.Len(t, devices, 1)
}

func TestIntegrationDeviceService_UpdateDevice(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	device, err := svc.UpdateDevice(ctx(), 1, "Updated Device", nil)
	require.NoError(t, err)
	assert.Equal(t, "Updated Device", device.Name)
}

func TestIntegrationDeviceService_Activate(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	db.Model(&model.DeviceState{}).Where("device_key = ?", "D001").Update("state", model.DeviceStateInactive)
	svc := testutil.NewTestDeviceService(db)

	device, err := svc.Activate(ctx(), 1)
	require.NoError(t, err)
	assert.NotNil(t, device)
}

func TestIntegrationDeviceService_SetEnabled(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	device, err := svc.SetEnabled(ctx(), 1, false)
	require.NoError(t, err)
	assert.False(t, device.Enabled)
}

func TestIntegrationDeviceService_Delete(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	err := svc.DeleteDevice(ctx(), 1)
	require.NoError(t, err)

	_, err = svc.Device(ctx(), 1)
	require.Error(t, err)
}

func TestIntegrationDeviceService_Tags(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	tags, err := svc.Tags(ctx(), "D001")
	require.NoError(t, err)
	assert.NotNil(t, tags)
}

func TestIntegrationDeviceService_SetAndRemoveTags(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	tags, err := svc.SetTags(ctx(), "D001", map[string]string{"region": "us-east", "env": "prod"}, true)
	require.NoError(t, err)
	assert.Len(t, tags, 2)

	err = svc.RemoveTags(ctx(), "D001", []string{"region"})
	require.NoError(t, err)

	tags, err = svc.Tags(ctx(), "D001")
	require.NoError(t, err)
	assert.Len(t, tags, 1)
}

func TestIntegrationDeviceService_SetTags_NoReplace(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	_, err := svc.SetTags(ctx(), "D001", map[string]string{"region": "us-east"}, false)
	require.NoError(t, err)
}

func TestIntegrationDeviceService_ShadowAndMutate(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	// Mutate creates shadow if needed, version must be 0 for new shadow
	desired := map[string]any{"temperature": 25}
	shadow, err := svc.MutateShadow(ctx(), "D001", 0, "app", &desired, nil, false)
	require.NoError(t, err)
	assert.NotNil(t, shadow)

	shadow2, err := svc.Shadow(ctx(), "D001")
	require.NoError(t, err)
	assert.NotNil(t, shadow2)
}

func TestIntegrationDeviceService_MutateReported(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	reported := map[string]any{"status": "online"}
	shadow, err := svc.MutateShadow(ctx(), "D001", 0, "device", nil, &reported, false)
	require.NoError(t, err)
	assert.NotNil(t, shadow)
}

func TestIntegrationDeviceService_MutateClearDesired(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	// First create with desired
	desired := map[string]any{"temp": 25}
	shadow, err := svc.MutateShadow(ctx(), "D001", 0, "app", &desired, nil, false)
	require.NoError(t, err)

	// Then clear
	shadow2, err := svc.MutateShadow(ctx(), "D001", shadow.Version, "app", nil, nil, true)
	require.NoError(t, err)
	assert.NotNil(t, shadow2)
}

func TestIntegrationDeviceService_ShadowHistory(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	history, err := svc.ShadowHistory(ctx(), "D001")
	require.NoError(t, err)
	assert.NotNil(t, history)
}

func TestIntegrationDeviceService_Stats(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	stats, err := svc.Stats(ctx())
	require.NoError(t, err)
	assert.Equal(t, int64(1), stats.TotalDevices)
	assert.Equal(t, int64(1), stats.OnlineDevices)
}

func TestIntegrationDeviceService_BatchTemplate(t *testing.T) {
	svc := testutil.NewTestDeviceService(nil)

	template, err := svc.BatchTemplate()
	require.NoError(t, err)
	assert.NotNil(t, template)
	assert.True(t, len(template) > 0)
}

func TestIntegrationDeviceService_PushRecords(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	records, total, err := svc.ListPushRecords(ctx(), "D001", 1, 10, "", "")
	require.NoError(t, err)
	assert.Equal(t, int64(0), total)
	assert.NotNil(t, records)
}

func TestIntegrationDeviceService_PushRecord_NotFound(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestDeviceService(db)

	_, err := svc.PushRecord(ctx(), 999)
	assert.Error(t, err)
}

func TestIntegrationDeviceService_SimulatePush(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	record, err := svc.SimulatePush(ctx(), "D001", `{"temp": 25}`, "test")
	require.NoError(t, err)
	assert.NotNil(t, record)

	// Verify it was saved
	records, total, err := svc.ListPushRecords(ctx(), "D001", 1, 10, "", "")
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Len(t, records, 1)
}

func TestIntegrationDeviceService_ClearPushRecords(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	// Create some records
	_, err := svc.SimulatePush(ctx(), "D001", `{"temp": 25}`, "test")
	require.NoError(t, err)

	// Clear them
	now := time.Now()
	count, err := svc.ClearPushRecords(ctx(), "D001", &now)
	require.NoError(t, err)
	assert.Equal(t, int64(1), count)
}

func TestIntegrationDeviceService_Telemetry_NoRedis(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	_, err := svc.Telemetry(ctx(), "D001")
	assert.Error(t, err)
}

func TestIntegrationProductService_CRUD(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestProductService(db)

	// Get
	product, err := svc.Get(ctx(), 1)
	require.NoError(t, err)
	assert.Equal(t, "P001", product.ProductKey)

	// GetByKey
	product2, err := svc.GetByKey(ctx(), "P001")
	require.NoError(t, err)
	assert.Equal(t, int64(1), product2.ID)

	// List
	products, total, err := svc.List(ctx(), 1, 10, "", "", "")
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Len(t, products, 1)

	// Create
	newProduct := &model.Product{ProductKey: "P002", Name: "New Product", OrganizationID: "org-1"}
	result, err := svc.Create(ctx(), newProduct)
	require.NoError(t, err)
	assert.NotZero(t, result.ID)

	// Save
	product.Name = "Updated"
	err = svc.Save(ctx(), product)
	require.NoError(t, err)

	// Delete new product (no devices)
	err = svc.DeleteByKey(ctx(), newProduct.ProductKey)
	require.NoError(t, err)

	_, err = svc.GetByKey(ctx(), newProduct.ProductKey)
	require.Error(t, err)
}

func TestIntegrationOTAService_CRUD(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestOTATotalService(db)

	// List empty
	packages, total, err := svc.List(ctx(), 1, 10)
	require.NoError(t, err)
	assert.Equal(t, int64(0), total)
	assert.NotNil(t, packages)

	// Get not found
	_, err = svc.Get(ctx(), "nonexistent-uuid")
	assert.Error(t, err)

	// Create
	pkg := &model.OTAPackage{PackageName: "firmware-1", Version: "1.0.0", OrganizationID: "org-1"}
	err = svc.Create(ctx(), pkg, "P001")
	require.NoError(t, err)

	// List again
	packages, total, err = svc.List(ctx(), 1, 10)
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)

	// Get
	pkg2, err := svc.Get(ctx(), pkg.UUID)
	require.NoError(t, err)
	assert.Equal(t, "firmware-1", pkg2.PackageName)

	// Update
	pkg.Version = "2.0.0"
	err = svc.Update(ctx(), pkg)
	require.NoError(t, err)

	// Delete
	err = svc.Delete(ctx(), pkg.UUID)
	require.NoError(t, err)
}

func TestIntegrationOTAService_BatchesAndDeployments(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestOTATotalService(db)

	// Create a package first
	pkg := &model.OTAPackage{PackageName: "firmware-1", Version: "1.0.0", OrganizationID: "org-1"}
	err := svc.Create(ctx(), pkg, "P001")
	require.NoError(t, err)

	// Batches
	batches, err := svc.Batches(ctx(), pkg.UUID)
	require.NoError(t, err)
	assert.NotNil(t, batches)

	// Deployments
	deployments, total, err := svc.Deployments(ctx(), pkg.UUID, 1, 10, "")
	require.NoError(t, err)
	assert.Equal(t, int64(0), total)
	assert.NotNil(t, deployments)
}

func TestIntegrationDeviceEventService_List(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceEventService(db)

	events, total, err := svc.List(ctx(), dto.ListDeviceEventsQuery{Page: 1, PageSize: 10})
	require.NoError(t, err)
	assert.Equal(t, int64(0), total)
	_ = events // May be nil for empty results
}
