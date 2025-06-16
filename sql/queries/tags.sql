-- name: CreateTag :one
INSERT INTO tags (user_id, name, color)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetTag :one
SELECT * FROM tags
WHERE tag_id = $1;

-- name: ListTags :many
SELECT * FROM tags
WHERE user_id = $1
ORDER BY name ASC;

-- name: GetTagByName :one
SELECT * FROM tags
WHERE user_id = $1 AND name = $2;

-- name: UpdateTag :one
UPDATE tags
SET name = $2, color = $3
WHERE tag_id = $1
RETURNING *;

-- name: DeleteTag :exec
DELETE FROM tags
WHERE tag_id = $1;