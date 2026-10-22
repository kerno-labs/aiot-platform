package consumer

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"transport-mqtt/internal/event"
	"transport-mqtt/pkg/log"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"go.uber.org/zap"
)

// OTACommandConsumer consumes OTA upgrade command events from Kafka and pushes them to EMQX via MQTT.
type OTACommandConsumer struct {
	client mqtt.Client
	logger *log.Logger
}

func NewOTACommandConsumer(client mqtt.Client, logger *log.Logger) *OTACommandConsumer {
	return &OTACommandConsumer{
		client: client,
		logger: logger,
	}
}

// HandleUpgradeCommand handles TopicOTAUpgradeCommandMQTT events and publishes to device MQTT topic.
func (c *OTACommandConsumer) HandleUpgradeCommand(ctx context.Context, cmd *event.OTAUpgradeCommand, meta map[string]string) error {
	c.logger.Info("handling OTA upgrade command event",
		zap.String("device_key", cmd.DeviceKey),
		zap.String("batch_id", cmd.BatchID),
		zap.String("target_version", cmd.TargetVersion),
	)

	payload, err := json.Marshal(cmd)
	if err != nil {
		return fmt.Errorf("marshal OTA upgrade command: %w", err)
	}

	deviceName := cmd.DeviceName
	if deviceName == "" {
		deviceName = cmd.DeviceKey
	}
	topic := fmt.Sprintf("/ota/device/upgrade/%s/%s", cmd.ProductKey, deviceName)

	if c.client == nil || !c.client.IsConnected() {
		return fmt.Errorf("mqtt client not connected")
	}

	token := c.client.Publish(topic, 1, false, payload)
	if !token.WaitTimeout(10 * time.Second) {
		return fmt.Errorf("OTA mqtt publish timeout")
	}
	if err := token.Error(); err != nil {
		c.logger.Error("failed to publish OTA upgrade command to MQTT broker", zap.String("topic", topic), zap.Error(err))
		return err
	}

	c.logger.Info("successfully pushed OTA upgrade command to device via MQTT", zap.String("topic", topic))
	return nil
}
