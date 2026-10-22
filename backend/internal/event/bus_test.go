package event

import (
	"bytes"
	"context"
	"encoding/json"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/IBM/sarama"
	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/spf13/viper"
	"go.uber.org/zap"
)

func TestNewBusRejectsNonKafkaDriver(t *testing.T) {
	for _, driver := range []string{"nats", "unknown"} {
		t.Run(driver, func(t *testing.T) {
			conf := viper.New()
			conf.Set("event.driver", driver)
			pub, sub, err := NewBus(conf, zap.NewNop())
			if err == nil || pub != nil || sub != nil {
				t.Fatal("unsupported event driver must fail before opening a connection")
			}
		})
	}
}

func TestKafkaEventDelivery(t *testing.T) {
	brokerList := os.Getenv("AIOT_TEST_KAFKA_BROKERS")
	if brokerList == "" {
		t.Skip("set AIOT_TEST_KAFKA_BROKERS to run against a real Kafka broker")
	}
	brokers := strings.Split(brokerList, ",")
	config := sarama.NewConfig()
	config.Version = sarama.V4_0_0_0
	admin, err := sarama.NewClusterAdmin(brokers, config)
	if err != nil {
		t.Fatal(err)
	}
	topic := Topic("event-delivery-" + watermill.NewUUID())
	if err := admin.CreateTopic(topic.String(), &sarama.TopicDetail{NumPartitions: 3, ReplicationFactor: 1}, false); err != nil {
		admin.Close()
		t.Fatal(err)
	}
	t.Cleanup(func() {
		admin.DeleteTopic(topic.String())
		admin.Close()
	})

	conf := viper.New()
	conf.Set("event.kafka.brokers", brokers)
	// Omit event.driver and consumer_group to exercise the service defaults.
	pub, first, err := NewBus(conf, zap.NewNop())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { pub.Close(); first.Close() })

	payload := DeviceMessage{
		DeviceKey: "kafka-migration-test", Transport: TransportMQTT,
		MessageType: MessageTypeTelemetry,
		Payload:     json.RawMessage(`{"temperature":25}`), Timestamp: time.Now().UnixMilli(),
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	// Publish before either consumer starts; both groups must receive this retained event.
	if err := NewProducer(pub).Publish(ctx, topic, payload); err != nil {
		t.Fatal(err)
	}
	conf.Set("event.kafka.consumer_group", "independent-"+watermill.NewUUID())
	otherPub, second, err := NewBus(conf, zap.NewNop())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { otherPub.Close(); second.Close() })
	expected, err := json.Marshal(payload)
	if err != nil {
		t.Fatal(err)
	}
	for _, subscriber := range []message.Subscriber{first, second} {
		messages, err := subscriber.Subscribe(ctx, topic.String())
		if err != nil {
			t.Fatal(err)
		}
		select {
		case msg, ok := <-messages:
			if !ok || msg == nil {
				t.Fatal("consumer closed before delivering the retained event")
			}
			if msg.UUID == "" || !bytes.Equal(msg.Payload, expected) {
				t.Fatalf("unexpected Kafka event: UUID=%q payload=%s", msg.UUID, msg.Payload)
			}
			msg.Ack()
		case <-ctx.Done():
			t.Fatal("consumer did not receive the retained event: ", ctx.Err())
		}
	}
}
