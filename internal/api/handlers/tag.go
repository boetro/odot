package handlers

import (
	"net/http"
	"strconv"

	"github.com/boetro/odot/internal/api/middleware"
	"github.com/boetro/odot/internal/db"
	"github.com/boetro/odot/internal/logger"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
)

type TagHandler struct {
	querier db.Querier
	logger  logger.Logger
}

func NewTagHandler(querier db.Querier, logger logger.Logger) *TagHandler {
	return &TagHandler{
		querier: querier,
		logger:  logger,
	}
}

type CreateTagRequest struct {
	Name  string `json:"name" binding:"required"`
	Color string `json:"color" binding:"required"`
}

type UpdateTagRequest struct {
	Name  string `json:"name" binding:"required"`
	Color string `json:"color" binding:"required"`
}

type TagResponse struct {
	ID    int64  `json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"`
}

func NewTagResponse(tag *db.Tag) *TagResponse {
	return &TagResponse{
		ID:    int64(tag.TagID),
		Name:  tag.Name,
		Color: tag.Color.String,
	}
}

// @Summary Create a new tag
// @Description Creates a new tag for the authenticated user.
// @Tags tags
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param tag body CreateTagRequest true "Tag details"
// @Success 201 {object} TagResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /tags [post]
func (h *TagHandler) CreateTag(c *gin.Context) {
	userId, ok := middleware.GetUserID(c)

	if !ok {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
		return
	}

	var req CreateTagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	tag, err := h.querier.CreateTag(c, db.CreateTagParams{
		UserID: userId,
		Name:   req.Name,
		Color: pgtype.Text{
			String: req.Color,
			Valid:  true,
		},
	})

	if err != nil {
		h.logger.Error("Failed to create tag", err)
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Internal Server Error"})
		return
	}

	response := NewTagResponse(&tag)

	c.JSON(http.StatusCreated, response)

	return
}

// @Summary List user tags
// @Description Retrieves all tags for the authenticated user.
// @Tags tags
// @Produce json
// @Security BearerAuth
// @Success 200 {array} TagResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /tags [get]
func (h *TagHandler) ListTags(c *gin.Context) {
	userId, ok := middleware.GetUserID(c)

	if !ok {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
		return
	}

	tags, err := h.querier.ListTags(c, userId)

	if err != nil {
		h.logger.Error("Failed to list tags", err)
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Internal Server Error"})
		return
	}

	responses := make([]*TagResponse, len(tags))

	for i, tag := range tags {
		responses[i] = NewTagResponse(&tag)
	}

	c.JSON(http.StatusOK, responses)

	return
}

// @Summary Update a tag
// @Description Updates an existing tag for the authenticated user.
// @Tags tags
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Tag ID"
// @Param tag body UpdateTagRequest true "Tag details"
// @Success 200 {object} TagResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /tags/{id} [put]
func (h *TagHandler) UpdateTag(c *gin.Context) {
	userId, ok := middleware.GetUserID(c)

	if !ok {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
		return
	}

	tagIdStr := c.Param("id")
	tagId, err := strconv.ParseInt(tagIdStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid tag ID"})
		return
	}

	existingTag, err := h.querier.GetTag(c, int32(tagId))
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{Error: "Tag not found"})
		return
	}

	if existingTag.UserID != userId {
		c.JSON(http.StatusForbidden, ErrorResponse{Error: "Forbidden"})
		return
	}

	var req UpdateTagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	tag, err := h.querier.UpdateTag(c, db.UpdateTagParams{
		TagID: int32(tagId),
		Name:  req.Name,
		Color: pgtype.Text{
			String: req.Color,
			Valid:  true,
		},
	})

	if err != nil {
		h.logger.Error("Failed to update tag", err)
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Internal Server Error"})
		return
	}

	response := NewTagResponse(&tag)

	c.JSON(http.StatusOK, response)

	return
}

// @Summary Delete a tag
// @Description Deletes an existing tag for the authenticated user and removes it from all associated todos.
// @Tags tags
// @Security BearerAuth
// @Param id path int true "Tag ID"
// @Success 204
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /tags/{id} [delete]
func (h *TagHandler) DeleteTag(c *gin.Context) {
	userId, ok := middleware.GetUserID(c)

	if !ok {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
		return
	}

	tagIdStr := c.Param("id")
	tagId, err := strconv.ParseInt(tagIdStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid tag ID"})
		return
	}

	existingTag, err := h.querier.GetTag(c, int32(tagId))
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{Error: "Tag not found"})
		return
	}

	if existingTag.UserID != userId {
		c.JSON(http.StatusForbidden, ErrorResponse{Error: "Forbidden"})
		return
	}

	// First, remove tag from all todos
	err = h.querier.DeleteAllTagTodos(c, int32(tagId))
	if err != nil {
		h.logger.Error("Failed to remove tag from todos", err)
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Internal Server Error"})
		return
	}

	// Then delete the tag itself
	err = h.querier.DeleteTag(c, int32(tagId))
	if err != nil {
		h.logger.Error("Failed to delete tag", err)
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Internal Server Error"})
		return
	}

	c.Status(http.StatusNoContent)

	return
}
