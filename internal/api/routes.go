// internal/api/routes.go
package api

import (
	"github.com/boetro/odot/internal/api/handlers"
	"github.com/boetro/odot/internal/api/middleware"
	"github.com/boetro/odot/internal/config"
	"github.com/boetro/odot/internal/db"
	"github.com/boetro/odot/internal/logger"
	"github.com/boetro/odot/internal/vision"
	"github.com/boetro/odot/internal/webpush"
	"github.com/boetro/odot/ui"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// RegisterRoutes sets up all API route
func RegisterRoutes(r *gin.Engine, database *pgxpool.Pool, querier db.Querier, cfg *config.Config, logger logger.Logger, pushService *webpush.Service, visionService vision.VisionService) {
	// Add common middleware
	r.Use(middleware.RequestLogger(logger))
	r.Use(middleware.CORS(cfg))

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
		// User Handler
		{
			userHandler := handlers.NewUserHandler(querier, cfg, logger)
			protected.GET("/me", userHandler.GetUser)
		}
		// Project Handler
		{
			projectHandler := handlers.NewProjectHandler(querier, logger)
			protected.GET("/projects", projectHandler.ListProjects)
			protected.POST("/projects", projectHandler.CreateProject)
			protected.PUT("/projects/:id", projectHandler.UpdateProject)
		}
		// TODO handler
		{
			todoHandler := handlers.NewTodoHandler(querier, logger)
			protected.GET("/todos", todoHandler.ListUserTodos)
			protected.POST("/todos", todoHandler.CreateTodo)
			protected.PUT("/todos/:todoId", todoHandler.UpdateTodo)
			protected.GET("/todos/:todoId", todoHandler.GetTodo)
		}
		// Push notification handler
		{
			pushHandler := handlers.NewPushHandler(querier, logger, pushService)
			// Public endpoint for VAPID key
			api.GET("/push/vapid-public-key", pushHandler.GetVAPIDPublicKey)
			// Protected endpoints
			protected.POST("/push/subscribe", pushHandler.Subscribe)
			protected.POST("/push/send", pushHandler.SendNotification)
		}
		// Image handler
		{
			imageHandler := handlers.NewImageHandler(visionService, logger)
			protected.POST("/image/text", imageHandler.ImageToText)
		}
	}
}
