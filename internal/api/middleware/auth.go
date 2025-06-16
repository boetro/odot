package middleware

import (
	"net/http"
	"strings"

	"github.com/boetro/odot/internal/auth"
	"github.com/boetro/odot/internal/config"
	"github.com/boetro/odot/internal/logger"
	"github.com/gin-gonic/gin"
)

type AuthMiddleware struct {
	config *config.Config
	logger logger.Logger
}

func NewAuthMiddleware(config *config.Config, logger logger.Logger) *AuthMiddleware {
	return &AuthMiddleware{
		config: config,
		logger: logger,
	}
}

// RequireAuth middleware validates JWT tokens and sets user context
func (m *AuthMiddleware) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := m.extractToken(c)
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization token required"})
			c.Abort()
			return
		}

		claims, err := auth.ValidateAccessToken(token, m.config.JWTSecret)
		if err != nil {
			m.logger.Error("Token validation failed", err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// Set user information in context
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Next()
	}
}

// OptionalAuth middleware validates JWT tokens if present but doesn't require them
func (m *AuthMiddleware) OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := m.extractToken(c)
		if token != "" {
			claims, err := auth.ValidateAccessToken(token, m.config.JWTSecret)
			if err == nil {
				// Set user information in context if token is valid
				c.Set("user_id", claims.UserID)
				c.Set("user_email", claims.Email)
			} else {
				m.logger.Debug("Optional auth token validation failed", err)
			}
		}
		c.Next()
	}
}

// extractToken extracts JWT token from Authorization header or cookie
func (m *AuthMiddleware) extractToken(c *gin.Context) string {
	// Try Authorization header first
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" {
		// Bearer token format: "Bearer <token>"
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
			return parts[1]
		}
	}

	// Fallback to cookie
	token, err := c.Cookie("auth_token")
	if err == nil {
		return token
	}

	return ""
}

// GetUserID helper function to extract user ID from context
func GetUserID(c *gin.Context) (int32, bool) {
	userID, exists := c.Get("user_id")
	if !exists {
		return 0, false
	}
	id, ok := userID.(int32)
	return id, ok
}

// GetUserEmail helper function to extract user email from context
func GetUserEmail(c *gin.Context) (string, bool) {
	email, exists := c.Get("user_email")
	if !exists {
		return "", false
	}
	emailStr, ok := email.(string)
	return emailStr, ok
}

// RequireUserID middleware helper that extracts user ID and aborts if not found
func RequireUserID(c *gin.Context) (int32, bool) {
	userID, exists := GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		c.Abort()
		return 0, false
	}
	return userID, true
}