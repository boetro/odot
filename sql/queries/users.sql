-- name: GetUser :one
SELECT * FROM "User" WHERE id = $1;
