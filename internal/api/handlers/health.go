// internal/api/handlers/health.go
package handlers

import (
	"context"
	"database/sql"
	"net/http"
	"runtime"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// HealthStatus represents the application health information
type HealthStatus struct {
	Status       string            `json:"status"`
	Version      string            `json:"version"`
	Environment  string            `json:"environment,omitempty"`
	Uptime       string            `json:"uptime"`
	GoVersion    string            `json:"go_version"`
	Memory       MemStats          `json:"memory"`
	Timestamp    time.Time         `json:"timestamp"`
	Dependencies map[string]string `json:"dependencies"`
}

// MemStats contains memory statistics
type MemStats struct {
	Alloc      uint64 `json:"alloc"`       // Bytes allocated and not yet freed
	TotalAlloc uint64 `json:"total_alloc"` // Bytes allocated (even if freed)
	Sys        uint64 `json:"sys"`         // Bytes obtained from system
	NumGC      uint32 `json:"num_gc"`      // Number of completed GC cycles
}

// ServiceStartTime keeps track of when the service started
var ServiceStartTime = time.Now()

// Version of the application, should be set during build
var Version = "development"

// Environment (development, staging, production)
var Environment = "development"

// @Summary Get application health status
// @Description Check the health of the application and its dependencies
// @Tags health
// @Produce json
// @Param simple query boolean false "Return a simplified health status"
// @Success 200 {object} HealthStatus "Status is healthy"
// @Success 200 {object} map[string]string "Simple status when simple=true and healthy"
// @Failure 503 {object} HealthStatus "Status is degraded"
// @Failure 503 {object} map[string]string "Simple status when simple=true and unhealthy"
// @Router /health [get]
func HealthCheck(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Only collect detailed stats for non-simple requests
		simple := c.Query("simple") == "true"

		dbStatus := "ok"
		dbErr := checkDBConnection(db)
		if dbErr != nil {
			dbStatus = "error: " + dbErr.Error()
			// If database is down and this is a simple check, return error status
			if simple {
				c.JSON(http.StatusServiceUnavailable, gin.H{
					"status": "error",
					"error":  "Database connection failed: " + dbErr.Error(),
				})
				return
			}
		}

		if simple {
			c.JSON(http.StatusOK, gin.H{
				"status": "ok",
			})
			return
		}

		// Get memory statistics
		var memStats runtime.MemStats
		runtime.ReadMemStats(&memStats)

		// Build dependency statuses
		dependencies := map[string]string{
			"database": dbStatus,
			// Add other dependencies here as needed
		}

		// Determine overall status
		overallStatus := "ok"
		for _, status := range dependencies {
			if status != "ok" {
				overallStatus = "degraded"
				c.Writer.WriteHeader(http.StatusServiceUnavailable)
				break
			}
		}

		status := HealthStatus{
			Status:      overallStatus,
			Version:     Version,
			Environment: Environment,
			Uptime:      time.Since(ServiceStartTime).String(),
			GoVersion:   runtime.Version(),
			Memory: MemStats{
				Alloc:      memStats.Alloc,
				TotalAlloc: memStats.TotalAlloc,
				Sys:        memStats.Sys,
				NumGC:      memStats.NumGC,
			},
			Timestamp:    time.Now(),
			Dependencies: dependencies,
		}

		c.JSON(c.Writer.Status(), status)
	}
}

func checkDBConnection(db *pgxpool.Pool) error {
	if db == nil {
		return nil // Skip check if DB is not provided
	}

	// Create a context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Perform a simple query to verify connectivity
	var result int
	err := db.QueryRow(ctx, "SELECT 1").Scan(&result)
	if err != nil {
		return err
	}

	// Check that we got the expected result
	if result != 1 {
		return sql.ErrNoRows
	}

	return nil
}
