package handler

import (
	"context"

	"data-engine/internal/event"
	"data-engine/internal/service"
)

// ServiceInvocationHandler coordinates service reply processing.
type ServiceInvocationHandler struct {
	svc service.ServiceInvocationService
}

// NewServiceInvocationHandler creates a new ServiceInvocationHandler instance.
func NewServiceInvocationHandler(svc service.ServiceInvocationService) *ServiceInvocationHandler {
	return &ServiceInvocationHandler{svc: svc}
}

// HandleServiceReply delegates service reply messages to ServiceInvocationService.
func (h *ServiceInvocationHandler) HandleServiceReply(ctx context.Context, msg *event.DeviceMessage, _ map[string]string) error {
	if msg == nil {
		return nil
	}
	return h.svc.HandleServiceReply(ctx, *msg)
}

