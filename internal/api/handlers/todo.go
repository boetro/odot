package handlers

import (
	"context"
	"fmt"
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
	Title         string     `json:"title" binding:"required"`
	Description   string     `json:"description"`
	ScheduledDate *time.Time `json:"scheduled_date"`
	DurationMin   *int32     `json:"duration_minutes"`
	ParentTodoID  *int32     `json:"parent_todo_id"`
	ProjectID     *int32     `json:"project_id"`
}

type UpdateTodoRequest struct {
	Completed     bool       `json:"completed"`
	Title         string     `json:"title" binding:"required"`
	Description   string     `json:"description"`
	ScheduledDate *time.Time `json:"scheduled_date"`
	DurationMin   *int32     `json:"duration_minutes"`
	ParentTodoID  *int32     `json:"parent_todo_id"`
	ProjectID     *int32     `json:"project_id"`
}

type TodoResponse struct {
	ID            int64      `json:"id"`
	Title         string     `json:"title"`
	Description   *string    `json:"description"`
	ScheduledDate *time.Time `json:"scheduled_date"`
	DurationMin   *int32     `json:"duration_minutes"`
	ParentTodoID  *int32     `json:"parent_todo_id"`
	ProjectID     *int32     `json:"project_id"`
	Completed     bool       `json:"completed"`
}

func NewTodoResponse(todo *db.Todo) *TodoResponse {
	return &TodoResponse{
		ID:        int64(todo.TodoID),
		Title:     todo.Title,
		Completed: todo.IsCompleted.Bool,
		Description: func() *string {
			if todo.Description.Valid {
				return &todo.Description.String
			}
			return nil
		}(),
		ScheduledDate: func() *time.Time {
			if todo.ScheduledDate.Valid {
				return &todo.ScheduledDate.Time
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

// @Summary Create a new todo
// @Description Creates a new todo for the authenticated user.
// @Tags todos
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param todo body CreateTodoRequest true "Todo details"
// @Success 201 {object} TodoResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /todos [post]
func (h *TodoHandler) CreateTodo(c *gin.Context) {
	userId, ok := middleware.GetUserID(c)

	if !ok {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
		return
	}

	var req CreateTodoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
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
			c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Internal Server Error"})
			return
		}
		if parentProject.UserID != userId {
			c.JSON(http.StatusForbidden, ErrorResponse{Error: "Forbidden"})
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
			c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Internal Server Error"})
			return
		}
		if parentTodo.UserID != userId {
			c.JSON(http.StatusForbidden, ErrorResponse{Error: "Forbidden"})
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

	var scheduledDate pgtype.Timestamptz
	if req.ScheduledDate != nil {
		scheduledDate = pgtype.Timestamptz{
			Time:  *req.ScheduledDate,
			Valid: true,
		}
	} else {
		scheduledDate = pgtype.Timestamptz{
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
		UserID:        userId,
		Title:         req.Title,
		ProjectID:     projectID,
		Description:   description,
		ParentTodoID:  parentTodoID,
		DurationMin:   durationMin,
		ScheduledDate: scheduledDate,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
		return
	}

	response := NewTodoResponse(&todo)

	err = h.scheduleNotification(c, todo)
	if err != nil {
		h.logger.Error("Create Notification failed: ", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
		return
	}

	c.JSON(http.StatusCreated, response)
	return
}

func (h *TodoHandler) scheduleNotification(c context.Context, todo db.Todo) error {
	if !todo.ScheduledDate.Valid {
		fmt.Println("Skipping non valid scheduled date")
		return nil
	}

	notificationTime := todo.ScheduledDate.Time.Add(-10 * time.Minute)
	now := time.Now()
	fmt.Printf("Notification time: %v\n", notificationTime)
	fmt.Printf("Current time (now): %v\n", now)
	if notificationTime.Before(now) {
		fmt.Println("Skipping prior notification time")
		return nil
	}

	// Try to update existing unsent notification first
	rowsAffected, err := h.querier.UpdateNotificationSchedule(c, db.UpdateNotificationScheduleParams{
		TodoID: todo.TodoID,
		ScheduledFor: pgtype.Timestamptz{
			Time:  notificationTime,
			Valid: true,
		},
	})

	if err != nil {
		return err
	}

	// If no existing notification was updated, create a new one
	if rowsAffected == 0 {
		_, err := h.querier.CreateNotification(c, db.CreateNotificationParams{
			TodoID: todo.TodoID,
			UserID: todo.UserID,
			ScheduledFor: pgtype.Timestamptz{
				Time:  notificationTime,
				Valid: true,
			},
			NotificationType: pgtype.Text{
				String: "scheduled-todo",
				Valid:  true,
			},
		})

		if err != nil {
			return err
		}
	}

	return nil
}

// @Summary List user todos
// @Description Retrieves all todos for the authenticated user, optionally filtered by project.
// @Tags todos
// @Produce json
// @Security BearerAuth
// @Param project_id query int false "Filter by project ID"
// @Success 200 {array} TodoResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /todos [get]
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

// @Summary Update a todo
// @Description Updates a specific todo for the authenticated user.
// @Tags todos
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param todoId path int true "Todo ID"
// @Param todo body UpdateTodoRequest true "Updated todo details"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /todos/{todoId} [put]
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

	var scheduledDate pgtype.Timestamptz
	if req.ScheduledDate != nil {
		scheduledDate = pgtype.Timestamptz{
			Time:  *req.ScheduledDate,
			Valid: true,
		}
	} else {
		scheduledDate = pgtype.Timestamptz{
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

	var completedAt pgtype.Timestamptz
	if req.Completed {
		completedAt = pgtype.Timestamptz{
			Time:  time.Now(),
			Valid: true,
		}
	} else {
		completedAt = pgtype.Timestamptz{
			Valid: false,
		}
	}

	dbTodo, err := h.querier.UpdateTodo(c, db.UpdateTodoParams{
		TodoID:        todoId,
		Title:         req.Title,
		Description:   description,
		ScheduledDate: scheduledDate,
		DurationMin:   durationMin,
		ParentTodoID:  parentTodoID,
		ProjectID:     projectID,
		IsCompleted: pgtype.Bool{
			Bool:  req.Completed,
			Valid: true,
		},
		CompletedAt: completedAt,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
		return
	}

	err = h.scheduleNotification(c, dbTodo)

	if err != nil {
		h.logger.Error("Failed to schedule notification", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Todo updated successfully"})
	return
}

// @Summary Get a specific todo
// @Description Retrieves a specific todo by ID for the authenticated user.
// @Tags todos
// @Produce json
// @Security BearerAuth
// @Param todoId path int true "Todo ID"
// @Success 200 {object} TodoResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /todos/{todoId} [get]
func (h *TodoHandler) GetTodo(c *gin.Context) {
	userId, ok := middleware.GetUserID(c)

	if !ok {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
		return
	}

	todoIdStr := c.Param("todoId")
	if todoIdStr == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Missing todo ID"})
		return
	}

	todoIdInt, err := strconv.Atoi(todoIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid todo ID"})
		return
	}
	todoId := int32(todoIdInt)

	todo, err := h.querier.GetTodo(c, todoId)
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{Error: "Todo not found"})
		return
	}

	if todo.UserID != userId {
		c.JSON(http.StatusForbidden, ErrorResponse{Error: "Forbidden"})
		return
	}

	response := NewTodoResponse(&todo)
	c.JSON(http.StatusOK, response)
}
