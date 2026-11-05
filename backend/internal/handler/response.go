package handler

import (
	"encoding/json"
	"strconv"
	"time"

	"github.com/dromara/carbon/v2"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func id(c *gin.Context) (int64, error) {
	return strconv.ParseInt(c.Param("id"), 10, 64)
}

func raw(value string) any {
	if len(value) == 0 {
		return ""
	}

	var legacyString string
	if json.Unmarshal([]byte(value), &legacyString) == nil {
		return legacyString
	}
	return value
}

func formatStdTime(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return carbon.CreateFromStdTime(value.Local()).ToDateTimeString()
}

func formatStdTimePtr(value *time.Time) *string {
	if value == nil || value.IsZero() {
		return nil
	}
	formatted := carbon.CreateFromStdTime(value.Local()).ToDateTimeString()
	return &formatted
}

func deletedAt(value gorm.DeletedAt) *string {
	if value.Valid {
		return formatStdTimePtr(&value.Time)
	}
	return nil
}
