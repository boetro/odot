// internal/api/routes.go
package api

import (
	"github.com/boetro/odot/internal/api/handlers"
	"github.com/boetro/odot/internal/api/middleware"
	"github.com/boetro/odot/internal/config"
	"github.com/boetro/odot/internal/db"
	"github.com/boetro/odot/internal/logger"
	"github.com/boetro/odot/ui"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// RegisterRoutes sets up all API route
func RegisterRoutes(r *gin.Engine, database *pgxpool.Pool, querier db.Querier, cfg *config.Config, logger logger.Logger) {
	// Add common middleware
	r.Use(middleware.RequestLogger(logger))
	r.Use(middleware.CORS())

	ui.AddRoutes(r)

	// Health check endpoint
	r.GET("/health", handlers.HealthCheck(database))

	// API routes
	api := r.Group("/api")
	{
		// Auth endpoints
		// Public endpoints
		authHandler := handlers.NewAuthHandler(querier, cfg, logger)
		auth := api.Group("/auth")
		{
			auth.GET("/google", authHandler.GoogleLogin)
			auth.GET("/google/callback", authHandler.GoogleCallback)
			auth.GET("/logout", authHandler.Logout)
			auth.POST("/refresh", authHandler.RefreshToken)
		}

		protected := api.Group("/")
		authMiddleware := middleware.NewAuthMiddleware(cfg, logger)
		protected.Use(authMiddleware.RequireAuth())
		{
			userHandler := handlers.NewUserHandler(querier, logger)
			protected.GET("/me", userHandler.GetUser)
		}
	}

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
