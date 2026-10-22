package event

import (
	"fmt"
	"strings"

	"github.com/IBM/sarama"
	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill-kafka/v3/pkg/kafka"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/spf13/viper"
	"go.uber.org/zap"
)

// NewBus creates the Kafka event publisher and subscriber.
func NewBus(conf *viper.Viper, logger *zap.Logger) (message.Publisher, message.Subscriber, error) {
	brokers := []string{"127.0.0.1:9092"}
	consumerGroup := "aiot-data-engine"
	if conf != nil {
		if driver := strings.ToLower(conf.GetString("event.driver")); driver != "" && driver != "kafka" {
			return nil, nil, fmt.Errorf("unsupported event driver: %s (expected kafka)", driver)
		}
		if configured := conf.GetStringSlice("event.kafka.brokers"); len(configured) > 0 {
			brokers = configured
		}
		if configured := conf.GetString("event.kafka.consumer_group"); configured != "" {
			consumerGroup = configured
		}
	}
	return NewKafkaBus(brokers, consumerGroup, logger)
}

// NewKafkaBus creates an Apache Kafka Publisher and Subscriber.
func NewKafkaBus(brokers []string, consumerGroup string, logger *zap.Logger) (message.Publisher, message.Subscriber, error) {
	watermillLogger := watermill.NopLogger{}
	publisherConfig := kafka.DefaultSaramaSyncPublisherConfig()
	publisherConfig.Version = sarama.V4_0_0_0
	publisherConfig.Producer.RequiredAcks = sarama.WaitForAll
	subscriberConfig := kafka.DefaultSaramaSubscriberConfig()
	subscriberConfig.Version = sarama.V4_0_0_0
	// Resume committed offsets; a new group must also receive events published before startup.
	subscriberConfig.Consumer.Offsets.Initial = sarama.OffsetOldest

	pub, err := kafka.NewPublisher(kafka.PublisherConfig{
		Brokers:               brokers,
		Marshaler:             kafka.DefaultMarshaler{},
		OverwriteSaramaConfig: publisherConfig,
	}, watermillLogger)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create Kafka publisher: %w", err)
	}

	sub, err := kafka.NewSubscriber(kafka.SubscriberConfig{
		Brokers:               brokers,
		Unmarshaler:           kafka.DefaultMarshaler{},
		ConsumerGroup:         consumerGroup,
		OverwriteSaramaConfig: subscriberConfig,
	}, watermillLogger)
	if err != nil {
		_ = pub.Close()
		return nil, nil, fmt.Errorf("failed to create Kafka subscriber: %w", err)
	}

	return pub, sub, nil
}
