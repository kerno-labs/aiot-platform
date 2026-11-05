package consumer

import (
	"context"

	"data-engine/internal/event"
	"data-engine/internal/handler"
)

// ServiceReplyConsumer handles device thing-model service reply messages from Kafka.
type ServiceReplyConsumer struct {
	serviceInvocationHandler *handler.ServiceInvocationHandler
}

// NewServiceReplyConsumer creates a new ServiceReplyConsumer instance.
func NewServiceReplyConsumer(serviceInvocationHandler *handler.ServiceInvocationHandler) *ServiceReplyConsumer {
	return &ServiceReplyConsumer{
		serviceInvocationHandler: serviceInvocationHandler,
	}
}

// HandleServiceReply processes a device service invocation reply event.
func (c *ServiceReplyConsumer) HandleServiceReply(ctx context.Context, msg *event.DeviceMessage, meta map[string]string) error {
	return c.serviceInvocationHandler.HandleServiceReply(ctx, msg, meta)
}

