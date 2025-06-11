-- +goose Up
-- +goose StatementBegin
-- Create User table
CREATE TABLE IF NOT EXISTS "User" (id TEXT PRIMARY KEY);

-- +goose StatementEnd
-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS "User";

-- +goose StatementEnd
