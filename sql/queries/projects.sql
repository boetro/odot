-- name: CreateProject :one
INSERT INTO projects (user_id, parent_project_id, name, description, color)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetProject :one
SELECT * FROM projects
WHERE project_id = $1;

-- name: ListProjects :many
SELECT * FROM projects
WHERE user_id = $1
ORDER BY created_at DESC;

-- name: ListProjectsByParent :many
SELECT * FROM projects
WHERE user_id = $1 AND parent_project_id = $2
ORDER BY created_at DESC;

-- name: UpdateProject :one
UPDATE projects
SET parent_project_id = $2, name = $3, description = $4, color = $5
WHERE project_id = $1
RETURNING *;

-- name: DeleteProject :exec
DELETE FROM projects
WHERE project_id = $1;