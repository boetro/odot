-- name: CreateTodo :one
INSERT INTO todos (user_id, project_id, parent_todo_id, title, description, assigned_date, duration_min, priority)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
SET project_id = $2, parent_todo_id = $3, title = $4, description = $5, assigned_date = $6, duration_min = $7, priority = $8
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