#!/usr/bin/env bash

set -euo pipefail

# Simulate the Z03 advanced-model properties using Alink property reports.
# Usage: ./scripts/simulate_properties_mqtt.sh
# Preview: DRY_RUN=1 COUNT=1 ./scripts/simulate_properties_mqtt.sh
# Authentication: MQTT_USERNAME=... MQTT_PASSWORD=... ./scripts/simulate_properties_mqtt.sh
# Override MQTT_HOST, MQTT_PORT, PRODUCT_KEY, DEVICE_KEY, COUNT or INTERVAL as needed.

MQTT_HOST="${MQTT_HOST:-121.4.122.249}"
MQTT_PORT="${MQTT_PORT:-1883}"
PRODUCT_KEY="${PRODUCT_KEY:-2b591bc2-1e19-4b04-b3a7-9acc225388d6}"
DEVICE_KEY="${DEVICE_KEY:-155ef21f-d4e6-4b83-92b3-69a91f61bfac}"
COUNT="${COUNT:-10}"
INTERVAL="${INTERVAL:-2}"
DRY_RUN="${DRY_RUN:-0}"
TOPIC="/sys/thing/property/post/${PRODUCT_KEY}/${DEVICE_KEY}"

if [[ ! "$COUNT" =~ ^[1-9][0-9]*$ || ! "$INTERVAL" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
  echo "COUNT 必须为正整数，INTERVAL 必须为非负秒数。" >&2
  exit 1
fi

command -v python3 >/dev/null 2>&1 || {
  echo "未找到 python3，生成模拟 JSON 需要 Python 3。" >&2
  exit 1
}

mqtt_args=(-h "$MQTT_HOST" -p "$MQTT_PORT" -i "properties-sim-$$" -q 1 -t "$TOPIC")
if [[ -n "${MQTT_USERNAME:-}" ]]; then
  mqtt_args+=(-u "$MQTT_USERNAME")
fi
if [[ -n "${MQTT_PASSWORD:-}" ]]; then
  mqtt_args+=(-P "$MQTT_PASSWORD")
fi
if [[ "$DRY_RUN" != "1" ]]; then
  command -v mosquitto_pub >/dev/null 2>&1 || {
    echo "未找到 mosquitto_pub，请先安装 Mosquitto 客户端（macOS: brew install mosquitto）。" >&2
    exit 1
  }
fi

for ((i = 1; i <= COUNT; i++)); do
  payload="$(python3 - "$i" <<'PY'
import json
import random
import sys
import time

sequence = int(sys.argv[1])
now = time.time_ns() // 1_000_000
# Enum values follow the advanced model: 0=Standby, 1=Working, 2=Fault.
status = sequence % 2
params = {
    "location": {
        "value": {
            "lng": round(121.4737 + random.uniform(-0.001, 0.001), 6),
            "lat": round(31.2304 + random.uniform(-0.001, 0.001), 6),
            "speed": round(random.uniform(5, 30), 1) if status == 1 else 0,
        },
        "time": now,
    },
    "status": {"value": status, "time": now},
    "tags": {"value": ["simulation", "z03", f"sample-{sequence}"], "time": now},
}
print(json.dumps({
    "id": f"sim-{now}-{sequence}",
    "version": "1.0",
    "sys": {"ack": 0},
    "params": params,
    "method": "thing.event.property.post",
}, ensure_ascii=False, separators=(",", ":")))
PY
)"
  echo "[$i/$COUNT] ${MQTT_HOST}:${MQTT_PORT} ${TOPIC}"
  echo "$payload"
  if [[ "$DRY_RUN" != "1" ]]; then
    mosquitto_pub "${mqtt_args[@]}" -m "$payload"
    echo "MQTT QoS 1 发布已确认；数据库入库需在设备页面验证。"
  fi
  if ((i < COUNT)); then
    sleep "$INTERVAL"
  fi
done
