package handlers

import (
	"net/http"

	"github.com/boetro/odot/internal/api/middleware"
	"github.com/boetro/odot/internal/db"
	"github.com/boetro/odot/internal/logger"
	"github.com/gin-gonic/gin"
)

type GetUserResponse struct {
	ID                int32  `json:"id"`
	Email             string `json:"email"`
	ProfilePictureUrl string `json:"profile_picture_url"`
}

type UserHandler struct {
	querier db.Querier
	logger  logger.Logger
}

func NewUserHandler(querier db.Querier, logger logger.Logger) *UserHandler {
	return &UserHandler{
		querier: querier,
		logger:  logger,
	}
}

func (h *UserHandler) GetUser(c *gin.Context) {
	userId, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}
	user, err := h.querier.GetUser(c, userId)

	if err != nil {
		h.logger.Error("failed to get user", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "unknown error"})
		return
	}

	apiUser := GetUserResponse{
		ID:                user.UserID,
		Email:             user.Email,
		ProfilePictureUrl: user.ProfilePictureUrl.String,
	}

	c.JSON(http.StatusOK, apiUser)
	return
}
