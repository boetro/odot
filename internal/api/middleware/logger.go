// internal/api/middleware/logger.go
package middleware

import (
	"time"

	"github.com/boetro/odot/internal/logger"
	"github.com/gin-gonic/gin"
)

// RequestLogger middleware logs information about each request
func RequestLogger(log logger.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Start timer
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		// Process request
		c.Next()

		// Calculate latency
		latency := time.Since(start)

		// Get status code
		statusCode := c.Writer.Status()

		// Log details about the request
		log.Info("Request completed",
			"method", method,
			"path", path,
			"status", statusCode,
			"latency", latency,
			"client_ip", c.ClientIP(),
			"user_agent", c.Request.UserAgent(),
		)
	}
}
