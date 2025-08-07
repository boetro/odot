// internal/config/config.go
package config

import (
	"fmt"
	"os"
)

// Config holds all configuration for the application
type Config struct {
	Port                    string
	LogLevel                string
	DatabaseURL             string
	Environment             string
	JWTSecret               string
	GoogleClientID          string
	GoogleClientSecret      string
	GoogleRedirectURI       string
	LoginSuccessRedirectURI string
	VAPIDPublicKey          string
	VAPIDPrivateKey         string
	VAPIDSubject            string
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

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET environment variable is required")
	}

	googleClientID := os.Getenv("GOOGLE_CLIENT_ID")
	if googleClientID == "" {
		return nil, fmt.Errorf("GOOGLE_CLIENT_ID environment variable is required")
	}

	googleClientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	if googleClientSecret == "" {
		return nil, fmt.Errorf("GOOGLE_CLIENT_SECRET environment variable is required")
	}

	googleRedirectURI := os.Getenv("GOOGLE_REDIRECT_URI")
	if googleRedirectURI == "" {
		return nil, fmt.Errorf("GOOGLE_REDIRECT_URI environment variable is required")
	}

	loginSuccessURI := os.Getenv("LOGIN_SUCCESS_REDIRECT_URI")
	if loginSuccessURI == "" {
		loginSuccessURI = "http://localhost:5173"
	}

	vapidPublicKey := os.Getenv("VAPID_PUBLIC_KEY")
	if vapidPublicKey == "" {
		return nil, fmt.Errorf("VAPID_PUBLIC_KEY environment variable is required")
	}

	vapidPrivateKey := os.Getenv("VAPID_PRIVATE_KEY")
	if vapidPrivateKey == "" {
		return nil, fmt.Errorf("VAPID_PRIVATE_KEY environment variable is required")
	}

	vapidSubject := os.Getenv("VAPID_SUBJECT")
	if vapidSubject == "" {
		return nil, fmt.Errorf("VAPID_SUBJECT environment variable is required")
	}

	return &Config{
		Port:                    port,
		LogLevel:                logLevel,
		DatabaseURL:             dbURL,
		Environment:             env,
		JWTSecret:               jwtSecret,
		GoogleClientID:          googleClientID,
		GoogleClientSecret:      googleClientSecret,
		GoogleRedirectURI:       googleRedirectURI,
		LoginSuccessRedirectURI: loginSuccessURI,
		VAPIDPublicKey:          vapidPublicKey,
		VAPIDPrivateKey:         vapidPrivateKey,
		VAPIDSubject:            vapidSubject,
	}, nil
}
