-- name: CreateTodoTag :exec
INSERT INTO todo_tags (todo_id, tag_id)
VALUES ($1, $2);

-- name: GetTodoTags :many
SELECT * FROM todo_tags
WHERE todo_id = $1;

-- name: GetTagTodos :many
SELECT * FROM todo_tags
WHERE tag_id = $1;

-- name: ListTodoTagsByTodo :many
SELECT t.* FROM tags t
JOIN todo_tags tt ON t.tag_id = tt.tag_id
WHERE tt.todo_id = $1
ORDER BY t.name ASC;

-- name: ListTodosByTag :many
SELECT td.* FROM todos td
JOIN todo_tags tt ON td.todo_id = tt.todo_id
WHERE tt.tag_id = $1
ORDER BY td.created_at DESC;

-- name: DeleteTodoTag :exec
DELETE FROM todo_tags
WHERE todo_id = $1 AND tag_id = $2;

-- name: DeleteAllTodoTags :exec
DELETE FROM todo_tags
WHERE todo_id = $1;

-- name: DeleteAllTagTodos :exec
DELETE FROM todo_tags
WHERE tag_id = $1;