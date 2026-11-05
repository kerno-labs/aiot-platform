package service_test

import (
	"context"
	"testing"
	"time"

	"aiot-backend/internal/dto"
	"aiot-backend/internal/event"
	"aiot-backend/internal/model"
	"aiot-backend/internal/repository"
	"aiot-backend/internal/service"
	"aiot-backend/test/server/testutil"

	"github.com/stretchr/testify/require"
)

type recordingEventProducer struct {
	topic   event.Topic
	payload any
	err     error
}

func (p *recordingEventProducer) Publish(_ context.Context, topic event.Topic, payload any) error {
	if p.err != nil {
		return p.err
	}
	p.topic = topic
	p.payload = payload
	return nil
}

func (p *recordingEventProducer) Close() error { return nil }

func TestDeviceServiceInvocationServiceList(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)
	output := `{"ok":true}`
	now := time.Now().Truncate(time.Second)
	require.NoError(t, db.Create(&model.DeviceServiceInvocation{UUID: "call-1", DeviceID: 1, ServiceIdentifier: "reboot", ServiceName: "Reboot", InputParams: `{}`, OutputParams: &output, InvokedAt: now}).Error)
	require.NoError(t, db.Create(&model.DeviceServiceInvocation{UUID: "call-2", DeviceID: 1, ServiceIdentifier: "set", ServiceName: "Set", InputParams: `{"on":true}`, InvokedAt: now.Add(-time.Hour)}).Error)

	items, total, err := testutil.NewTestThingModelDataService(db).ListServiceInvocations(testutil.ContextWithOrganization(t.Context(), "org-1"), dto.ListDeviceServiceInvocationsQuery{
		DeviceKey: "D001", ServiceIdentifier: "reboot", StartAt: ptrTime(now.Add(-time.Minute)), EndAt: ptrTime(now.Add(time.Minute)), Page: 1, PageSize: 10,
	})
	require.NoError(t, err)
	require.Equal(t, int64(1), total)
	require.Len(t, items, 1)
	require.Equal(t, "call-1", items[0].UUID)
	require.NotNil(t, items[0].OutputParams)
}

func ptrTime(value time.Time) *time.Time { return &value }

func TestDeviceServiceInvocationServiceInvoke(t *testing.T) {
	db := testutil.SetupTestDB(t)
	testutil.SeedTestData(t, db)

	productID := int64(1)
	require.NoError(t, db.Create(&model.ProductTSL{
		ID:        1,
		ProductID: &productID,
		TSL:       `{"properties":[],"services":[{"identifier":"reboot","name":"重启设备","callType":"async"}]}`,
	}).Error)

	producer := &recordingEventProducer{}
	svc := service.NewThingModelDataService(
		repository.NewDeviceServiceInvocationRepository(db),
		repository.NewDeviceRepository(db, nil),
		repository.NewProductTSLRepository(db),
		nil,
		producer,
	)
	ctx := testutil.ContextWithOrganization(t.Context(), "org-1")

	inv, err := svc.InvokeService(ctx, "D001", "reboot", `{"delay": 3}`)
	require.NoError(t, err)
	require.NotEmpty(t, inv.UUID)
	require.Equal(t, "reboot", inv.ServiceIdentifier)
	require.Equal(t, "重启设备", inv.ServiceName)
	require.Equal(t, `{"delay":3}`, inv.InputParams)
	require.Equal(t, event.TopicDeviceServiceInvoke, producer.topic)

	// Undefined service in TSL should be rejected
	_, err = svc.InvokeService(ctx, "D001", "unknown_service", `{}`)
	require.ErrorIs(t, err, service.ErrServiceNotFound)

	// Invalid JSON object should be rejected
	_, err = svc.InvokeService(ctx, "D001", "reboot", `[1,2,3]`)
	require.ErrorIs(t, err, service.ErrInvalidServiceInput)

	// Broker publish failure should be propagated without leaving a dirty invocation record
	producer.err = context.DeadlineExceeded
	_, err = svc.InvokeService(ctx, "D001", "reboot", `{}`)
	require.ErrorIs(t, err, context.DeadlineExceeded)
	var count int64
	require.NoError(t, db.Model(&model.DeviceServiceInvocation{}).Count(&count).Error)
	require.Equal(t, int64(1), count)
	producer.err = nil

	// Offline device should be rejected
	require.NoError(t, db.Model(&model.DeviceState{}).Where("device_key = ?", "D001").Update("state", model.DeviceStateOffline).Error)
	_, err = svc.InvokeService(ctx, "D001", "reboot", `{}`)
	require.ErrorIs(t, err, service.ErrDeviceOffline)
}
