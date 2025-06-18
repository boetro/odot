package handlers

import (
	"net/http"

	"github.com/boetro/odot/internal/api/middleware"
	"github.com/boetro/odot/internal/db"
	"github.com/boetro/odot/internal/logger"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
)

type ProjectHandler struct {
	querier db.Querier
	logger  logger.Logger
}

func NewProjectHandler(querier db.Querier, logger logger.Logger) *ProjectHandler {
	return &ProjectHandler{
		querier: querier,
		logger:  logger,
	}
}

type CreateProjectRequest struct {
	Name            string `json:"name" binding:"required"`
	Description     string `json:"description"`
	Color           string `json:"color" binding:"required"`
	ParentProjectID int32  `json:"parent_project_id"`
}

type ProjectResponse struct {
	ID              int64   `json:"id"`
	Name            string  `json:"name"`
	Description     *string `json:"description"`
	Color           string  `json:"color"`
	ParentProjectID *int    `json:"parent_project_id"`
}

func NewProjectResponse(project *db.Project) *ProjectResponse {
	return &ProjectResponse{
		ID:          int64(project.ProjectID),
		Name:        project.Name,
		Color:       project.Color.String,
		Description: &project.Description.String,
		ParentProjectID: func() *int {
			if project.ParentProjectID.Valid {
				val := int(project.ParentProjectID.Int32)
				return &val
			}
			return nil
		}(),
	}
}

func (h *ProjectHandler) CreateProject(c *gin.Context) {
	userId, ok := middleware.GetUserID(c)

	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var description pgtype.Text
	if req.Description != "" {
		description = pgtype.Text{
			String: req.Description,
			Valid:  true,
		}
	} else {
		description = pgtype.Text{
			Valid: false,
		}
	}

	var parentProjectID pgtype.Int4
	if req.ParentProjectID != 0 {
		parentProject, err := h.querier.GetProject(c, req.ParentProjectID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
			return
		}
		if parentProject.UserID != userId {
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
			return
		}
		parentProjectID = pgtype.Int4{
			Int32: int32(req.ParentProjectID),
			Valid: true,
		}
	} else {
		parentProjectID = pgtype.Int4{
			Valid: false,
		}
	}

	project, err := h.querier.CreateProject(c, db.CreateProjectParams{
		Name:        req.Name,
		UserID:      userId,
		Description: description,
		Color: pgtype.Text{
			String: req.Color,
			Valid:  true,
		},
		ParentProjectID: parentProjectID,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
		return
	}

	response := NewProjectResponse(&project)

	c.JSON(http.StatusCreated, response)

	return
}

func (h *ProjectHandler) ListProjects(c *gin.Context) {
	userId, ok := middleware.GetUserID(c)

	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	projects, err := h.querier.ListProjects(c, userId)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
		return
	}

	responses := make([]*ProjectResponse, len(projects))

	for i, project := range projects {
		responses[i] = NewProjectResponse(&project)
	}

	c.JSON(http.StatusOK, responses)

	return
}
