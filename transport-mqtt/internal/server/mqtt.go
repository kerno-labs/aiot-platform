package server

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"os"
	"sync"
	"time"

	"transport-mqtt/pkg/log"
	"transport-mqtt/pkg/server"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/google/uuid"
	"github.com/spf13/viper"
	"go.uber.org/zap"
)

// MQTTServer manages the transport service MQTT connection lifecycle.
type MQTTServer struct {
	client mqtt.Client
	logger *log.Logger
	mu     sync.Mutex
}

var _ server.Server = (*MQTTServer)(nil)

// NewMQTTClient creates a configured Eclipse Paho MQTT client instance.
func NewMQTTClient(config *viper.Viper, logger *log.Logger) (mqtt.Client, error) {
	broker := config.GetString("mqtt.broker")
	if broker == "" {
		broker = "tcp://127.0.0.1:1883"
	}

	clientID := config.GetString("mqtt.client_id")
	if clientID == "" {
		clientID = "0things-mqtt-transport-" + uuid.NewString()[:8]
	}

	opts := mqtt.NewClientOptions().
		AddBroker(broker).
		SetClientID(clientID).
		SetAutoReconnect(true).
		SetConnectRetry(true).
		SetKeepAlive(60 * time.Second).
		SetOnConnectHandler(func(_ mqtt.Client) {
			// EMQX owns MQTT/Kafka forwarding; this service must not subscribe here.
			logger.Info("connected/reconnected to MQTT broker")
		}).
		SetConnectionLostHandler(func(_ mqtt.Client, err error) {
			logger.Warn("MQTT connection lost, waiting for auto-reconnect", zap.Error(err))
		})

	tlsConfig, err := MQTTTLSConfig(config)
	if err != nil {
		return nil, err
	}
	if tlsConfig != nil {
		opts.SetTLSConfig(tlsConfig)
	}

	if username := config.GetString("mqtt.username"); username != "" {
		opts.SetUsername(username)
	}
	if password := config.GetString("mqtt.password"); password != "" {
		opts.SetPassword(password)
	}

	return mqtt.NewClient(opts), nil
}

// NewMQTTServer initializes the MQTT transport server.
func NewMQTTServer(client mqtt.Client, logger *log.Logger) *MQTTServer {
	return &MQTTServer{
		client: client,
		logger: logger,
	}
}

// MQTTTLSConfig parses optional TLS certificates from configuration.
func MQTTTLSConfig(config *viper.Viper) (*tls.Config, error) {
	caFile := config.GetString("mqtt.tls.ca_file")
	certFile := config.GetString("mqtt.tls.cert_file")
	keyFile := config.GetString("mqtt.tls.key_file")
	if caFile == "" && certFile == "" && keyFile == "" {
		return nil, nil
	}
	if certFile == "" || keyFile == "" {
		return nil, fmt.Errorf("mqtt TLS requires both cert_file and key_file")
	}
	cert, err := tls.LoadX509KeyPair(certFile, keyFile)
	if err != nil {
		return nil, fmt.Errorf("load mqtt client certificate: %w", err)
	}
	tlsConfig := &tls.Config{MinVersion: tls.VersionTLS12, Certificates: []tls.Certificate{cert}}
	if caFile != "" {
		pem, err := os.ReadFile(caFile)
		if err != nil {
			return nil, fmt.Errorf("read mqtt CA certificate: %w", err)
		}
		pool := x509.NewCertPool()
		if !pool.AppendCertsFromPEM(pem) {
			return nil, fmt.Errorf("parse mqtt CA certificate")
		}
		tlsConfig.RootCAs = pool
	}
	return tlsConfig, nil
}

// Start keeps the MQTT connection alive until the service is stopped.
func (s *MQTTServer) Start(ctx context.Context) error {
	s.mu.Lock()
	token := s.client.Connect()
	s.mu.Unlock()

	if !token.WaitTimeout(10 * time.Second) {
		return fmt.Errorf("mqtt broker connect timeout")
	}
	if err := token.Error(); err != nil {
		return fmt.Errorf("mqtt broker connect failed: %w", err)
	}

	s.logger.Info("MQTT transport service connected")

	<-ctx.Done()
	return nil
}

// Stop gracefully stops the MQTT server and disconnects from broker.
func (s *MQTTServer) Stop(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.client != nil && s.client.IsConnected() {
		s.client.Disconnect(250)
	}
	s.logger.Info("MQTT server stopped")
	return nil
}
