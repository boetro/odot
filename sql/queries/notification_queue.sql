-- name: CreateNotification :one
INSERT INTO notification_queue (
    todo_id, user_id, scheduled_for, notification_type
) VALUES (
    $1, $2, $3, $4
) RETURNING *;

-- name: GetPendingNotifications :many
SELECT * FROM notification_queue
WHERE scheduled_for <= NOW() AND sent = FALSE
ORDER BY scheduled_for ASC;

-- name: MarkNotificationSent :exec
UPDATE notification_queue
SET sent = TRUE
WHERE notification_id = $1;

-- name: GetUnsentNotificationsInRange :many
SELECT * FROM notification_queue
WHERE scheduled_for BETWEEN $1 AND $2 AND sent = FALSE
ORDER BY scheduled_for ASC;

-- name: DeleteNotification :exec
DELETE FROM notification_queue
WHERE notification_id = $1;

-- name: UpdateNotificationSchedule :execrows
UPDATE notification_queue
SET scheduled_for = $2
WHERE todo_id = $1 AND sent = FALSE;

-- name: GetNotificationsWithTodoAndSubscriptions :many
SELECT 
    nq.notification_id,
    nq.todo_id,
    nq.user_id,
    nq.scheduled_for,
    nq.notification_type,
    nq.sent,
    nq.created_at,
    t.title as todo_title,
    t.description as todo_description,
    t.scheduled_date as todo_scheduled_date,
    t.duration_min as todo_duration_min,
    t.priority as todo_priority,
    ps.id as subscription_id,
    ps.endpoint,
    ps.p256dh_key,
    ps.auth_key
FROM notification_queue nq
JOIN todos t ON nq.todo_id = t.todo_id
JOIN push_subscriptions ps ON nq.user_id = ps.user_id AND ps.is_active = TRUE
WHERE nq.scheduled_for BETWEEN $1 AND $2 AND nq.sent = FALSE
ORDER BY nq.scheduled_for ASC;