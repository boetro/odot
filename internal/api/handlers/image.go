package handlers

import (
	"context"
	"fmt"
	"io"
	"net/http"

	"github.com/boetro/odot/internal/api/middleware"
	"github.com/boetro/odot/internal/logger"
	"github.com/boetro/odot/internal/vision"
	"github.com/gin-gonic/gin"
)

type ImageHandler struct {
	visionService vision.VisionService
	logger        logger.Logger
}

func NewImageHandler(visionService vision.VisionService, logger logger.Logger) *ImageHandler {
	return &ImageHandler{
		visionService: visionService,
		logger:        logger,
	}
}

type ImageToTextResponse struct {
	Title   string `json:"title"`
	Content string `json:"content"`
}

// ImageToText extracts text from an uploaded image
// @Summary Extract text from image
// @Description Upload an image and extract text using OCR
// @Tags image
// @Accept multipart/form-data
// @Produce json
// @Param image formData file true "Image file"
// @Success 200 {object} ImageToTextResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /image/text [post]
func (h *ImageHandler) ImageToText(c *gin.Context) {
	_, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
		return
	}

	// Get the uploaded file
	file, _, err := c.Request.FormFile("image")
	if err != nil {
		h.logger.Error("Failed to get uploaded file", "error", err)
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "No image file provided"})
		return
	}
	defer file.Close()

	// Read the file data
	imageData, err := io.ReadAll(file)
	if err != nil {
		h.logger.Error("Failed to read image file", "error", err)
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to read image file"})
		return
	}

	// Check file size (limit to 10MB)
	if len(imageData) > 10*1024*1024 {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Image file too large (max 10MB)"})
		return
	}

	// Extract text using vision service
	ctx := context.Background()
	result, err := h.visionService.ImageToText(ctx, imageData)
	if err != nil {
		h.logger.Error("Failed to extract text from image", "error", err)
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: fmt.Sprintf("Failed to extract text: %v", err)})
		return
	}

	c.JSON(http.StatusOK, ImageToTextResponse{
		Title:   result.Title,
		Content: result.Content,
	})
}
