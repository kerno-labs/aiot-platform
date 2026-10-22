#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/0things-dev.XXXXXX")"
LOG_DIR="$RUN_DIR/logs"
mkdir -p "$LOG_DIR"

SERVICE_NAMES=(backend data-engine mqtt-transport frontend)
SERVICE_PIDS=()
LOG_TAIL_PID=""

cleanup() {
  local pid
  for pid in "${SERVICE_PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  for pid in "${SERVICE_PIDS[@]}"; do
    wait "$pid" 2>/dev/null || true
  done
  if [[ -n "$LOG_TAIL_PID" ]]; then
    kill "$LOG_TAIL_PID" 2>/dev/null || true
    wait "$LOG_TAIL_PID" 2>/dev/null || true
  fi
  rm -rf "$RUN_DIR"
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if ! command -v go >/dev/null 2>&1; then
  echo "需要先安装 Go。" >&2
  exit 1
fi
if ! command -v pnpm >/dev/null 2>&1; then
  echo "需要先安装 pnpm。" >&2
  exit 1
fi
if [[ ! -x "$ROOT_DIR/frontend/node_modules/.bin/vite" ]]; then
  echo "前端依赖未安装，请先运行：pnpm -C frontend install" >&2
  exit 1
fi

echo "Building local services..."
(
  cd "$ROOT_DIR/backend"
  go build -o "$RUN_DIR/backend" ./cmd/server
)
(
  cd "$ROOT_DIR/data-engine"
  go build -o "$RUN_DIR/data-engine" ./cmd/server
)
(
  cd "$ROOT_DIR/transport-mqtt"
  go build -o "$RUN_DIR/mqtt-transport" ./cmd/server
)

start_service() {
  local name="$1"
  local service_dir="$2"
  local executable="$3"
  shift 3

  : >"$LOG_DIR/$name.log"
  (
    cd "$service_dir"
    exec "$executable" "$@"
  ) >"$LOG_DIR/$name.log" 2>&1 &
  local pid="$!"
  SERVICE_PIDS+=("$pid")
  echo "Started $name (pid $pid)"
}

start_service backend "$ROOT_DIR/backend" "$RUN_DIR/backend" -conf "$ROOT_DIR/backend/config/local.yml"
start_service data-engine "$ROOT_DIR/data-engine" "$RUN_DIR/data-engine" -conf "$ROOT_DIR/data-engine/config/local.yml"
start_service mqtt-transport "$ROOT_DIR/transport-mqtt" "$RUN_DIR/mqtt-transport" -conf "$ROOT_DIR/transport-mqtt/config/local.yml"
start_service frontend "$ROOT_DIR/frontend" "$ROOT_DIR/frontend/node_modules/.bin/vite" --host 127.0.0.1

echo
echo "Frontend: http://127.0.0.1:5173"
echo "Press Ctrl-C to stop all services."
tail -n 0 -f \
  "$LOG_DIR/backend.log" \
  "$LOG_DIR/data-engine.log" \
  "$LOG_DIR/mqtt-transport.log" \
  "$LOG_DIR/frontend.log" &
LOG_TAIL_PID="$!"

while true; do
  for index in "${!SERVICE_PIDS[@]}"; do
    if ! kill -0 "${SERVICE_PIDS[$index]}" 2>/dev/null; then
      exit_code=0
      wait "${SERVICE_PIDS[$index]}" || exit_code="$?"
      echo "${SERVICE_NAMES[$index]} exited (code $exit_code). Stopping the remaining services." >&2
      exit "$exit_code"
    fi
  done
  sleep 1
done
