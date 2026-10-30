//go:build wireinject
// +build wireinject

package wire

import (
	"transport-mqtt/internal/consumer"
	"transport-mqtt/internal/handler"
	"transport-mqtt/internal/server"
	"transport-mqtt/internal/service"
	"transport-mqtt/pkg/app"
	"transport-mqtt/pkg/log"

	"transport-mqtt/internal/event"

	"github.com/google/wire"
	"github.com/spf13/viper"
)

type eventBusHolder struct {
	producer event.Producer
	consumer event.Consumer
}

func provideEventBus(conf *viper.Viper, logger *log.Logger) (*eventBusHolder, func(), error) {
	pub, sub, err := event.NewBus(conf, logger.Logger)
	if err != nil {
		return nil, nil, err
	}
	producer := event.NewProducer(pub)
	consumer := event.NewConsumer(sub, logger.Logger)
	cleanup := func() {
		_ = producer.Close()
		_ = consumer.Close()
	}
	return &eventBusHolder{producer: producer, consumer: consumer}, cleanup, nil
}

func provideEventProducer(holder *eventBusHolder) event.Producer {
	return holder.producer
}

func provideEventConsumer(holder *eventBusHolder) event.Consumer {
	return holder.consumer
}

var serverSet = wire.NewSet(
	service.NewDeviceEventService,
	service.NewOTAService,
	handler.NewIngressHandler,
	consumer.NewOTACommandConsumer,
	consumer.NewManager,
	server.NewMQTTClient,
	server.NewMQTTServer,
)

func newApp(
	mqttServer *server.MQTTServer,
) *app.App {
	return app.NewApp(
		app.WithServer(mqttServer),
		app.WithName("0things-transport-mqtt"),
	)
}

func NewWire(*viper.Viper, *log.Logger) (*app.App, func(), error) {
	panic(wire.Build(
		provideEventBus,
		provideEventProducer,
		provideEventConsumer,
		serverSet,
		newApp,
	))
}
