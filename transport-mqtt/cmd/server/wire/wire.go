//go:build wireinject
// +build wireinject

package wire

import (
	"transport-mqtt/internal/server"
	"transport-mqtt/pkg/app"
	"transport-mqtt/pkg/log"

	"github.com/google/wire"
	"github.com/spf13/viper"
)

var serverSet = wire.NewSet(
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
		serverSet,
		newApp,
	))
}
