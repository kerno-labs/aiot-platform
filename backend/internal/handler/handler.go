package handler

import (
	"aiot-backend/internal/middleware"
	"aiot-backend/pkg/log"

	"github.com/dromara/carbon/v2"
	"github.com/gin-gonic/gin"
)

func init() {
	carbon.SetDefault(carbon.Default{
		Layout:   carbon.DateTimeLayout,
		Timezone: carbon.Local,
	})
}

type Handler struct {
	logger *log.Logger
}

func NewHandler(logger *log.Logger) *Handler {
	return &Handler{logger: logger}
}

// userIDFromContext reads the subject populated by the Logto middleware.
func userIDFromContext(ctx *gin.Context) string {
	value, exists := ctx.Get(middleware.UserIDKey)
	if !exists {
		return ""
	}
	userID, _ := value.(string)
	return userID
}
