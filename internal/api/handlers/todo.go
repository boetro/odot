package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/boetro/odot/internal/api/middleware"
	"github.com/boetro/odot/internal/db"
	"github.com/boetro/odot/internal/logger"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
)

type TodoHandler struct {
	querier db.Querier
	logger  logger.Logger
}

func NewTodoHandler(querier db.Querier, logger logger.Logger) *TodoHandler {
	return &TodoHandler{
		querier: querier,
		logger:  logger,
	}
}

type CreateTodoRequest struct {
	Title        string         `json:"title" binding:"required"`
	Description  string         `json:"description"`
	AssignedDate *time.Time     `json:"assigned_date"`
	DurationMin  *time.Duration `json:"duration_minutes"`
	ParentTodoID *int32         `json:"parent_todo_id"`
	ProjectID    *int32         `json:"project_id"`
}

type UpdateTodoRequest struct {
	Completed    bool           `json:"completed"`
	Title        string         `json:"title" binding:"required"`
	Description  string         `json:"description"`
	AssignedDate *time.Time     `json:"assigned_date"`
	DurationMin  *time.Duration `json:"duration_minutes"`
	ParentTodoID *int32         `json:"parent_todo_id"`
	ProjectID    *int32         `json:"project_id"`
}

type TodoResponse struct {
	ID           int64      `json:"id"`
	Title        string     `json:"title"`
	AssignedDate *time.Time `json:"assigned_date"`
	DurationMin  *int32     `json:"duration_minutes"`
	ParentTodoID *int32     `json:"parent_todo_id"`
	ProjectID    *int32     `json:"project_id"`
	Completed    bool       `json:"completed"`
}

func NewTodoResponse(todo *db.Todo) *TodoResponse {
	return &TodoResponse{
		ID:        int64(todo.TodoID),
		Title:     todo.Title,
		Completed: todo.IsCompleted.Bool,
		AssignedDate: func() *time.Time {
			if todo.AssignedDate.Valid {
				return &todo.AssignedDate.Time
			}
			return nil
		}(),
		DurationMin: func() *int32 {
			if todo.DurationMin.Valid {
				return &todo.DurationMin.Int32
			}
			return nil
		}(),
		ParentTodoID: func() *int32 {
			if todo.ParentTodoID.Valid {
				val := int32(todo.ParentTodoID.Int32)
				return &val
			}
			return nil
		}(),
		ProjectID: func() *int32 {
			if todo.ProjectID.Valid {
				val := int32(todo.ProjectID.Int32)
				return &val
			}
			return nil
		}(),
	}
}

func (h *TodoHandler) CreateTodo(c *gin.Context) {
	userId, ok := middleware.GetUserID(c)

	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req CreateTodoRequest
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

	var projectID pgtype.Int4
	if req.ProjectID != nil {
		parentProject, err := h.querier.GetProject(c, *req.ProjectID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
			return
		}
		if parentProject.UserID != userId {
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
			return
		}
		projectID = pgtype.Int4{
			Int32: int32(*req.ProjectID),
			Valid: true,
		}
	} else {
		projectID = pgtype.Int4{
			Valid: false,
		}
	}

	var parentTodoID pgtype.Int4
	if req.ParentTodoID != nil {
		parentTodo, err := h.querier.GetTodo(c, *req.ParentTodoID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
			return
		}
		if parentTodo.UserID != userId {
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
			return
		}
		parentTodoID = pgtype.Int4{
			Int32: int32(*req.ParentTodoID),
			Valid: true,
		}
	} else {
		parentTodoID = pgtype.Int4{
			Valid: false,
		}
	}

	var assignedDate pgtype.Timestamptz
	if req.AssignedDate != nil {
		assignedDate = pgtype.Timestamptz{
			Time:  *req.AssignedDate,
			Valid: true,
		}
	} else {
		assignedDate = pgtype.Timestamptz{
			Valid: false,
		}
	}

	var durationMin pgtype.Int4
	if req.DurationMin != nil {
		durationMin = pgtype.Int4{
			Int32: int32(*req.DurationMin),
			Valid: true,
		}
	} else {
		durationMin = pgtype.Int4{
			Valid: false,
		}
	}

	todo, err := h.querier.CreateTodo(c, db.CreateTodoParams{
		UserID:       userId,
		Title:        req.Title,
		ProjectID:    projectID,
		Description:  description,
		ParentTodoID: parentTodoID,
		DurationMin:  durationMin,
		AssignedDate: assignedDate,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
		return
	}

	response := NewTodoResponse(&todo)

	c.JSON(http.StatusCreated, response)

	return
}

func (h *TodoHandler) ListUserTodos(c *gin.Context) {
	userId, ok := middleware.GetUserID(c)

	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	projectID := c.Query("project_id")

	var todos []db.Todo
	var err error

	if projectID != "" {
		projectIDInt, err := strconv.Atoi(projectID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
			return
		}
		todos, err = h.querier.ListTodosByProject(c, db.ListTodosByProjectParams{
			UserID: userId,
			ProjectID: pgtype.Int4{
				Int32: int32(projectIDInt),
				Valid: true,
			},
		})
	} else {
		todos, err = h.querier.ListTodos(c, userId)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
		return
	}

	responses := make([]*TodoResponse, len(todos))

	for i, todo := range todos {
		responses[i] = NewTodoResponse(&todo)
	}

	c.JSON(http.StatusOK, responses)
	return
}

func (h *TodoHandler) UpdateTodo(c *gin.Context) {
	userId, ok := middleware.GetUserID(c)

	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	todoIdStr := c.Param("todoId")
	if todoIdStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing todo ID"})
		return
	}

	todoIdInt, err := strconv.Atoi(todoIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid todo ID"})
		return
	}
	todoId := int32(todoIdInt)

	req := &UpdateTodoRequest{}
	if err := c.ShouldBindJSON(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	todo, err := h.querier.GetTodo(c, todoId)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Todo not found"})
		return
	}

	if todo.UserID != userId {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
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

	var projectID pgtype.Int4
	if req.ProjectID != nil {
		parentProject, err := h.querier.GetProject(c, *req.ProjectID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
			return
		}
		if parentProject.UserID != userId {
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
			return
		}
		projectID = pgtype.Int4{
			Int32: int32(*req.ProjectID),
			Valid: true,
		}
	} else {
		projectID = pgtype.Int4{
			Valid: false,
		}
	}

	var parentTodoID pgtype.Int4
	if req.ParentTodoID != nil {
		parentTodo, err := h.querier.GetTodo(c, *req.ParentTodoID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
			return
		}
		if parentTodo.UserID != userId {
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
			return
		}
		parentTodoID = pgtype.Int4{
			Int32: int32(*req.ParentTodoID),
			Valid: true,
		}
	} else {
		parentTodoID = pgtype.Int4{
			Valid: false,
		}
	}

	var assignedDate pgtype.Timestamptz
	if req.AssignedDate != nil {
		assignedDate = pgtype.Timestamptz{
			Time:  *req.AssignedDate,
			Valid: true,
		}
	} else {
		assignedDate = pgtype.Timestamptz{
			Valid: false,
		}
	}

	var durationMin pgtype.Int4
	if req.DurationMin != nil {
		durationMin = pgtype.Int4{
			Int32: int32(*req.DurationMin),
			Valid: true,
		}
	} else {
		durationMin = pgtype.Int4{
			Valid: false,
		}
	}

	if err := h.querier.UpdateTodo(c, db.UpdateTodoParams{
		TodoID:       todoId,
		Title:        req.Title,
		Description:  description,
		AssignedDate: assignedDate,
		DurationMin:  durationMin,
		ParentTodoID: parentTodoID,
		ProjectID:    projectID,
		IsCompleted: pgtype.Bool{
			Bool:  req.Completed,
			Valid: true,
		},
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Todo updated successfully"})
	return
}
