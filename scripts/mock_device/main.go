package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

// ANSI 颜色常量
const (
	ColorReset  = "\033[0m"
	ColorRed    = "\033[31m"
	ColorGreen  = "\033[32m"
	ColorYellow = "\033[33m"
	ColorBlue   = "\033[34m"
	ColorCyan   = "\033[36m"
	ColorBold   = "\033[1m"
)

func main() {
	var (
		productKey   = flag.String("product", "mock_product_01", "Product unique key")
		deviceKey    = flag.String("device", "mock_sensor_01", "Device unique key")
		mqttBroker   = flag.String("broker", "tcp://127.0.0.1:1883", "MQTT Broker URI")
		httpGateway  = flag.String("http", "http://127.0.0.1:8081", "HTTP Transport Gateway URL")
		interval     = flag.Int("interval", 3, "Telemetry upload interval in seconds")
		triggerAlarm = flag.Bool("alarm", false, "Simulate high temperature alarm (88.8°C)")
		mode         = flag.String("mode", "mqtt", "Transport mode: 'mqtt' or 'http'")
	)
	flag.Parse()

	fmt.Println(ColorBold + ColorCyan + "==============================================================================" + ColorReset)
	fmt.Printf(ColorBold+ColorCyan+"  🚀 0things 虚拟设备模拟器启动 (Device: %s, Mode: %s)\n"+ColorReset, *deviceKey, *mode)
	fmt.Println(ColorBold + ColorCyan + "==============================================================================" + ColorReset)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if *mode == "mqtt" {
		runMQTTSimulator(ctx, *mqttBroker, *productKey, *deviceKey, *interval, *triggerAlarm)
	} else {
		runHTTPSimulator(ctx, *httpGateway, *deviceKey, *interval, *triggerAlarm)
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	fmt.Println("\n" + ColorYellow + "🛑 正在停止设备模拟器..." + ColorReset)
	cancel()
	time.Sleep(500 * time.Millisecond)
	fmt.Println(ColorGreen + "✓ 设备模拟器已安全退出。" + ColorReset)
}

// runMQTTSimulator 运行基于 MQTT 的全双工设备模拟器（支持遥测上报 + OTA 升级监听）
func runMQTTSimulator(ctx context.Context, broker, productKey, deviceKey string, interval int, triggerAlarm bool) {
	opts := mqtt.NewClientOptions()
	opts.AddBroker(broker)
	opts.SetClientID(fmt.Sprintf("mock_%s_%d", deviceKey, time.Now().Unix()))
	opts.SetAutoReconnect(true)

	client := mqtt.NewClient(opts)
	fmt.Printf(ColorBlue+"→ 正在连接 MQTT Broker: %s ... "+ColorReset, broker)
	if token := client.Connect(); token.WaitTimeout(3*time.Second) && token.Error() != nil {
		fmt.Printf(ColorRed+"✗ 连接失败 (%v)，降级为 HTTP 模拟模式。\n"+ColorReset, token.Error())
		go runHTTPSimulator(ctx, "http://127.0.0.1:8081", deviceKey, interval, triggerAlarm)
		return
	}
	fmt.Println(ColorGreen + "✓ MQTT 连接成功！" + ColorReset)

	// 1. 订阅 OTA 升级下发主题
	// EMQX republishes commands to /ota/device/upgrade/{product_key}/{device_name}, and this
	// simulator does not know its own device_name, so it filters the command payload instead.
	otaUpgradeTopic := fmt.Sprintf("/ota/device/upgrade/%s/+", productKey)
	otaProgressTopic := fmt.Sprintf("/sys/ota/device/progress/%s/%s", productKey, deviceKey)

	client.Subscribe(otaUpgradeTopic, 1, func(c mqtt.Client, m mqtt.Message) {
		var command struct {
			BatchID    string `json:"batch_id"`
			DeviceKey  string `json:"device_key"`
			DeviceName string `json:"device_name"`
		}
		if err := json.Unmarshal(m.Payload(), &command); err != nil {
			fmt.Printf(ColorRed+"✗ [OTA 指令解析失败] %v\n"+ColorReset, err)
			return
		}
		if command.DeviceKey != deviceKey && command.DeviceName != deviceKey {
			return
		}

		fmt.Println("\n" + ColorBold + ColorYellow + "📦 [OTA 指令到来] 收到云端下发的固件升级包！" + ColorReset)
		fmt.Printf(ColorYellow+"  载荷内容: %s\n"+ColorReset, string(m.Payload()))

		// 模拟异步固件升级进度条流转 (10% -> 40% -> 75% -> 100%)
		go simulateOTAProgress(c, otaProgressTopic, command.BatchID)
	})
	fmt.Printf(ColorGreen+"✓ 已监听 OTA 升级指令主题: %s\n"+ColorReset, otaUpgradeTopic)

	// 2. 定时上报遥测数据
	telemetryTopic := fmt.Sprintf("/sys/thing/property/post/%s/%s", productKey, deviceKey)
	fmt.Printf(ColorGreen+"✓ 遥测上报目标主题: %s (每 %d 秒上报一次)\n\n"+ColorReset, telemetryTopic, interval)

	ticker := time.NewTicker(time.Duration(interval) * time.Second)
	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				temp := 22.0 + rand.Float64()*8.0
				if triggerAlarm {
					temp = 88.8 // 触发高温告警
				}
				humidity := 45.0 + rand.Float64()*25.0
				voltage := 220.0 + (rand.Float64()-0.5)*5.0

				now := time.Now().UnixMilli()
				payload := map[string]interface{}{
					"id":      fmt.Sprintf("%d", now),
					"version": "1.0",
					"sys":     map[string]interface{}{"ack": 0},
					"params": map[string]interface{}{
						"temperature": map[string]interface{}{"value": float64(int(temp*10)) / 10.0, "time": now},
						"humidity":    map[string]interface{}{"value": float64(int(humidity*10)) / 10.0, "time": now},
						"voltage":     map[string]interface{}{"value": float64(int(voltage*10)) / 10.0, "time": now},
					},
					"method": "thing.event.property.post",
				}
				bytesData, _ := json.Marshal(payload)

				token := client.Publish(telemetryTopic, 1, false, bytesData)
				token.Wait()

				if temp > 70.0 {
					fmt.Printf(ColorRed+"🔥 [MQTT 遥测上报 (告警)] %s -> %s\n"+ColorReset, telemetryTopic, string(bytesData))
				} else {
					fmt.Printf(ColorCyan+"📡 [MQTT 遥测上报] %s -> %s\n"+ColorReset, telemetryTopic, string(bytesData))
				}
			}
		}
	}()
}

// simulateOTAProgress 模拟设备收到固件后的烧录进度回报
func simulateOTAProgress(client mqtt.Client, progressTopic, batchID string) {
	steps := []struct {
		step int
		desc string
	}{
		{10, "downloading firmware (10%)..."},
		{50, "download complete, verifying md5 (50%)..."},
		{80, "burning firmware to flash (80%)..."},
		{100, "firmware upgrade success, rebooting (100%)"},
	}

	for _, s := range steps {
		time.Sleep(1500 * time.Millisecond)
		progressPayload, _ := json.Marshal(map[string]interface{}{
			"batch_id": batchID,
			"step":     s.step,
			"desc":     s.desc,
			"module":   "default",
		})
		client.Publish(progressTopic, 1, false, progressPayload)
		fmt.Printf(ColorGreen+"  🚀 [OTA 进度回报] %d%% - %s\n"+ColorReset, s.step, s.desc)
	}
	fmt.Println(ColorBold + ColorGreen + "✨ [OTA 完成] 设备已成功刷新固件版本！" + ColorReset)
}

// runHTTPSimulator 运行基于 HTTP 协议网关的遥测模拟器
func runHTTPSimulator(ctx context.Context, gateway, deviceKey string, interval int, triggerAlarm bool) {
	url := fmt.Sprintf("%s/api/v1/%s/telemetry", gateway, deviceKey)
	fmt.Printf(ColorGreen+"✓ HTTP 上报目标接口: %s (每 %d 秒上报一次)\n\n"+ColorReset, url, interval)

	ticker := time.NewTicker(time.Duration(interval) * time.Second)
	defer ticker.Stop()

	httpClient := &http.Client{Timeout: 3 * time.Second}

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			temp := 23.5 + rand.Float64()*5.0
			if triggerAlarm {
				temp = 88.8
			}
			payload := map[string]interface{}{
				"temperature": float64(int(temp*10)) / 10.0,
				"humidity":    55.2,
				"voltage":     220.1,
			}
			bytesData, _ := json.Marshal(payload)

			resp, err := httpClient.Post(url, "application/json", bytes.NewReader(bytesData))
			if err != nil {
				fmt.Printf(ColorYellow+"⚠️ [HTTP 上报重试] 接口未响应: %v\n"+ColorReset, err)
			} else {
				body, _ := io.ReadAll(resp.Body)
				resp.Body.Close()
				fmt.Printf(ColorCyan+"⚡ [HTTP 遥测上报 200] %s (Resp: %s)\n"+ColorReset, string(bytesData), string(body))
			}
		}
	}
}
