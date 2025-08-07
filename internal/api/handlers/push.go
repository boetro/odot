package handlers

import (
	"net/http"
	"strings"

	"github.com/boetro/odot/internal/api/middleware"
	"github.com/boetro/odot/internal/db"
	"github.com/boetro/odot/internal/logger"
	"github.com/boetro/odot/internal/webpush"
	"github.com/gin-gonic/gin"
)

type PushHandler struct {
	queries     db.Querier
	logger      logger.Logger
	pushService *webpush.Service
}

func NewPushHandler(queries db.Querier, logger logger.Logger, pushService *webpush.Service) *PushHandler {
	return &PushHandler{
		queries:     queries,
		logger:      logger,
		pushService: pushService,
	}
}

type SubscribeRequest struct {
	Endpoint string `json:"endpoint" binding:"required"`
	Keys     struct {
		P256dh string `json:"p256dh" binding:"required"`
		Auth   string `json:"auth" binding:"required"`
	} `json:"keys" binding:"required"`
}

type SendNotificationRequest struct {
	Title   string      `json:"title" binding:"required"`
	Body    string      `json:"body" binding:"required"`
	Icon    string      `json:"icon"`
	Badge   string      `json:"badge"`
	Data    interface{} `json:"data"`
	UserIDs []int32     `json:"user_ids"` // If empty, send to current user
}

// Subscribe handles push notification subscription
// @Summary Subscribe to push notifications
// @Description Subscribe the current user to push notifications
// @Tags push
// @Accept json
// @Produce json
// @Param subscription body SubscribeRequest true "Push subscription details"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /push/subscribe [post]
func (h *PushHandler) Subscribe(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		h.logger.Error("User ID not found in context")
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "User not authenticated"})
		return
	}

	var req SubscribeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid subscription request", "error", err)
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid subscription data"})
		return
	}

	h.queries.CreatePushSubscription(c, db.CreatePushSubscriptionParams{
		UserID:    userID,
		Endpoint:  req.Endpoint,
		P256dhKey: req.Keys.P256dh,
		AuthKey:   req.Keys.Auth,
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "Subscription successful",
		"user_id": userID,
	})
}

// SendNotification sends a push notification
// @Summary Send push notification
// @Description Send a push notification to specified users or current user
// @Tags push
// @Accept json
// @Produce json
// @Param notification body SendNotificationRequest true "Notification details"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /push/send [post]
func (h *PushHandler) SendNotification(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)

	if !exists {
		h.logger.Error("User ID not found in context")
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "User not authenticated"})
		return
	}

	var req SendNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid notification request", "error", err)
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid notification data"})
		return
	}

	// Create notification payload
	payload := &webpush.NotificationPayload{
		Title: req.Title,
		Body:  req.Body,
		Icon:  req.Icon,
		Badge: req.Badge,
		Data:  req.Data,
	}

	subscriptions, err := h.queries.GetUserPushSubscriptions(c, userID)
	if err != nil {
		h.logger.Error("Failed to get user push subscriptions", "error", err)
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to send notification"})
		return
	}

	if len(subscriptions) == 0 {
		h.logger.Info("No push subscriptions found for user", "user_id", userID)
		c.JSON(http.StatusOK, gin.H{
			"message": "No push subscriptions found",
		})
		return
	}

	var successfulSends int
	for _, subscription := range subscriptions {
		err := h.pushService.SendNotification(webpush.PushSubscriptionFromDB(subscription), payload)
		if err != nil {
			h.logger.Error("Failed to send push notification", "error", err, "endpoint", subscription.Endpoint)
			
			// Check if it's a 401/410 error indicating invalid subscription
			if isInvalidSubscriptionError(err) {
				h.logger.Info("Marking subscription as inactive due to invalid response", "endpoint", subscription.Endpoint)
				if markErr := h.queries.MarkSubscriptionInactive(c, db.MarkSubscriptionInactiveParams{
					UserID:   userID,
					Endpoint: subscription.Endpoint,
				}); markErr != nil {
					h.logger.Error("Failed to mark subscription as inactive", "error", markErr)
				}
			}
			continue // Continue with other subscriptions instead of failing entirely
		}
		successfulSends++
	}

	h.logger.Info("Push notification sent", "user_id", userID, "title", req.Title, "successful_sends", successfulSends, "total_subscriptions", len(subscriptions))

	c.JSON(http.StatusOK, gin.H{
		"message":            "Notification sent successfully",
		"title":              req.Title,
		"successful_sends":   successfulSends,
		"total_subscriptions": len(subscriptions),
	})
}

// GetVAPIDPublicKey returns the VAPID public key for client-side subscription
// @Summary Get VAPID public key
// @Description Get the VAPID public key needed for push subscription
// @Tags push
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /push/vapid-public-key [get]
func (h *PushHandler) GetVAPIDPublicKey(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"publicKey": h.pushService.VAPIDKeys.PublicKey,
	})
}

// isInvalidSubscriptionError checks if the error indicates an invalid subscription
func isInvalidSubscriptionError(err error) bool {
	if err == nil {
		return false
	}
	
	errStr := strings.ToLower(err.Error())
	// Check for common invalid subscription error patterns
	return strings.Contains(errStr, "status 401") || 
		   strings.Contains(errStr, "status 410") ||
		   strings.Contains(errStr, "unauthorized") ||
		   strings.Contains(errStr, "gone")
}
