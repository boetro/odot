-- name: CreateTodo :one
INSERT INTO todos (user_id, template_id, project_id, parent_todo_id, title, description, scheduled_date, duration_min, priority, is_modified, modified_fields)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING *;

-- name: GetTodo :one
SELECT * FROM todos
WHERE todo_id = $1;

-- name: ListTodos :many
SELECT * FROM todos
WHERE user_id = $1
ORDER BY created_at DESC;

-- name: ListTodosByProject :many
SELECT * FROM todos
WHERE user_id = $1 AND project_id = $2
ORDER BY created_at DESC;

-- name: ListTodosByParent :many
SELECT * FROM todos
WHERE user_id = $1 AND parent_todo_id = $2
ORDER BY created_at DESC;

-- name: ListCompletedTodos :many
SELECT * FROM todos
WHERE user_id = $1 AND is_completed = true
ORDER BY completed_at DESC;

-- name: ListPendingTodos :many
SELECT * FROM todos
WHERE user_id = $1 AND is_completed = false
ORDER BY created_at DESC;

-- name: UpdateTodo :one
UPDATE todos
SET template_id = $2, project_id = $3, parent_todo_id = $4, title = $5, description = $6, scheduled_date = $7, duration_min = $8, priority = $9, is_completed = $10, is_modified = $11, modified_fields = $12, completed_at = $13
WHERE todo_id = $1
RETURNING *;

-- name: CompleteTodo :one
UPDATE todos
SET is_completed = true
WHERE todo_id = $1
RETURNING *;

-- name: UncompleteTodo :one
UPDATE todos
SET is_completed = false
WHERE todo_id = $1
RETURNING *;

-- name: DeleteTodo :exec
DELETE FROM todos
WHERE todo_id = $1;

-- Template-related queries
-- name: CreateTodoTemplate :one
INSERT INTO todo_templates (user_id, project_id, title, description, duration_min, priority, rrule, dtstart, until_date, is_active)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: GetTodoTemplate :one
SELECT * FROM todo_templates
WHERE template_id = $1;

-- name: ListTodoTemplates :many
SELECT * FROM todo_templates
WHERE user_id = $1 AND is_active = true
ORDER BY created_at DESC;

-- name: UpdateTodoTemplate :exec
UPDATE todo_templates
SET project_id = $2, title = $3, description = $4, duration_min = $5, priority = $6, rrule = $7, dtstart = $8, until_date = $9, is_active = $10
WHERE template_id = $1;

-- name: DeleteTodoTemplate :exec
DELETE FROM todo_templates
WHERE template_id = $1;

-- name: ListTodosByTemplate :many
SELECT * FROM todos
WHERE user_id = $1 AND template_id = $2
ORDER BY scheduled_date DESC;

-- name: ListTodosForDateRange :many
SELECT * FROM todos
WHERE user_id = $1 AND scheduled_date >= $2 AND scheduled_date <= $3
ORDER BY scheduled_date ASC;

-- name: CreateTodoFromTemplate :one
INSERT INTO todos (user_id, template_id, project_id, parent_todo_id, title, description, scheduled_date, duration_min, priority, is_modified, modified_fields)
SELECT $1, tt.template_id, tt.project_id, $3, tt.title, tt.description, $4, tt.duration_min, tt.priority, false, NULL
FROM todo_templates tt
WHERE tt.template_id = $2
RETURNING *;
