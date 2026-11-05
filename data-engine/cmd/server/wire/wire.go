//go:build wireinject
// +build wireinject

package wire

import (
	"data-engine/internal/event"
	"data-engine/internal/tsdb"
	"data-engine/internal/consumer"
	"data-engine/internal/handler"
	"data-engine/internal/repository"
	"data-engine/internal/server"
	"data-engine/internal/service"
	"data-engine/pkg/app"
	"data-engine/pkg/log"

	"github.com/google/wire"
	"github.com/spf13/viper"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

func provideZapLogger(logger *log.Logger) *zap.Logger {
	return logger.Logger
}

func provideTSDBClient(conf *viper.Viper, logger *log.Logger) (tsdb.Client, func(), error) {
	client := tsdb.NewClient(conf, logger.Logger)
	cleanup := func() {
		client.Close()
	}
	return client, cleanup, nil
}

func provideDB(conf *viper.Viper, logger *log.Logger) (*gorm.DB, error) {
	return repository.NewDB(conf, logger.Logger)
}

type eventBusHolder struct {
	producer event.Producer
	consumer event.Consumer
}

func provideEventBus(conf *viper.Viper, logger *log.Logger) (*eventBusHolder, func(), error) {
	pub, sub, err := event.NewBus(conf, logger.Logger)
	if err != nil {
		return nil, nil, err
	}
	p := event.NewProducer(pub)
	c := event.NewConsumer(sub, logger.Logger)
	cleanup := func() {
		_ = p.Close()
		_ = c.Close()
	}
	return &eventBusHolder{producer: p, consumer: c}, cleanup, nil
}

func provideEventConsumer(holder *eventBusHolder) event.Consumer {
	return holder.consumer
}

func provideEventProducer(holder *eventBusHolder) event.Producer {
	return holder.producer
}

var repositorySet = wire.NewSet(
	provideDB,
	repository.NewRepository,
	repository.NewDeviceUpgradeStatusRepository,
	repository.NewDeviceEventRepository,
	repository.NewDeviceStateRepository,
	repository.NewDeviceServiceInvocationRepository,
)

var serviceSet = wire.NewSet(
	service.NewTelemetryService,
	service.NewOTAService,
	service.NewEventService,
	service.NewDeviceStateService,
	service.NewServiceInvocationService,
)

var consumerSet = wire.NewSet(
	consumer.NewTelemetryConsumer,
	consumer.NewEventConsumer,
	consumer.NewDeviceStateConsumer,
	consumer.NewServiceReplyConsumer,
	consumer.NewOTAProgressConsumer,
	consumer.NewOTADeviceInfoConsumer,
	consumer.NewManager,
)

var handlerSet = wire.NewSet(
	handler.NewTelemetryHandler,
	handler.NewEventHandler,
	handler.NewDeviceStateHandler,
	handler.NewServiceInvocationHandler,
	handler.NewOTAHandler,
)

var serverSet = wire.NewSet(
	server.NewDataEngineServer,
)

func newApp(
	server *server.DataEngineServer,
) *app.App {
	return app.NewApp(
		app.WithServer(server),
		app.WithName("0things-data-engine"),
	)
}

func NewWire(*viper.Viper, *log.Logger) (*app.App, func(), error) {
	panic(wire.Build(
		provideZapLogger,
		provideTSDBClient,
		provideEventBus,
		provideEventConsumer,
		repositorySet,
		serviceSet,
		handlerSet,
		consumerSet,
		serverSet,
		newApp,
	))
}
