// internal/config/config.go
package config

import (
	"fmt"
	"os"
)

// Config holds all configuration for the application
type Config struct {
	Port        string
	LogLevel    string
	DatabaseURL string
	Environment string
}

// Load reads configuration from environment variables
func Load() (*Config, error) {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // Default port
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable is required")
	}

	env := os.Getenv("ENVIRONMENT")
	if env == "" {
		env = "development" // Default environment
	}

	logLevel := os.Getenv("LOG_LEVEL")
	if logLevel == "" {
		logLevel = "info" // Default log level
	}

	return &Config{
		Port:        port,
		LogLevel:    logLevel,
		DatabaseURL: dbURL,
		Environment: env,
	}, nil
}
