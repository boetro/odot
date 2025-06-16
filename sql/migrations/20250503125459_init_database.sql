-- +goose Up
-- Create database schema for Todo Application
-- PostgreSQL version
-- Create Users table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    profile_picture_url TEXT,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        -- Ensure at least one authentication method exists
        CONSTRAINT auth_method_check CHECK (
            password_hash IS NOT NULL
            OR google_id IS NOT NULL
        )
);

-- Create Projects table
CREATE TABLE projects (
    project_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    parent_project_id INTEGER REFERENCES projects (project_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Default blue color in hex
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        -- Prevent self-referencing (project can't be its own parent)
        CONSTRAINT no_self_reference CHECK (project_id != parent_project_id)
);

-- Create Tags table
CREATE TABLE tags (
    tag_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280', -- Default gray color in hex
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        -- Ensure tag names are unique per user
        UNIQUE (user_id, name)
);

-- Create Todos table
CREATE TABLE todos (
    todo_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects (project_id) ON DELETE SET NULL,
    parent_todo_id INTEGER REFERENCES todos (todo_id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    assigned_date TIMESTAMP
WITH
    TIME ZONE,
    duration_min INTEGER,
        priority INTEGER DEFAULT 0,
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
    WITH
        TIME ZONE,
        -- Prevent self-referencing (todo can't be its own parent)
        CONSTRAINT no_self_reference CHECK (todo_id != parent_todo_id),

        -- Ensure completed_at is set when is_completed is true
        CONSTRAINT completion_consistency CHECK (
            (
                is_completed = FALSE
                AND completed_at IS NULL
            )
            OR (
                is_completed = TRUE
                AND completed_at IS NOT NULL
            )
        )
);

-- Create Comments table
CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY,
    todo_id INTEGER NOT NULL REFERENCES todos (todo_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create TodoTags junction table (many-to-many relationship)
CREATE TABLE todo_tags (
    todo_id INTEGER NOT NULL REFERENCES todos (todo_id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags (tag_id) ON DELETE CASCADE,
    PRIMARY KEY (todo_id, tag_id)
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users (email);

CREATE INDEX idx_users_google_id ON users (google_id);

CREATE INDEX idx_projects_user_id ON projects (user_id);

CREATE INDEX idx_tags_user_id ON tags (user_id);

CREATE INDEX idx_todos_user_id ON todos (user_id);

CREATE INDEX idx_todos_project_id ON todos (project_id);

CREATE INDEX idx_todos_parent_id ON todos (parent_todo_id);

CREATE INDEX idx_comments_todo_id ON comments (todo_id);

CREATE INDEX idx_todo_tags_todo_id ON todo_tags (todo_id);

CREATE INDEX idx_todo_tags_tag_id ON todo_tags (tag_id);

-- Create function to automatically update updated_at timestamp
CREATE
OR REPLACE FUNCTION update_updated_at_column () RETURNS TRIGGER AS 'BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;' language 'plpgsql';

-- Create triggers to automatically update updated_at timestamps
CREATE TRIGGER update_users_updated_at BEFORE
UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column ();

CREATE TRIGGER update_projects_updated_at BEFORE
UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column ();

CREATE TRIGGER update_todos_updated_at BEFORE
UPDATE ON todos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column ();

CREATE TRIGGER update_comments_updated_at BEFORE
UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column ();

-- Create trigger to automatically set completed_at when todo is marked complete
CREATE
OR REPLACE FUNCTION set_completed_at () RETURNS TRIGGER AS 'BEGIN IF OLD.is_completed = FALSE AND NEW.is_completed = TRUE THEN NEW.completed_at = CURRENT_TIMESTAMP; ELSIF OLD.is_completed = TRUE AND NEW.is_completed = FALSE THEN NEW.completed_at = NULL; END IF; RETURN NEW; END;' language 'plpgsql';

CREATE TRIGGER set_todo_completed_at BEFORE
UPDATE ON todos FOR EACH ROW EXECUTE FUNCTION set_completed_at ();

CREATE TABLE refresh_tokens (
    token_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP
    WITH
        TIME ZONE NOT NULL,
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_revoked BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);

CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);

CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);

-- +goose Down
-- Drop triggers first
DROP TRIGGER IF EXISTS set_todo_completed_at ON todos;

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;

DROP TRIGGER IF EXISTS update_todos_updated_at ON todos;

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Drop functions
DROP FUNCTION IF EXISTS set_completed_at ();

DROP FUNCTION IF EXISTS update_updated_at_column ();

-- Drop indexes
DROP INDEX IF EXISTS idx_todo_tags_tag_id;

DROP INDEX IF EXISTS idx_todo_tags_todo_id;

DROP INDEX IF EXISTS idx_comments_todo_id;

DROP INDEX IF EXISTS idx_todos_parent_id;

DROP INDEX IF EXISTS idx_todos_project_id;

DROP INDEX IF EXISTS idx_todos_user_id;

DROP INDEX IF EXISTS idx_tags_user_id;

DROP INDEX IF EXISTS idx_projects_user_id;

DROP INDEX IF EXISTS idx_users_google_id;

DROP INDEX IF EXISTS idx_users_email;

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS todo_tags;

DROP TABLE IF EXISTS comments;

DROP TABLE IF EXISTS todos;

DROP TABLE IF EXISTS tags;

DROP TABLE IF EXISTS projects;

DROP TABLE IF EXISTS users;

DROP TRIGGER IF EXISTS update_refresh_tokens_last_used_at ON refresh_tokens;

DROP INDEX IF EXISTS idx_refresh_tokens_expires_at;

DROP INDEX IF EXISTS idx_refresh_tokens_token_hash;

DROP INDEX IF EXISTS idx_refresh_tokens_user_id;

DROP TABLE IF EXISTS refresh_tokens;
