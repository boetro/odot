package main

import (
	"context"
	"log"

	"github.com/boetro/odot/cmd/notify/cmd"
	"github.com/boetro/odot/internal/config"
	"github.com/boetro/odot/internal/db"
	"github.com/boetro/odot/internal/logger"
	"github.com/boetro/odot/internal/webpush"
)

func main() {
	ctx := context.Background()
	// Initialize configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize logger
	logger := logger.New(cfg.LogLevel)

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

	cmd.Execute(ctx, queries, pushService)

}
