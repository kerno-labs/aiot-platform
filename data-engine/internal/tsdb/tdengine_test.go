package tsdb

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestPropertyTableName(t *testing.T) {
	temperature := propertyTableName("device1", "temperature")
	require.Equal(t, temperature, propertyTableName("device1", "temperature"))
	require.NotEqual(t, temperature, propertyTableName("device1", "humidity"))
	require.NotEqual(t, temperature, propertyTableName("device2", "temperature"))
	require.NotEqual(t, propertyTableName("a_b", "c"), propertyTableName("a", "b_c"))
	require.Regexp(t, `^p_[a-f0-9]{64}$`, propertyTableName("device/'1", "temperature"))
}

// Run against a disposable TDengine instance with TDENGINE_TEST_DSN set.
func TestTDenginePropertyStorage(t *testing.T) {
	dsn := os.Getenv("TDENGINE_TEST_DSN")
	if dsn == "" {
		t.Skip("TDENGINE_TEST_DSN is not configured")
	}
	db, err := sql.Open("taosWS", dsn)
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, db.Close()) })
	database := fmt.Sprintf("alink_test_%d", time.Now().UnixNano())
	t.Cleanup(func() { _, err := db.Exec("DROP DATABASE IF EXISTS " + database); require.NoError(t, err) })
	logger := zap.NewNop()
	initTDengineSTable(db, database, logger)
	client := &TDengineClient{db: db, dbName: database, logger: logger, enabled: true}
	ts := time.Now().UnixMilli()
	location := map[string]interface{}{"latitude": 31.2304, "longitude": 121.4737}
	client.flushBatch([]Record{
		{DeviceKey: "device1", Metric: "temperature", Value: 26.51234567, Timestamp: ts},
		{DeviceKey: "device1", Metric: "humidity", Value: 60.0, Timestamp: ts},
		{DeviceKey: "device1", Metric: "location", Value: location, Timestamp: ts + 1},
	})
	for metric, value := range map[string]interface{}{"temperature": 26.51234567, "humidity": 60.0, "location": location} {
		points, err := client.QueryPoints(context.Background(), QueryFilter{DeviceKey: "device1", Metric: metric, StartTime: ts - 1, EndTime: ts + 2})
		require.NoError(t, err)
		require.Len(t, points, 1, metric)
		require.Equal(t, value, points[0].Value)
		expectedTS := ts
		if metric == "location" {
			expectedTS++
		}
		require.Equal(t, expectedTS, points[0].Timestamp)
	}
	// Historical per-device tables remain readable through the same supertable.
	_, err = db.Exec(fmt.Sprintf("INSERT INTO %s.d_legacy USING %s.device_properties TAGS ('legacy') VALUES (%d, 'temperature', 22.5, NULL, NULL, NULL)", database, database, ts))
	require.NoError(t, err)
	points, err := client.QueryPoints(context.Background(), QueryFilter{DeviceKey: "legacy", Metric: "temperature", StartTime: ts - 1, EndTime: ts + 2})
	require.NoError(t, err)
	require.Len(t, points, 1)
	require.Equal(t, 22.5, points[0].Value)
}
