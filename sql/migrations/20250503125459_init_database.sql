-- +goose Up
-- Updated database schema for Todo Application with recurring support
-- PostgreSQL version

-- Keep existing users table unchanged
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    profile_picture_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT auth_method_check CHECK (
        password_hash IS NOT NULL OR google_id IS NOT NULL
    )
);

-- Keep existing projects table unchanged
CREATE TABLE projects (
    project_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    parent_project_id INTEGER REFERENCES projects (project_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT no_self_reference CHECK (project_id != parent_project_id)
);

-- Keep existing tags table unchanged
CREATE TABLE tags (
    tag_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, name)
);

-- NEW: Todo templates for recurring todos
CREATE TABLE todo_templates (
    template_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects (project_id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    duration_min INTEGER,
    priority INTEGER DEFAULT 0,
    rrule TEXT NOT NULL, -- RFC 5545 RRULE string (e.g., "FREQ=DAILY;INTERVAL=1")
    dtstart TIMESTAMP WITH TIME ZONE NOT NULL, -- When recurrence pattern starts
    until_date TIMESTAMP WITH TIME ZONE, -- When recurrence ends (NULL = infinite)
    is_active BOOLEAN DEFAULT TRUE, -- Can be used to "pause" a recurring todo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- UPDATED: Todos table now handles both one-off and recurring instances
CREATE TABLE todos (
    todo_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    template_id INTEGER REFERENCES todo_templates (template_id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects (project_id) ON DELETE SET NULL,
    parent_todo_id INTEGER REFERENCES todos (todo_id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    scheduled_date TIMESTAMP WITH TIME ZONE,
    duration_min INTEGER,
    priority INTEGER DEFAULT 0,

    -- Modification tracking for recurring instances
    is_modified BOOLEAN DEFAULT FALSE, -- Has this instance been customized?
    modified_fields JSONB, -- Track which fields were modified: {"title": true, "description": true}

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT no_self_reference CHECK (todo_id != parent_todo_id),
    CONSTRAINT completion_consistency CHECK (
        (is_completed = FALSE AND completed_at IS NULL) OR
        (is_completed = TRUE AND completed_at IS NOT NULL)
    ),
    -- Ensure recurring instances have a template
    CONSTRAINT recurring_has_template CHECK (
        template_id IS NOT NULL OR
        (template_id IS NULL AND is_modified = FALSE AND modified_fields IS NULL)
    )
);

-- Keep existing comments table unchanged
CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY,
    todo_id INTEGER NOT NULL REFERENCES todos (todo_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Keep existing junction table unchanged
CREATE TABLE todo_tags (
    todo_id INTEGER NOT NULL REFERENCES todos (todo_id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags (tag_id) ON DELETE CASCADE,
    PRIMARY KEY (todo_id, tag_id)
);

-- NEW: Junction table for template tags
CREATE TABLE template_tags (
    template_id INTEGER NOT NULL REFERENCES todo_templates (template_id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags (tag_id) ON DELETE CASCADE,
    PRIMARY KEY (template_id, tag_id)
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_google_id ON users (google_id);
CREATE INDEX idx_projects_user_id ON projects (user_id);
CREATE INDEX idx_tags_user_id ON tags (user_id);
CREATE INDEX idx_todos_user_id ON todos (user_id);
CREATE INDEX idx_todos_template_id ON todos (template_id);
CREATE INDEX idx_todos_project_id ON todos (project_id);
CREATE INDEX idx_todos_parent_id ON todos (parent_todo_id);
CREATE INDEX idx_todos_scheduled_date ON todos (scheduled_date);
CREATE INDEX idx_todos_user_scheduled ON todos (user_id, scheduled_date);
CREATE INDEX idx_comments_todo_id ON comments (todo_id);
CREATE INDEX idx_todo_tags_todo_id ON todo_tags (todo_id);
CREATE INDEX idx_todo_tags_tag_id ON todo_tags (tag_id);
CREATE INDEX idx_template_tags_template_id ON template_tags (template_id);
CREATE INDEX idx_template_tags_tag_id ON template_tags (tag_id);
CREATE INDEX idx_todo_templates_user_id ON todo_templates (user_id);

-- Keep existing refresh_tokens table
CREATE TABLE refresh_tokens (
    token_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_revoked BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);

-- +goose Down
-- Drop everything in reverse order
DROP TRIGGER IF EXISTS set_todo_completed_at ON todos;
DROP TRIGGER IF EXISTS update_todo_templates_updated_at ON todo_templates;
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
DROP TRIGGER IF EXISTS update_todos_updated_at ON todos;
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

DROP INDEX IF EXISTS idx_todo_templates_user_id;
DROP INDEX IF EXISTS idx_template_tags_tag_id;
DROP INDEX IF EXISTS idx_template_tags_template_id;
DROP INDEX IF EXISTS idx_todos_user_scheduled;
DROP INDEX IF EXISTS idx_todos_scheduled_date;
DROP INDEX IF EXISTS idx_todo_tags_tag_id;
DROP INDEX IF EXISTS idx_todo_tags_todo_id;
DROP INDEX IF EXISTS idx_comments_todo_id;
DROP INDEX IF EXISTS idx_todos_parent_id;
DROP INDEX IF EXISTS idx_todos_project_id;
DROP INDEX IF EXISTS idx_todos_template_id;
DROP INDEX IF EXISTS idx_todos_user_id;
DROP INDEX IF EXISTS idx_tags_user_id;
DROP INDEX IF EXISTS idx_projects_user_id;
DROP INDEX IF EXISTS idx_users_google_id;
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_refresh_tokens_expires_at;
DROP INDEX IF EXISTS idx_refresh_tokens_token_hash;
DROP INDEX IF EXISTS idx_refresh_tokens_user_id;

DROP TABLE IF EXISTS template_tags;
DROP TABLE IF EXISTS todo_tags;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS todos;
DROP TABLE IF EXISTS todo_templates;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;
