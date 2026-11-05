package repository

import (
	"context"

	"aiot-backend/internal/dto"
	"aiot-backend/internal/model"

	"gorm.io/gorm"
)

type DeviceServiceInvocationRepository struct{ db *gorm.DB }

func NewDeviceServiceInvocationRepository(db *gorm.DB) *DeviceServiceInvocationRepository {
	return &DeviceServiceInvocationRepository{db: db}
}

func (r *DeviceServiceInvocationRepository) Create(ctx context.Context, item *model.DeviceServiceInvocation) error {
	return useQuery(r.db).DeviceServiceInvocation.WithContext(ctx).Create(item)
}

func (r *DeviceServiceInvocationRepository) List(ctx context.Context, query dto.ListDeviceServiceInvocationsQuery) ([]model.DeviceServiceInvocation, int64, error) {
	q := useQuery(r.db)
	base := q.DeviceServiceInvocation.WithContext(ctx).Where(q.DeviceServiceInvocation.DeviceID.Eq(query.DeviceID))
	if query.ServiceIdentifier != "" {
		base = base.Where(q.DeviceServiceInvocation.ServiceIdentifier.Eq(query.ServiceIdentifier))
	}
	if query.StartAt != nil {
		base = base.Where(q.DeviceServiceInvocation.InvokedAt.Gte(*query.StartAt))
	}
	if query.EndAt != nil {
		base = base.Where(q.DeviceServiceInvocation.InvokedAt.Lte(*query.EndAt))
	}
	items, total, err := base.Order(q.DeviceServiceInvocation.ID.Desc()).FindByPage((query.Page-1)*query.PageSize, query.PageSize)
	if err != nil {
		return nil, 0, err
	}
	result := make([]model.DeviceServiceInvocation, len(items))
	for i := range items {
		result[i] = *items[i]
	}
	return result, total, nil
}
