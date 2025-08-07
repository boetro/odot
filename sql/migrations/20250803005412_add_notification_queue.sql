-- +goose Up
-- +goose StatementBegin
CREATE TABLE notification_queue (
    notification_id SERIAL PRIMARY KEY,
    todo_id INTEGER NOT NULL REFERENCES todos (todo_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL, -- When to send it
    notification_type VARCHAR(50) DEFAULT 'todo_reminder',
    sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notification_queue_due_notifications ON notification_queue (scheduled_for, sent)
WHERE sent = false;

CREATE INDEX idx_notification_queue_unsent_todos ON notification_queue (todo_id)
WHERE sent = false;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP INDEX idx_notification_queue_due_notifications;
DROP INDEX idx_notification_queue_unsent_todos;
DROP TABLE notification_queue;

-- +goose StatementEnd
