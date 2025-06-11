// internal/api/routes.go
package api

import (
	"database/sql"

	"github.com/boetro/odot/internal/api/handlers"
	"github.com/boetro/odot/internal/api/middleware"
	"github.com/boetro/odot/internal/logger"
	"github.com/boetro/odot/ui"
	"github.com/gin-gonic/gin"
)

// RegisterRoutes sets up all API route
func RegisterRoutes(r *gin.Engine, db *sql.DB, logger logger.Logger) {
	// Add common middleware
	r.Use(middleware.RequestLogger(logger))
	r.Use(middleware.CORS())

	ui.AddRoutes(r)

	// Health check endpoint
	r.GET("/health", handlers.HealthCheck(db))

	// API routes
	// api := r.Group("/api/v1")
	// {
	// 	// Auth endpoints
	// 	auth := api.Group("/auth")
	// 	{
	// 		auth.POST("/register", handlers.Register(db, logger))
	// 		auth.POST("/login", handlers.Login(db, logger))
	// 	}

	// 	// Protected routes with JWT auth
	// 	protected := api.Group("/")
	// 	protected.Use(middleware.JWTAuth())
	// 	{
	// 		// User routes
	// 		users := protected.Group("/users")
	// 		{
	// 			users.GET("/me", handlers.GetCurrentUser())
	// 			users.PUT("/me", handlers.UpdateUser(db, logger))
	// 		}

	// 		// Add your SaaS-specific routes here
	// 		// For example:
	// 		// subscriptions := protected.Group("/subscriptions")
	// 		// {
	// 		//     subscriptions.GET("/", handlers.ListSubscriptions())
	// 		//     subscriptions.POST("/", handlers.CreateSubscription())
	// 		// }
	// 	}
	// }
}
