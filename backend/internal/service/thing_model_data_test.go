package service

import (
	"context"
	"errors"
	"testing"

	"aiot-backend/internal/model"
	"aiot-backend/internal/repository"
	"aiot-backend/internal/tenant"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func newThingModelDataSvc(t *testing.T) (*ThingModelDataService, *gorm.DB, context.Context) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(
		&model.Product{}, &model.Device{}, &model.DeviceState{}, &model.ProductTSL{}, &model.DeviceServiceInvocation{},
	))
	require.NoError(t, db.Create(&model.Product{ID: 1, ProductKey: "P001", Name: "Test Product", OrganizationID: "org-1"}).Error)
	require.NoError(t, db.Create(&model.Device{ID: 1, DeviceKey: "device-1", Name: "Test Device", ProductID: 1, OrganizationID: "org-1", Enabled: true}).Error)

	productID := int64(1)
	require.NoError(t, db.Create(&model.ProductTSL{
		ID:        1,
		ProductID: &productID,
		TSL:       `{"properties":[{"identifier":"temperature","name":"Temperature","accessMode":"r","dataType":{"type":"double","specs":{"unit":"°C"}}},{"identifier":"humidity","name":"Humidity","accessMode":"rw","dataType":{"type":"double","specs":{"unit":"%"}}}]}`,
	}).Error)

	invocations := repository.NewDeviceServiceInvocationRepository(db)
	devices := repository.NewDeviceRepository(db, nil)
	tsls := repository.NewProductTSLRepository(db)
	svc := NewThingModelDataService(invocations, devices, tsls, nil, nil)

	ctx := tenant.WithOrganization(context.Background(), "org-1")
	return svc, db, ctx
}

func TestThingModelPropertyService_List(t *testing.T) {
	svc, _, ctx := newThingModelDataSvc(t)

	properties, err := svc.ListProperties(ctx, "device-1")
	require.NoError(t, err)
	require.Len(t, properties, 2)
	require.Equal(t, "temperature", properties[0].Identifier)
	require.Equal(t, "humidity", properties[1].Identifier)
	require.Equal(t, "double", properties[0].DataType)
	require.Equal(t, "°C", properties[0].Unit)
	require.Equal(t, "r", properties[0].AccessMode)
	require.Equal(t, "%", properties[1].Unit)
	require.Equal(t, "rw", properties[1].AccessMode)
}

func TestThingModelPropertyService_ListWithoutTSL(t *testing.T) {
	svc, db, ctx := newThingModelDataSvc(t)

	require.NoError(t, db.Create(&model.Product{ID: 2, ProductKey: "P002", OrganizationID: "org-1"}).Error)
	require.NoError(t, db.Create(&model.Device{ID: 2, DeviceKey: "device-2", ProductID: 2, OrganizationID: "org-1"}).Error)

	properties, err := svc.ListProperties(ctx, "device-2")
	require.NoError(t, err)
	require.Empty(t, properties)
}

func TestThingModelPropertyService_ListErrors(t *testing.T) {
	svc, db, ctx := newThingModelDataSvc(t)

	_, err := svc.ListProperties(ctx, "missing-device")
	require.Error(t, err)
	require.True(t, errors.Is(err, repository.ErrNotFound))

	productID := int64(2)
	require.NoError(t, db.Create(&model.Product{ID: 2, ProductKey: "P002", OrganizationID: "org-1"}).Error)
	require.NoError(t, db.Create(&model.Device{ID: 2, DeviceKey: "device-2", ProductID: 2, OrganizationID: "org-1"}).Error)
	require.NoError(t, db.Create(&model.ProductTSL{ID: 2, ProductID: &productID, TSL: "not-json"}).Error)

	_, err = svc.ListProperties(ctx, "device-2")
	require.Error(t, err)
	require.True(t, errors.Is(err, ErrInvalidThingModel))
}
