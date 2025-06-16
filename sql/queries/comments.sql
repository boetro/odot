-- name: CreateComment :one
INSERT INTO comments (todo_id, user_id, content)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetComment :one
SELECT * FROM comments
WHERE comment_id = $1;

-- name: ListComments :many
SELECT * FROM comments
WHERE todo_id = $1
ORDER BY created_at ASC;

-- name: ListCommentsByUser :many
SELECT * FROM comments
WHERE user_id = $1
ORDER BY created_at DESC;

-- name: UpdateComment :one
UPDATE comments
SET content = $2
WHERE comment_id = $1
RETURNING *;

-- name: DeleteComment :exec
DELETE FROM comments
WHERE comment_id = $1;