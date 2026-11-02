package tsdb

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	_ "github.com/taosdata/driver-go/v3/taosWS"
	"go.uber.org/zap"
)

// TDengineConfig TDengine 数据库专属配置结构体
type TDengineConfig struct {
	DSN      string `mapstructure:"dsn" yaml:"dsn" json:"dsn"`                // 格式: root:taosdata@ws(127.0.0.1:6041)/things_tsdb
	Database string `mapstructure:"database" yaml:"database" json:"database"` // 数据库名 (默认: things_tsdb)
	Table    string `mapstructure:"table" yaml:"table" json:"table"`          // 超级表名 (默认: device_properties)
}

// TDengineClient 基于 TDengine 官方原生纯 Go WebSocket 驱动 (github.com/taosdata/driver-go/v3/taosWS)。
// 无需任何 CGO / 本地 C 动态库，支持官方连接池管理、自动建库建超级表与全双工高并发写入/查询。
type TDengineClient struct {
	db       *sql.DB
	dbName   string
	logger   *zap.Logger
	ch       chan Record
	stopChan chan struct{}
	mu       sync.Mutex
	enabled  bool
}

func NewTDengineClient(cfg TDengineConfig, logger *zap.Logger) *TDengineClient {
	rawDSN := cfg.DSN
	dbName := cfg.Database
	if dbName == "" {
		dbName = "things_tsdb"
	}

	wsDSN := formatTaosWSDSN(rawDSN, dbName)

	var db *sql.DB
	var err error
	enabled := rawDSN != ""

	if enabled {
		db, err = sql.Open("taosWS", wsDSN)
		if err != nil {
			logger.Error("failed to open TDengine taosWS driver", zap.Error(err))
			enabled = false
		} else {
			db.SetMaxOpenConns(50)
			db.SetMaxIdleConns(20)
			db.SetConnMaxLifetime(5 * time.Minute)

			logger.Info("TDengine official taosWS driver initialized",
				zap.String("dsn", wsDSN),
				zap.String("database", dbName),
			)
			// 自动建库与超级表
			go func() {
				time.Sleep(1 * time.Second)
				initTDengineSTable(db, dbName, logger)
			}()
		}
	} else {
		logger.Info("TDengine DSN not configured, running in fallback mode")
	}

	c := &TDengineClient{
		db:       db,
		dbName:   dbName,
		logger:   logger,
		ch:       make(chan Record, 10000),
		stopChan: make(chan struct{}),
		enabled:  enabled,
	}

	go c.batchFlushLoop()

	return c
}

// formatTaosWSDSN 将配置的 DSN 统一转换为官方 taosWS 标准格式: "user:pass@ws(host:port)/dbName"
func formatTaosWSDSN(rawDSN, dbName string) string {
	if rawDSN == "" {
		return fmt.Sprintf("root:taosdata@ws(127.0.0.1:6041)/%s", dbName)
	}

	if strings.Contains(rawDSN, "@ws(") {
		return rawDSN
	}

	user := "root"
	pass := "taosdata"
	host := "127.0.0.1:6041"

	if strings.Contains(rawDSN, "@") {
		parts := strings.Split(rawDSN, "@")
		if creds := strings.Split(parts[0], ":"); len(creds) == 2 {
			user = creds[0]
			pass = creds[1]
		}
		hostPart := parts[1]
		hostPart = strings.TrimPrefix(hostPart, "http://")
		hostPart = strings.TrimPrefix(hostPart, "https://")
		hostPart = strings.TrimPrefix(hostPart, "ws://")
		hostPart = strings.TrimPrefix(hostPart, "http(")
		hostPart = strings.TrimPrefix(hostPart, "tcp(")
		if idx := strings.Index(hostPart, ")"); idx != -1 {
			hostPart = hostPart[:idx]
		}
		if idx := strings.Index(hostPart, "/"); idx != -1 {
			hostPart = hostPart[:idx]
		}
		host = hostPart
	} else {
		h := strings.TrimPrefix(rawDSN, "http://")
		h = strings.TrimPrefix(h, "ws://")
		if idx := strings.Index(h, "/"); idx != -1 {
			h = h[:idx]
		}
		host = h
	}

	return fmt.Sprintf("%s:%s@ws(%s)/%s", user, pass, host, dbName)
}

// initTDengineSTable 自动向 TDengine 发送 DDL 创建时序数据库与通用超级表 (STable)
func initTDengineSTable(db *sql.DB, dbName string, logger *zap.Logger) {
	if db == nil {
		return
	}

	// 1. 创建数据库
	createDBSQL := fmt.Sprintf("CREATE DATABASE IF NOT EXISTS %s PRECISION 'ms' KEEP 365 DURATION 10 BUFFER 16;", dbName)
	if _, err := db.Exec(createDBSQL); err != nil {
		logger.Warn("TDengine DDL create database note (may already exist or connecting)", zap.Error(err))
	}

	// 2. 创建通用超级表 (STable: device_properties)
	createSTableSQL := fmt.Sprintf(`CREATE STABLE IF NOT EXISTS %s.device_properties (
		ts TIMESTAMP,
		property_id VARCHAR(64),
		num_value DOUBLE,
		str_value VARCHAR(1024),
		bool_value TINYINT,
		json_value NCHAR(4096)
	) TAGS (
		device_key VARCHAR(64)
	);`, dbName)

	if _, err := db.Exec(createSTableSQL); err != nil {
		logger.Warn("TDengine DDL create STable note", zap.Error(err))
	} else {
		logger.Info("✓ TDengine official driver verified STable device_properties successfully")
	}
}

func (c *TDengineClient) WriteBatch(ctx context.Context, records []Record) error {
	if len(records) == 0 {
		return nil
	}

	for _, rec := range records {
		select {
		case c.ch <- rec:
		default:
			c.logger.Warn("TDengine queue full, dropping record", zap.String("device_key", rec.DeviceKey))
		}
	}
	return nil
}

// QueryPoints 通过官方 taosWS 连接池执行真实 SQL 查询并提取时序数据点
func (c *TDengineClient) QueryPoints(ctx context.Context, filter QueryFilter) ([]Point, error) {
	limit := filter.Limit
	if limit <= 0 || limit > 1000 {
		limit = 100
	}

	endTime := filter.EndTime
	if endTime <= 0 {
		endTime = time.Now().UnixMilli()
	}

	startTime := filter.StartTime
	if startTime <= 0 {
		startTime = endTime - 24*3600*1000
	}

	escapedDevice := strings.ReplaceAll(filter.DeviceKey, "'", "''")
	escapedMetric := strings.ReplaceAll(filter.Metric, "'", "''")
	order := "ASC"
	if filter.Descending {
		order = "DESC"
	}
	sqlStr := fmt.Sprintf("SELECT ts, property_id, num_value, str_value, bool_value, json_value FROM %s.device_properties WHERE device_key = '%s' AND property_id = '%s' AND ts >= %d AND ts <= %d ORDER BY ts %s LIMIT %d;",
		c.dbName, escapedDevice, escapedMetric, startTime, endTime, order, limit)

	if c.enabled && c.db != nil {
		rows, err := c.db.QueryContext(ctx, sqlStr)
		if err == nil {
			defer rows.Close()
			points := make([]Point, 0)
			for rows.Next() {
				var ts time.Time
				var propID string
				var numVal sql.NullFloat64
				var strVal sql.NullString
				var boolVal sql.NullInt64
				var jsonVal sql.NullString

				if scanErr := rows.Scan(&ts, &propID, &numVal, &strVal, &boolVal, &jsonVal); scanErr == nil {
					var val interface{}
					if jsonVal.Valid && jsonVal.String != "" {
						val = UnmarshalJSONValue(jsonVal.String)
					} else if boolVal.Valid {
						val = boolVal.Int64 == 1
					} else if numVal.Valid {
						val = numVal.Float64
					} else if strVal.Valid {
						val = strVal.String
					}

					points = append(points, Point{
						Timestamp: ts.UnixMilli(),
						Metric:    propID,
						Value:     val,
					})
				}
			}
			if len(points) > 0 {
				return points, nil
			}
		}
	}

	return nil, nil
}

func (c *TDengineClient) batchFlushLoop() {
	ticker := time.NewTicker(200 * time.Millisecond)
	defer ticker.Stop()

	batch := make([]Record, 0, 500)

	for {
		select {
		case <-c.stopChan:
			c.flushBatch(batch)
			return
		case rec := <-c.ch:
			batch = append(batch, rec)
			if len(batch) >= 500 {
				c.flushBatch(batch)
				batch = make([]Record, 0, 500)
			}
		case <-ticker.C:
			if len(batch) > 0 {
				c.flushBatch(batch)
				batch = make([]Record, 0, 500)
			}
		}
	}
}

// A subtable represents one device/property time series so simultaneous attributes cannot overwrite each other.
func propertyTableName(deviceKey, metric string) string {
	return fmt.Sprintf("p_%x", sha256.Sum256([]byte(deviceKey+"\x00"+metric)))
}

// flushBatch 通过官方 taosWS 连接池执行批量 SQL 插入
func (c *TDengineClient) flushBatch(batch []Record) {
	if len(batch) == 0 {
		return
	}

	var sqlBuilder strings.Builder
	sqlBuilder.WriteString("INSERT INTO ")

	for _, rec := range batch {
		tableName := propertyTableName(rec.DeviceKey, rec.Metric)
		ts := rec.Timestamp
		numVal, strVal, boolVal, jsonVal := ToTypedValue(rec.Value)

		numStr := "NULL"
		if numVal != nil {
			numStr = strconv.FormatFloat(*numVal, 'g', -1, 64)
		}
		strStr := "NULL"
		if strVal != nil {
			strStr = fmt.Sprintf("'%s'", strings.ReplaceAll(*strVal, "'", "''"))
		}
		boolStr := "NULL"
		if boolVal != nil {
			if *boolVal {
				boolStr = "1"
			} else {
				boolStr = "0"
			}
		}
		jsonStr := "NULL"
		if jsonVal != nil {
			jsonStr = fmt.Sprintf("'%s'", strings.ReplaceAll(*jsonVal, "'", "''"))
		}

		escapedDevKey := strings.ReplaceAll(rec.DeviceKey, "'", "''")
		escapedMetric := strings.ReplaceAll(rec.Metric, "'", "''")

		sqlBuilder.WriteString(fmt.Sprintf("%s.%s USING %s.device_properties TAGS ('%s') VALUES (%d, '%s', %s, %s, %s, %s) ",
			c.dbName, tableName, c.dbName, escapedDevKey, ts, escapedMetric, numStr, strStr, boolStr, jsonStr))
	}

	sqlStr := sqlBuilder.String()
	c.logger.Debug("persisting batch to TDengine via official taosWS driver", zap.Int("count", len(batch)))

	if c.enabled && c.db != nil {
		if _, err := c.db.Exec(sqlStr); err != nil {
			c.logger.Error("failed to write batch via official taosWS", zap.Error(err))
		}
	}
}

func (c *TDengineClient) Close() error {
	close(c.stopChan)
	if c.db != nil {
		return c.db.Close()
	}
	return nil
}
