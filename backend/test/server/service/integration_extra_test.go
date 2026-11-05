package service_test

import (
	"bytes"
	"context"
	"testing"
	"time"

	"aiot-backend/internal/dto"
	"aiot-backend/internal/model"
	"aiot-backend/internal/repository"
	"aiot-backend/internal/service"
	"aiot-backend/internal/tenant"
	"aiot-backend/test/server/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/xuri/excelize/v2"
)

func ctx2() context.Context {
	return tenant.WithOrganization(context.Background(), "org-1")
}

func TestIntegrationDeviceService_CreateDevice_WithCustomKey(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	device := &model.Device{Name: "Custom Key", ProductID: 1, OrganizationID: "org-1", DeviceKey: "CUSTOM001"}
	result, err := svc.CreateDevice(ctx2(), device)
	require.NoError(t, err)
	assert.Equal(t, "CUSTOM001", result.DeviceKey)
}

func TestIntegrationDeviceService_CreateDevice_WrongProduct(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	device := &model.Device{Name: "Bad Product", ProductID: 999, OrganizationID: "org-1"}
	_, err := svc.CreateDevice(ctx2(), device)
	assert.Error(t, err)
}

func TestIntegrationDeviceService_Device_NotFound(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestDeviceService(db)

	_, err := svc.Device(ctx2(), 999)
	assert.Error(t, err)
}

func TestIntegrationDeviceService_DeviceByKey_NotFound(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestDeviceService(db)

	_, err := svc.DeviceByKey(ctx2(), "NONEXIST")
	assert.Error(t, err)
}

func TestIntegrationDeviceService_UpdateDevice_InvalidTransition(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	// Device is online (1), trying to go to inactive (2) should fail
	inactive := model.DeviceStateInactive
	_, err := svc.UpdateDevice(ctx2(), 1, "", &inactive)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid status transition")
}

func TestIntegrationDeviceService_UpdateDevice_ValidTransition(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	// Device is online (1), can go to offline (0)
	offline := model.DeviceStateOffline
	device, err := svc.UpdateDevice(ctx2(), 1, "", &offline)
	require.NoError(t, err)
	assert.Equal(t, model.DeviceStateOffline, device.State.State)
}

func TestIntegrationDeviceService_ListDevices_NotFound(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestDeviceService(db)

	devices, total, err := svc.ListDevices(ctx2(), dto.ListDevicesQuery{Page: 1, PageSize: 10, ProductID: 999})
	require.NoError(t, err)
	assert.Equal(t, int64(0), total)
	assert.Empty(t, devices)
}

func TestIntegrationDeviceService_SetTags_InvalidKey(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	_, err := svc.SetTags(ctx2(), "D001", map[string]string{"": "value"}, true)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid tag key")
}

func TestIntegrationDeviceService_SetTags_LongKey(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	longKey := make([]byte, 129)
	for i := range longKey {
		longKey[i] = 'a'
	}
	_, err := svc.SetTags(ctx2(), "D001", map[string]string{string(longKey): "value"}, true)
	assert.Error(t, err)
}

func TestIntegrationDeviceService_Tags_NotFound(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestDeviceService(db)

	_, err := svc.Tags(ctx2(), "D001")
	assert.Error(t, err)
}

func TestIntegrationDeviceService_RemoveTags_NotFound(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestDeviceService(db)

	err := svc.RemoveTags(ctx2(), "D001", []string{"key"})
	assert.Error(t, err)
}

func TestIntegrationDeviceService_SetEnabled_NotFound(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestDeviceService(db)

	_, err := svc.SetEnabled(ctx2(), 999, true)
	assert.Error(t, err)
}

func TestIntegrationDeviceService_DeleteDevice_NotFound(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestDeviceService(db)

	err := svc.DeleteDevice(ctx2(), 999)
	assert.Error(t, err)
}

func TestIntegrationDeviceService_Shadow_NotFound(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestDeviceService(db)

	_, err := svc.Shadow(ctx2(), "D001")
	assert.Error(t, err)
}

func TestIntegrationDeviceService_MutateShadow_NotFound(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestDeviceService(db)

	desired := map[string]any{"key": "val"}
	_, err := svc.MutateShadow(ctx2(), "D001", 0, "app", &desired, nil, false)
	assert.Error(t, err)
}

func TestIntegrationDeviceService_ShadowHistory_NotFound(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestDeviceService(db)

	_, err := svc.ShadowHistory(ctx2(), "D001")
	assert.Error(t, err)
}

func TestIntegrationDeviceService_SimulatePush_NotFound(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestDeviceService(db)

	_, err := svc.SimulatePush(ctx2(), "D001", `{"key":"val"}`, "test")
	assert.Error(t, err)
}

func TestIntegrationDeviceService_ListPushRecords_NotFound(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	records, total, err := svc.ListPushRecords(ctx2(), "D001", 1, 10, "", "")
	require.NoError(t, err)
	assert.Equal(t, int64(0), total)
	assert.Empty(t, records)
}

func TestExtraDeviceService_PushRecord_NotFound(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestDeviceService(db)

	_, err := svc.PushRecord(ctx2(), 999)
	assert.Error(t, err)
}

func TestIntegrationDeviceService_ClearPushRecords_NotFound(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	now := time.Now()
	count, err := svc.ClearPushRecords(ctx2(), "D001", &now)
	require.NoError(t, err)
	assert.Equal(t, int64(0), count)
}

func TestIntegrationDeviceService_Activate_NotFound(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestDeviceService(db)

	_, err := svc.Activate(ctx2(), 999)
	assert.Error(t, err)
}

func TestIntegrationProductService_Get_NotFound(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestProductService(db)

	_, err := svc.Get(ctx2(), 999)
	assert.Error(t, err)
}

func TestIntegrationProductService_GetByKey_NotFound(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestProductService(db)

	_, err := svc.GetByKey(ctx2(), "NONEXIST")
	assert.Error(t, err)
}

func TestIntegrationProductService_Delete_NotFound(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestProductService(db)

	err := svc.DeleteByKey(ctx2(), "NONEXIST")
	assert.Error(t, err)
}

func TestIntegrationOTAService_List_WithPagination(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestOTATotalService(db)

	packages, total, err := svc.List(ctx2(), 1, 5)
	require.NoError(t, err)
	assert.Equal(t, int64(0), total)
	assert.Empty(t, packages)
}

func TestIntegrationOTAService_Batches_Empty(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestOTATotalService(db)

	// Create a package first
	pkg := &model.OTAPackage{PackageName: "firmware-1", Version: "1.0.0", OrganizationID: "org-1"}
	err := svc.Create(ctx2(), pkg, "P001")
	require.NoError(t, err)

	batches, err := svc.Batches(ctx2(), pkg.UUID)
	require.NoError(t, err)
	assert.Empty(t, batches)
}

func TestIntegrationOTAService_Deployments_Empty(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestOTATotalService(db)

	// Create a package first
	pkg := &model.OTAPackage{PackageName: "firmware-1", Version: "1.0.0", OrganizationID: "org-1"}
	err := svc.Create(ctx2(), pkg, "P001")
	require.NoError(t, err)

	deployments, total, err := svc.Deployments(ctx2(), pkg.UUID, 1, 10, "")
	require.NoError(t, err)
	assert.Equal(t, int64(0), total)
	assert.Empty(t, deployments)
}

func TestIntegrationOTAService_Delete_NotFound(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestOTATotalService(db)

	err := svc.Delete(ctx2(), "nonexistent-uuid")
	assert.Error(t, err)
}

func TestIntegrationOTAService_Statistics_NotFound(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestOTATotalService(db)

	_, err := svc.Statistics(ctx2(), "P001")
	assert.Error(t, err)
}

func TestIntegrationDeviceService_ListPushRecords_WithFilters(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	// Create push records
	_, err := svc.SimulatePush(ctx2(), "D001", `{"temp": 25}`, "test")
	require.NoError(t, err)

	// List with status filter
	records, total, err := svc.ListPushRecords(ctx2(), "D001", 1, 10, "", "")
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Len(t, records, 1)

	// List with operationType filter
	records, total, err = svc.ListPushRecords(ctx2(), "D001", 1, 10, "push", "")
	require.NoError(t, err)
	assert.Equal(t, int64(0), total) // No records with "push" operationType

	_ = records
}

func TestIntegrationDeviceService_BatchCreate_InvalidContent(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	// Invalid Excel content
	n, errs, err := svc.BatchCreate(ctx2(), []byte("not an excel file"))
	assert.Error(t, err)
	assert.Equal(t, 0, n)
	assert.Empty(t, errs)
}

func TestIntegrationDeviceEventService_List_WithKeyword(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceEventService(db)

	events, total, err := svc.List(ctx2(), dto.ListDeviceEventsQuery{Page: 1, PageSize: 10, Keyword: "test"})
	require.NoError(t, err)
	assert.Equal(t, int64(0), total)
	_ = events
}

func TestIntegrationDeviceEventService_List_WithDeviceKey(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceEventService(db)

	events, total, err := svc.List(ctx2(), dto.ListDeviceEventsQuery{Page: 1, PageSize: 10, DeviceKey: "D001"})
	require.NoError(t, err)
	assert.Equal(t, int64(0), total)
	_ = events
}

func TestIntegrationDeviceEventService_List_WithEventType(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceEventService(db)

	events, total, err := svc.List(ctx2(), dto.ListDeviceEventsQuery{Page: 1, PageSize: 10, EventType: "temperature"})
	require.NoError(t, err)
	assert.Equal(t, int64(0), total)
	_ = events
}

func TestIntegrationDeviceEventService_Record_Valid(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	eventRepo := repository.NewDeviceEventRepository(db)
	svc := testutil.NewTestDeviceEventService(db)

	err := eventRepo.Create(ctx2(), &model.DeviceEvent{
		UUID:            "evt-01",
		DeviceKey:       "D001",
		ProductKey:      "P001",
		EventIdentifier: "temperature_alarm",
		EventType:       "alert",
		EventAt:         1726315200000,
		Data:            `{"temp":25}`,
	})
	require.NoError(t, err)

	events, total, err := svc.List(ctx2(), dto.ListDeviceEventsQuery{Page: 1, PageSize: 10, DeviceKey: "D001", EventType: "alert"})
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Len(t, events, 1)
}

func TestIntegrationDeviceService_Activate_AlreadyActivated(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	// Device is already "online", activating should fail
	_, err := svc.Activate(ctx2(), 1)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "device already activated")
}

func TestIntegrationDeviceService_UpdateDevice_SameState(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	// Device is online (1), updating to online (same state) should be a no-op
	online := model.DeviceStateOnline
	device, err := svc.UpdateDevice(ctx2(), 1, "", &online)
	require.NoError(t, err)
	assert.Equal(t, model.DeviceStateOnline, device.State.State)
}

func TestIntegrationDeviceService_UpdateDevice_OfflineToOnline(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	// First set to offline (0)
	db.Model(&model.DeviceState{}).Where("device_key = ?", "D001").Update("state", model.DeviceStateOffline)

	// Then transition to online (1)
	online := model.DeviceStateOnline
	device, err := svc.UpdateDevice(ctx2(), 1, "", &online)
	require.NoError(t, err)
	assert.Equal(t, model.DeviceStateOnline, device.State.State)
}

func TestIntegrationDeviceService_UpdateDevice_InactiveToOnline(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	// Set to inactive (2)
	db.Model(&model.DeviceState{}).Where("device_key = ?", "D001").Update("state", model.DeviceStateInactive)

	// Try to go directly to online (invalid: must go through offline)
	online := model.DeviceStateOnline
	_, err := svc.UpdateDevice(ctx2(), 1, "", &online)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid status transition")
}

func TestIntegrationDeviceService_Telemetry_NilRedis(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	_, err := svc.Telemetry(ctx2(), "D001")
	assert.Error(t, err)
}

func TestIntegrationDeviceService_BatchCreate_SingleDevice(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	var buf bytes.Buffer
	f := excelize.NewFile()
	f.SetSheetRow("Sheet1", "A1", &[]string{"ProductKey", "DeviceName"})
	f.SetSheetRow("Sheet1", "A2", &[]string{"P001", "Single Device"})
	f.Write(&buf)

	n, errs, err := svc.BatchCreate(ctx2(), buf.Bytes())
	require.NoError(t, err)
	assert.Equal(t, 1, n)
	assert.Empty(t, errs)
}

func TestIntegrationProductTSLService_Upsert_ProductNotFound(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestProductTSLService(db)

	err := svc.Upsert(ctx2(), "NONEXIST", `{"properties":[]}`)
	assert.Error(t, err)
}

func TestIntegrationProductTSLService_Delete_ProductNotFound(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestProductTSLService(db)

	err := svc.Delete(ctx2(), "NONEXIST")
	assert.Error(t, err)
}

func TestIntegrationProductTSLService_Get_ProductNotFound(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestProductTSLService(db)

	_, err := svc.Get(ctx2(), "NONEXIST")
	assert.Error(t, err)
}

func TestIntegrationOTAService_Get(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestOTATotalService(db)

	pkg := &model.OTAPackage{PackageName: "fw-1", Version: "1.0", OrganizationID: "org-1"}
	err := svc.Create(ctx2(), pkg, "P001")
	require.NoError(t, err)

	result, err := svc.Get(ctx2(), pkg.UUID)
	require.NoError(t, err)
	assert.Equal(t, "fw-1", result.PackageName)
}

func TestIntegrationProductService_Save_Success(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestProductService(db)

	product, err := svc.Get(ctx2(), 1)
	require.NoError(t, err)

	product.Name = "Updated Product"
	err = svc.Save(ctx2(), product)
	require.NoError(t, err)

	updated, err := svc.Get(ctx2(), 1)
	require.NoError(t, err)
	assert.Equal(t, "Updated Product", updated.Name)
}

func TestIntegrationDeviceService_CreateDevice_ProductNotFound(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestDeviceService(db)

	device := &model.Device{Name: "Orphan", ProductID: 999, OrganizationID: "org-1"}
	_, err := svc.CreateDevice(ctx2(), device)
	assert.Error(t, err)
}

func TestIntegrationDeviceService_ListPushRecords_NotFoundDevice(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestDeviceService(db)

	_, _, err := svc.ListPushRecords(ctx2(), "NONEXIST", 1, 10, "", "")
	assert.Error(t, err)
}

func TestIntegrationDeviceService_SimulatePush_NoCreatedBy(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	record, err := svc.SimulatePush(ctx2(), "D001", `{"temp":25}`, "")
	require.NoError(t, err)
	assert.Equal(t, "system", record.CreatedBy)
}

func TestIntegrationDeviceService_ClearPushRecords_NotFoundDevice(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestDeviceService(db)

	_, err := svc.ClearPushRecords(ctx2(), "NONEXIST", nil)
	assert.Error(t, err)
}

func TestIntegrationDeviceService_RemoveTags_NotFoundDevice(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestDeviceService(db)

	err := svc.RemoveTags(ctx2(), "NONEXIST", []string{"key"})
	assert.Error(t, err)
}

func TestIntegrationDeviceService_ShadowHistory_NotFoundDevice(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestDeviceService(db)

	_, err := svc.ShadowHistory(ctx2(), "NONEXIST")
	assert.Error(t, err)
}

func TestIntegrationDeviceService_MutateShadow_NotFoundDevice(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestDeviceService(db)

	desired := map[string]any{"temp": 25}
	_, err := svc.MutateShadow(ctx2(), "NONEXIST", 0, "app", &desired, nil, false)
	assert.Error(t, err)
}

func TestIntegrationDeviceService_SetTags_NotFoundDevice(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestDeviceService(db)

	_, err := svc.SetTags(ctx2(), "NONEXIST", map[string]string{"k": "v"}, false)
	assert.Error(t, err)
}

func TestIntegrationOTAService_FindByName(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestOTATotalService(db)

	pkg := &model.OTAPackage{PackageName: "fw-unique", Version: "1.0", OrganizationID: "org-1"}
	err := svc.Create(ctx2(), pkg, "P001")
	require.NoError(t, err)

	result, err := svc.Get(ctx2(), pkg.UUID)
	require.NoError(t, err)
	assert.Equal(t, "fw-unique", result.PackageName)
}

func TestIntegrationOTAService_Statistics_WithData(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestOTATotalService(db)

	// Create a package
	pkg := &model.OTAPackage{PackageName: "fw-1.0", Version: "1.0.0"}
	err := svc.Create(ctx2(), pkg, "P001")
	require.NoError(t, err)

	stats, err := svc.Statistics(ctx2(), pkg.UUID)
	require.NoError(t, err)
	assert.Equal(t, "1", stats.PackageID)
	assert.Equal(t, int64(0), stats.TotalTargetDevices)
}

func TestIntegrationOTAService_Update_Valid(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestOTATotalService(db)

	pkg := &model.OTAPackage{PackageName: "fw-2.0", Version: "2.0.0"}
	err := svc.Create(ctx2(), pkg, "P001")
	require.NoError(t, err)

	pkg.Version = "2.1.0"
	err = svc.Update(ctx2(), pkg)
	require.NoError(t, err)

	fetched, err := svc.Get(ctx2(), pkg.UUID)
	require.NoError(t, err)
	assert.Equal(t, "2.1.0", fetched.Version)
}

func TestIntegrationOTAService_Update_ProductNotFound(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestOTATotalService(db)

	pkg := &model.OTAPackage{ID: 1, ProductID: 999}
	err := svc.Update(ctx2(), pkg)
	assert.Error(t, err)
}

func TestIntegrationProductService_Create_InvalidMetadata(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestProductService(db)

	p := &model.Product{Name: "Bad Meta", Metadata: `"invalid-string-not-json"`}
	_, err := svc.Create(ctx2(), p)
	assert.Error(t, err)
}

func TestIntegrationProductService_Create_Defaults(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestProductService(db)

	p := &model.Product{Name: "Defaults"}
	result, err := svc.Create(ctx2(), p)
	require.NoError(t, err)
	assert.NotEmpty(t, result.ProductKey)
	assert.Equal(t, "active", result.Status)
	assert.Equal(t, "direct", result.NodeType)
}

func TestIntegrationProductService_Create_WithKey(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestProductService(db)

	p := &model.Product{Name: "With Key", ProductKey: "CUSTOM"}
	result, err := svc.Create(ctx2(), p)
	require.NoError(t, err)
	assert.Equal(t, "CUSTOM", result.ProductKey)
}

func TestIntegrationProductService_Save_InvalidMetadata(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestProductService(db)

	p := &model.Product{ID: 1, Name: "Updated", ProductKey: "P001", Metadata: `"bad"`}
	err := svc.Save(ctx2(), p)
	assert.Error(t, err)
}

func TestIntegrationProductService_Delete_HasDevices(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestProductService(db)

	err := svc.DeleteByKey(ctx2(), "P001")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "has devices")
}

func TestIntegrationDeviceService_BatchCreate_ValidExcel(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	var buf bytes.Buffer
	f := excelize.NewFile()
	f.SetSheetRow("Sheet1", "A1", &[]string{"ProductKey", "DeviceName"})
	f.SetSheetRow("Sheet1", "A2", &[]string{"P001", "Batch Device 1"})
	f.SetSheetRow("Sheet1", "A3", &[]string{"P001", "Batch Device 2"})
	f.Write(&buf)

	n, errs, err := svc.BatchCreate(ctx2(), buf.Bytes())
	require.NoError(t, err)
	assert.Equal(t, 2, n)
	assert.Empty(t, errs)
}

func TestIntegrationDeviceService_BatchCreate_NoRows(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	var buf bytes.Buffer
	f := excelize.NewFile()
	f.SetSheetRow("Sheet1", "A1", &[]string{"ProductKey", "DeviceName"})
	f.Write(&buf)

	n, errs, err := svc.BatchCreate(ctx2(), buf.Bytes())
	assert.Error(t, err)
	assert.Equal(t, 0, n)
	assert.Empty(t, errs)
}

func TestIntegrationDeviceService_BatchCreate_MissingColumns(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	var buf bytes.Buffer
	f := excelize.NewFile()
	f.SetSheetRow("Sheet1", "A1", &[]string{"Col1", "Col2"})
	f.SetSheetRow("Sheet1", "A2", &[]string{"val1", "val2"})
	f.Write(&buf)

	n, errs, err := svc.BatchCreate(ctx2(), buf.Bytes())
	assert.Error(t, err)
	assert.Equal(t, 0, n)
	assert.Empty(t, errs)
}

func TestIntegrationDeviceService_BatchCreate_WrongProduct(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	var buf bytes.Buffer
	f := excelize.NewFile()
	f.SetSheetRow("Sheet1", "A1", &[]string{"ProductKey", "DeviceName"})
	f.SetSheetRow("Sheet1", "A2", &[]string{"WRONG", "Device 1"})
	f.Write(&buf)

	n, errs, err := svc.BatchCreate(ctx2(), buf.Bytes())
	require.NoError(t, err)
	assert.Equal(t, 0, n)
	assert.Len(t, errs, 1)
}

func TestIntegrationDeviceService_BatchCreate_EmptyRow(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	var buf bytes.Buffer
	f := excelize.NewFile()
	f.SetSheetRow("Sheet1", "A1", &[]string{"ProductKey", "DeviceName"})
	f.SetSheetRow("Sheet1", "A2", &[]string{"", ""})
	f.SetSheetRow("Sheet1", "A3", &[]string{"P001", "Good Device"})
	f.Write(&buf)

	n, errs, err := svc.BatchCreate(ctx2(), buf.Bytes())
	require.NoError(t, err)
	assert.Equal(t, 1, n)
	assert.Empty(t, errs)
}

func TestIntegrationProductTSLService_Upsert_Create(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestProductTSLService(db)

	err := svc.Upsert(ctx2(), "P001", `{"properties":[]}`)
	require.NoError(t, err)

	result, err := svc.Get(ctx2(), "P001")
	require.NoError(t, err)
	assert.Equal(t, `{"properties":[]}`, result.TSL)
}

func TestIntegrationProductTSLService_Upsert_Update(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestProductTSLService(db)

	err := svc.Upsert(ctx2(), "P001", `{"properties":[]}`)
	require.NoError(t, err)

	err = svc.Upsert(ctx2(), "P001", `{"properties":[{"name":"temp"}]}`)
	require.NoError(t, err)

	result, err := svc.Get(ctx2(), "P001")
	require.NoError(t, err)
	assert.Equal(t, `{"properties":[{"name":"temp"}]}`, result.TSL)
}

func TestIntegrationProductTSLService_Get_NotFound(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestProductTSLService(db)

	_, err := svc.Get(ctx2(), "NONEXIST")
	assert.Error(t, err)
}

func TestIntegrationProductTSLService_Delete(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestProductTSLService(db)

	err := svc.Upsert(ctx2(), "P001", `{"properties":[]}`)
	require.NoError(t, err)

	err = svc.Delete(ctx2(), "P001")
	require.NoError(t, err)

	_, err = svc.Get(ctx2(), "P001")
	assert.Error(t, err)
}

func TestIntegrationProductTSLService_Delete_ProductNotFound_Dup(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestProductTSLService(db)

	err := svc.Delete(ctx2(), "NONEXIST")
	assert.Error(t, err)
}

func TestIntegrationProductTSLService_Upsert_ProductNotFound_Dup(t *testing.T) {
	db := testutil.SetupTestDB(t)
	svc := testutil.NewTestProductTSLService(db)

	err := svc.Upsert(ctx2(), "NONEXIST", `{"properties":[]}`)
	assert.Error(t, err)
}

func TestIntegrationDeviceService_SimulatePush_WithCreatedBy(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	record, err := svc.SimulatePush(ctx2(), "D001", `{"temp":25}`, "admin")
	require.NoError(t, err)
	assert.Equal(t, "admin", record.CreatedBy)
}

func TestIntegrationDeviceService_ListPushRecords_WithOperationType(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	records, total, err := svc.ListPushRecords(ctx2(), "D001", 1, 10, "Property", "")
	require.NoError(t, err)
	assert.Equal(t, int64(0), total)
	assert.Empty(t, records)
}

func TestIntegrationDeviceService_ListPushRecords_WithStatus(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	records, total, err := svc.ListPushRecords(ctx2(), "D001", 1, 10, "", "success")
	require.NoError(t, err)
	assert.Equal(t, int64(0), total)
	assert.Empty(t, records)
}

func TestIntegrationDeviceService_ClearPushRecords_NilBefore(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	count, err := svc.ClearPushRecords(ctx2(), "D001", nil)
	require.NoError(t, err)
	assert.Equal(t, int64(0), count)
}

func TestIntegrationDeviceService_SetTags_Valid(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	tags, err := svc.SetTags(ctx2(), "D001", map[string]string{"location": "factory"}, false)
	require.NoError(t, err)
	assert.Len(t, tags, 1)
}

func TestIntegrationDeviceService_SetTags_Replace(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	tags, err := svc.SetTags(ctx2(), "D001", map[string]string{"key1": "val1"}, true)
	require.NoError(t, err)
	assert.Len(t, tags, 1)
}

func TestIntegrationDeviceService_RemoveTags(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	_, err := svc.SetTags(ctx2(), "D001", map[string]string{"env": "prod"}, false)
	require.NoError(t, err)

	err = svc.RemoveTags(ctx2(), "D001", []string{"env"})
	assert.NoError(t, err)
}

func TestIntegrationDeviceService_MutateShadow_UpdateExisting(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestDeviceService(db)

	desired := map[string]any{"temp": 25}
	shadow, err := svc.MutateShadow(ctx2(), "D001", 0, "app", &desired, nil, false)
	require.NoError(t, err)

	reported := map[string]any{"temp": 26}
	shadow2, err := svc.MutateShadow(ctx2(), "D001", shadow.Version, "device", nil, &reported, false)
	require.NoError(t, err)
	assert.NotNil(t, shadow2)
}

func TestIntegrationProductService_Delete_Success(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	productRepo := repository.NewProductRepository(db)
	svc := service.NewProductService(productRepo)

	// Create a second product with no devices
	p2 := &model.Product{Name: "No Device Product", ProductKey: "P002", Status: "active", OrganizationID: "org-1"}
	err := productRepo.Create(ctx2(), p2)
	require.NoError(t, err)

	err = svc.DeleteByKey(ctx2(), p2.ProductKey)
	require.NoError(t, err)
}

func TestIntegrationProductService_Create_InvalidLegacyMetadata(t *testing.T) {
	db := testutil.SetupTestDB(t)
	productRepo := repository.NewProductRepository(db)
	svc := service.NewProductService(productRepo)

	product := &model.Product{Name: "Bad Legacy", ProductKey: "P999", Metadata: `"{\"bad\")"`, OrganizationID: "org-1"}
	_, err := svc.Create(ctx2(), product)
	assert.Error(t, err)
}

func TestIntegrationProductService_Create_InvalidRawMetadata(t *testing.T) {
	db := testutil.SetupTestDB(t)
	productRepo := repository.NewProductRepository(db)
	svc := service.NewProductService(productRepo)

	product := &model.Product{Name: "Bad Raw", ProductKey: "P999", Metadata: `{bad}`, OrganizationID: "org-1"}
	_, err := svc.Create(ctx2(), product)
	assert.Error(t, err)
}

func TestIntegrationProductService_Create_EmptyMetadata(t *testing.T) {
	db := testutil.SetupTestDB(t)
	productRepo := repository.NewProductRepository(db)
	svc := service.NewProductService(productRepo)

	product := &model.Product{Name: "No Meta", ProductKey: "P999", Metadata: "", OrganizationID: "org-1"}
	result, err := svc.Create(ctx2(), product)
	require.NoError(t, err)
	assert.NotZero(t, result.ID)
}

func TestIntegrationProductService_Save_InvalidLegacyMetadata(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	productRepo := repository.NewProductRepository(db)
	svc := service.NewProductService(productRepo)

	product := &model.Product{ID: 1, Name: "Updated", ProductKey: "P001", Metadata: `"{\"bad\")"`, OrganizationID: "org-1"}
	err := svc.Save(ctx2(), product)
	assert.Error(t, err)
}

func TestIntegrationProductService_GetByKey(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	productRepo := repository.NewProductRepository(db)
	svc := service.NewProductService(productRepo)

	product, err := svc.GetByKey(ctx2(), "P001")
	require.NoError(t, err)
	assert.Equal(t, "P001", product.ProductKey)
}

func TestIntegrationProductService_List(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	productRepo := repository.NewProductRepository(db)
	svc := service.NewProductService(productRepo)

	products, total, err := svc.List(ctx2(), 1, 10, "", "", "")
	require.NoError(t, err)
	assert.True(t, total >= 1)
	assert.Len(t, products, 1)
}

func TestIntegrationOTAService_Create(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	otaRepo := repository.NewOTARepository(db)
	productRepo := repository.NewProductRepository(db)
	deviceRepo := repository.NewDeviceRepository(db, nil)
	svc := service.NewOTAService(otaRepo, productRepo, deviceRepo, nil)

	pkg := &model.OTAPackage{PackageName: "fw-1", Version: "1.0", OrganizationID: "org-1"}
	err := svc.Create(ctx2(), pkg, "P001")
	require.NoError(t, err)
}

func TestIntegrationOTAService_Create_ProductNotFound(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	otaRepo := repository.NewOTARepository(db)
	productRepo := repository.NewProductRepository(db)
	deviceRepo := repository.NewDeviceRepository(db, nil)
	svc := service.NewOTAService(otaRepo, productRepo, deviceRepo, nil)

	pkg := &model.OTAPackage{PackageName: "fw-2", Version: "1.0", OrganizationID: "org-1"}
	err := svc.Create(ctx2(), pkg, "NONEXIST")
	assert.Error(t, err)
}

func TestIntegrationOTAService_Batches(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	otaRepo := repository.NewOTARepository(db)
	productRepo := repository.NewProductRepository(db)
	deviceRepo := repository.NewDeviceRepository(db, nil)
	svc := service.NewOTAService(otaRepo, productRepo, deviceRepo, nil)

	// Create a package first
	pkg := &model.OTAPackage{PackageName: "fw-batches", Version: "1.0", OrganizationID: "org-1"}
	err := svc.Create(ctx2(), pkg, "P001")
	require.NoError(t, err)

	batches, err := svc.Batches(ctx2(), pkg.UUID)
	require.NoError(t, err)
	assert.Empty(t, batches)
}

func TestIntegrationOTAService_Deployments(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	otaRepo := repository.NewOTARepository(db)
	productRepo := repository.NewProductRepository(db)
	deviceRepo := repository.NewDeviceRepository(db, nil)
	svc := service.NewOTAService(otaRepo, productRepo, deviceRepo, nil)

	// Create a package first
	pkg := &model.OTAPackage{PackageName: "fw-deploy", Version: "1.0", OrganizationID: "org-1"}
	err := svc.Create(ctx2(), pkg, "P001")
	require.NoError(t, err)

	deployments, total, err := svc.Deployments(ctx2(), pkg.UUID, 1, 10, "")
	require.NoError(t, err)
	assert.Equal(t, int64(0), total)
	assert.Empty(t, deployments)
}

func TestIntegrationOTAService_BatchUpgrade(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	svc := testutil.NewTestOTATotalService(db)

	// Create a package first
	pkg := &model.OTAPackage{PackageName: "fw-deploy", Version: "1.0", OrganizationID: "org-1"}
	require.NoError(t, svc.Create(ctx2(), pkg, "P001"))
	require.NotZero(t, pkg.ID)

	// Batch upgrade the seeded device D001 (device id=1) via device_key
	batch, err := svc.BatchUpgrade(ctx2(), pkg.UUID, []string{"D001"})
	require.NoError(t, err)
	assert.NotNil(t, batch)
	assert.Equal(t, int32(1), batch.TargetDeviceCount)

	// Package should be marked deploying
	got, err := svc.Get(ctx2(), pkg.UUID)
	require.NoError(t, err)
	assert.Equal(t, "deploying", got.Status)

	// Unknown key returns error
	_, err = svc.BatchUpgrade(ctx2(), pkg.UUID, []string{"UNKNOWN"})
	assert.Error(t, err)

	// Deployments should show the seeded device
	deployments, total, err := svc.Deployments(ctx2(), pkg.UUID, 1, 10, "")
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Len(t, deployments, 1)
	assert.Equal(t, "D001", deployments[0].DeviceKey)
	assert.Equal(t, "pending", deployments[0].Status)
}
