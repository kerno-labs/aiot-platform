//go:build wireinject
// +build wireinject

package wire

import (
	"aiot-backend/internal/handler"
	"aiot-backend/internal/repository"
	"aiot-backend/internal/server"
	"aiot-backend/internal/service"
	"aiot-backend/pkg/app"
	"aiot-backend/pkg/log"
	"aiot-backend/pkg/logto"
	mcptransport "aiot-backend/pkg/server/mcp"

	"github.com/google/wire"
	"github.com/spf13/viper"
)

var repositorySet = wire.NewSet(
	repository.NewDB,
	repository.NewRedis,
	repository.NewDeviceRepository,
	repository.NewProductRepository,
	repository.NewDeviceTagRepository,
	repository.NewDeviceShadowRepository,
	repository.NewPushRecordRepository,
	repository.NewProductTSLRepository,
	repository.NewDeviceServiceInvocationRepository,
	repository.NewTelemetryRepository,
)

func provideThingModelDataService(
	invocations *repository.DeviceServiceInvocationRepository,
	devices *repository.DeviceRepository,
	tsls *repository.ProductTSLRepository,
	telemetry *repository.TelemetryRepository,
) *service.ThingModelDataService {
	return service.NewThingModelDataService(invocations, devices, tsls, telemetry, nil)
}

var serviceSet = wire.NewSet(
	service.NewDeviceService,
	provideThingModelDataService,
	service.NewTelemetryService,
	wire.Bind(new(handler.MCPDeviceService), new(*service.DeviceService)),
	wire.Bind(new(handler.MCPThingModelService), new(*service.ThingModelDataService)),
	wire.Bind(new(handler.MCPTelemetryService), new(*service.TelemetryService)),
)

func newApp(mcpServer *mcptransport.Server) *app.App {
	return app.NewApp(
		app.WithServer(mcpServer),
		app.WithName("0things-mcp"),
	)
}

func NewWire(*viper.Viper, *log.Logger) (*app.App, func(), error) {
	panic(wire.Build(
		repositorySet,
		serviceSet,
		logto.NewVerifier,
		handler.NewMCPHandler,
		server.NewMCPServer,
		server.NewMCPTransportServer,
		newApp,
	))
}
