// cmd/server/main.go

//	@title			ODOT API
//	@version		1.0
//	@description	A todo and project management API
//	@termsOfService	http://swagger.io/terms/

//	@contact.name	API Support
//	@contact.url	http://www.swagger.io/support
//	@contact.email	support@swagger.io

//	@license.name	Apache 2.0
//	@license.url	http://www.apache.org/licenses/LICENSE-2.0.html

//	@host		localhost:8080
//	@BasePath	/api

//	@securityDefinitions.apikey	BearerAuth
//	@in							header
//	@name						Authorization
//	@description				Type "Bearer" followed by a space and JWT token.

package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/boetro/odot/cmd/docs"
	"github.com/boetro/odot/internal/api"
	"github.com/boetro/odot/internal/api/opentelemetry"
	"github.com/boetro/odot/internal/config"
	"github.com/boetro/odot/internal/db"
	"github.com/boetro/odot/internal/logger"
	"github.com/boetro/odot/internal/vision"
	"github.com/boetro/odot/internal/webpush"
	"github.com/boetro/odot/ui"
	"github.com/gin-gonic/gin"
	swaggerfiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
)

func main() {
	ctx := context.Background()
	// Initialize configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	cleanup := opentelemetry.InitTracer(cfg)
	defer cleanup(ctx)

	// Initialize logger
	logger := logger.New(cfg.LogLevel)

	// Initialize database connection pool
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Fatal("Failed to connect to database", "error", err)
	}
	defer pool.Close()

	queries := db.New(pool)

	// Initialize VAPID keys if not provided in config
	var vapidKeys *webpush.VAPIDKeys
	if cfg.VAPIDPublicKey != "" && cfg.VAPIDPrivateKey != "" {
		vapidKeys = &webpush.VAPIDKeys{
			PublicKey:  cfg.VAPIDPublicKey,
			PrivateKey: cfg.VAPIDPrivateKey,
		}
	}

	// Initialize webpush service
	pushService := webpush.NewService(vapidKeys, cfg.VAPIDSubject)

	// Initialize vision service
	visionService, err := vision.NewGoogleGeminiVisionClient(ctx, cfg)
	if err != nil {
		logger.Fatal("Failed to initialize vision service", "error", err)
	}

	// Set up Gin router
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(otelgin.Middleware(cfg.ServiceName))

	docs.SwaggerInfo.BasePath = "/"

	// Register all routes
	api.RegisterRoutes(router, pool, queries, cfg, logger, pushService, visionService)
	// Add docs routes
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerfiles.Handler))
	// Setup SPA fallback (must be last)
	ui.SetupSPAFallback(router)

	// Create HTTP server
	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: router,
	}

	// Start the server in a goroutine
	go func() {
		logger.Info("Starting server", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Server failed", "error", err)
		}
	}()

	// Wait for interrupt signal to gracefully shut down the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	// Create context with timeout for shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", "error", err)
	}

	logger.Info("Server exited properly")
}
