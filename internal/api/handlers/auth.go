package handlers

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"log"
	"net/http"
	"time"

	"github.com/boetro/odot/internal/auth"
	"github.com/boetro/odot/internal/config"
	"github.com/boetro/odot/internal/db"
	"github.com/boetro/odot/internal/logger"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	google_oauth2 "google.golang.org/api/oauth2/v2"
	"google.golang.org/api/option"
)

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
}

type AuthHandler struct {
	config       *config.Config
	querier      db.Querier
	googleConfig *oauth2.Config
	logger       logger.Logger
}

func NewAuthHandler(querier db.Querier, config *config.Config, logger logger.Logger) *AuthHandler {
	googleConfig := &oauth2.Config{
		ClientID:     config.GoogleClientID,
		ClientSecret: config.GoogleClientSecret,
		RedirectURL:  config.GoogleRedirectURI,
		Scopes:       []string{"openid", "profile", "email"},
		Endpoint:     google.Endpoint,
	}
	return &AuthHandler{
		config:       config,
		querier:      querier,
		googleConfig: googleConfig,
		logger:       logger,
	}
}

// Generate a cryptographically secure random state
func generateRandomState() string {
	b := make([]byte, 32) // 32 bytes = 256 bits of entropy
	if _, err := rand.Read(b); err != nil {
		// Fallback if crypto/rand fails (very rare)
		panic("failed to generate random state: " + err.Error())
	}
	return base64.URLEncoding.EncodeToString(b)
}

func (h *AuthHandler) GoogleLogin(c *gin.Context) {
	state := generateRandomState() // Store this in session/cache
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(
		"oauth_state", // name
		state,         // value
		600,           // maxAge (10 minutes)
		"/",           // path
		"",            // domain (empty for current domain)
		true,          // secure (true for HTTPS)
		true,          // httpOnly
	)
	url := h.googleConfig.AuthCodeURL(state, oauth2.AccessTypeOffline)
	c.Redirect(http.StatusTemporaryRedirect, url)
}

func (h *AuthHandler) GoogleCallback(c *gin.Context) {

	code := c.Request.URL.Query().Get("code")
	state := c.Request.URL.Query().Get("state")

	// Verify state parameter
	cookieState, err := c.Cookie("oauth_state")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing state cookie"})
		return
	}
	if state != cookieState {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid state parameter"})
		return
	}
	c.SetCookie("oauth_state", "", -1, "/", "", true, true)

	token, err := h.googleConfig.Exchange(context.Background(), code)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to exchange token"})
		return
	}

	service, err := google_oauth2.NewService(c, option.WithTokenSource(h.googleConfig.TokenSource(c, token)))
	if err != nil {
		log.Fatalf("Unable to create Google OAuth2 service: %v", err)
	}
	user, err := service.Userinfo.Get().Do()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user info"})
		return
	}

	dbUser, err := h.querier.GetUserByGoogleID(c, pgtype.Text{
		String: user.Id,
		Valid:  true,
	})

	if err != nil {
		if err == pgx.ErrNoRows {
			dbUser, err = h.querier.CreateUser(c, db.CreateUserParams{
				Email: user.Email,
				GoogleID: pgtype.Text{
					String: user.Id,
					Valid:  true,
				},
				ProfilePictureUrl: pgtype.Text{
					String: user.Picture,
					Valid:  true,
				},
			})
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
				return
			}
		} else {
			h.logger.Error("Failed to get user by Google ID", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user by Google ID"})
			return
		}
	}

	// Generate token pair (access + refresh)
	tokenPair, hashedRefreshToken, err := auth.GenerateTokenPair(dbUser.UserID, user.Email, h.config.JWTSecret)
	if err != nil {
		h.logger.Error("Failed to generate token pair", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal error"})
		return
	}

	// Store refresh token in database
	_, err = h.querier.CreateRefreshToken(c, db.CreateRefreshTokenParams{
		UserID:    dbUser.UserID,
		TokenHash: hashedRefreshToken,
		ExpiresAt: pgtype.Timestamptz{
			Time:  time.Now().Add(7 * 24 * time.Hour), // 7 days
			Valid: true,
		},
	})
	if err != nil {
		h.logger.Error("Failed to store refresh token", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal error"})
		return
	}

	// Set access token cookie (short-lived)
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(
		"auth_token",           // name
		tokenPair.AccessToken,  // value
		15*60,                  // maxAge (15 minutes)
		"/",                    // path
		"",                     // domain
		true,                   // secure (HTTPS only)
		true,                   // httpOnly (JS cannot access)
	)

	// Set refresh token cookie (long-lived, more secure)
	c.SetCookie(
		"refresh_token",         // name
		tokenPair.RefreshToken,  // value
		7*24*60*60,             // maxAge (7 days)
		"/",                    // path
		"",                     // domain
		true,                   // secure (HTTPS only)
		true,                   // httpOnly (JS cannot access)
	)

	// Redirect to frontend with token or set secure cookie
	// TODO: probably need to do something here
	c.Redirect(http.StatusTemporaryRedirect, "http://localhost:5173/")
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	// Try to get refresh token from cookie first, then from body
	refreshToken, err := c.Cookie("refresh_token")
	if err != nil {
		// If no cookie, try to get from request body
		var req RefreshTokenRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
			return
		}
		refreshToken = req.RefreshToken
	}

	if refreshToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Refresh token required"})
		return
	}

	// Hash the refresh token to lookup in database
	hashedToken := auth.HashRefreshToken(refreshToken)

	// Get refresh token from database
	dbRefreshToken, err := h.querier.GetRefreshToken(c, hashedToken)
	if err != nil {
		if err == pgx.ErrNoRows {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
			return
		}
		h.logger.Error("Failed to get refresh token", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal error"})
		return
	}

	// Get user details
	user, err := h.querier.GetUser(c, dbRefreshToken.UserID)
	if err != nil {
		h.logger.Error("Failed to get user", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal error"})
		return
	}

	// Generate new token pair
	tokenPair, newHashedRefreshToken, err := auth.GenerateTokenPair(user.UserID, user.Email, h.config.JWTSecret)
	if err != nil {
		h.logger.Error("Failed to generate new token pair", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal error"})
		return
	}

	// Revoke old refresh token
	err = h.querier.RevokeRefreshToken(c, hashedToken)
	if err != nil {
		h.logger.Error("Failed to revoke old refresh token", err)
	}

	// Store new refresh token
	_, err = h.querier.CreateRefreshToken(c, db.CreateRefreshTokenParams{
		UserID:    user.UserID,
		TokenHash: newHashedRefreshToken,
		ExpiresAt: pgtype.Timestamptz{
			Time:  time.Now().Add(7 * 24 * time.Hour), // 7 days
			Valid: true,
		},
	})
	if err != nil {
		h.logger.Error("Failed to store new refresh token", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal error"})
		return
	}

	// Update last used timestamp
	err = h.querier.UpdateRefreshTokenLastUsed(c, newHashedRefreshToken)
	if err != nil {
		h.logger.Error("Failed to update refresh token last used", err)
	}

	// Set new cookies
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(
		"auth_token",           // name
		tokenPair.AccessToken,  // value
		15*60,                  // maxAge (15 minutes)
		"/",                    // path
		"",                     // domain
		true,                   // secure (HTTPS only)
		true,                   // httpOnly (JS cannot access)
	)

	c.SetCookie(
		"refresh_token",         // name
		tokenPair.RefreshToken,  // value
		7*24*60*60,             // maxAge (7 days)
		"/",                    // path
		"",                     // domain
		true,                   // secure (HTTPS only)
		true,                   // httpOnly (JS cannot access)
	)

	// Return token response
	c.JSON(http.StatusOK, TokenResponse{
		AccessToken:  tokenPair.AccessToken,
		RefreshToken: tokenPair.RefreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    900, // 15 minutes in seconds
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	// Get refresh token from cookie
	refreshToken, err := c.Cookie("refresh_token")
	if err == nil && refreshToken != "" {
		// Revoke the refresh token
		hashedToken := auth.HashRefreshToken(refreshToken)
		err = h.querier.RevokeRefreshToken(c, hashedToken)
		if err != nil {
			h.logger.Error("Failed to revoke refresh token during logout", err)
		}
	}

	// Clear cookies
	c.SetCookie("auth_token", "", -1, "/", "", true, true)
	c.SetCookie("refresh_token", "", -1, "/", "", true, true)

	c.JSON(http.StatusOK, gin.H{"message": "Successfully logged out"})
}

func (h *AuthHandler) RevokeAllTokens(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Revoke all refresh tokens for the user
	err := h.querier.RevokeAllUserRefreshTokens(c, userID.(int32))
	if err != nil {
		h.logger.Error("Failed to revoke all user tokens", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal error"})
		return
	}

	// Clear cookies
	c.SetCookie("auth_token", "", -1, "/", "", true, true)
	c.SetCookie("refresh_token", "", -1, "/", "", true, true)

	c.JSON(http.StatusOK, gin.H{"message": "All tokens revoked successfully"})
}
