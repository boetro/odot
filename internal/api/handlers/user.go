package handlers

import (
	"net/http"

	"github.com/boetro/odot/internal/api/middleware"
	"github.com/boetro/odot/internal/auth"
	"github.com/boetro/odot/internal/config"
	"github.com/boetro/odot/internal/db"
	"github.com/boetro/odot/internal/logger"
	"github.com/gin-gonic/gin"
)

type GetUserResponse struct {
	ID                int32 `json:"id"`
	Email             string `json:"email"`
	ProfilePictureUrl string `json:"profile_picture_url"`
	TokenExpiresAt    int64 `json:"token_expires_at"` // Unix timestamp in seconds
}

type UserHandler struct {
	querier db.Querier
	config  *config.Config
	logger  logger.Logger
}

func NewUserHandler(querier db.Querier, config *config.Config, logger logger.Logger) *UserHandler {
	return &UserHandler{
		querier: querier,
		config:  config,
		logger:  logger,
	}
}

// @Summary Get user information
// @Description Retrieves information for the authenticated user.
// @Tags users
// @Produce json
// @Security BearerAuth
// @Success 200 {object} GetUserResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /me [get]
func (h *UserHandler) GetUser(c *gin.Context) {
	userId, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid user id"})
		return
	}
	user, err := h.querier.GetUser(c, userId)

	if err != nil {
		h.logger.Error("failed to get user", err)
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "unknown error"})
		return
	}

	// Extract token expiration time
	tokenExpiresAt := int64(0)
	token := auth.ExtractToken(c)
	if token != "" {
		claims, err := auth.ValidateAccessToken(token, h.config.JWTSecret)
		if err == nil && claims.ExpiresAt != nil {
			tokenExpiresAt = claims.ExpiresAt.Unix()
		}
	}

	apiUser := GetUserResponse{
		ID:                user.UserID,
		Email:             user.Email,
		ProfilePictureUrl: user.ProfilePictureUrl.String,
		TokenExpiresAt:    tokenExpiresAt,
	}

	c.JSON(http.StatusOK, apiUser)
	return
}

