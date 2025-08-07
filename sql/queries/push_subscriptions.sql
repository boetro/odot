-- name: CreatePushSubscription :one
INSERT INTO push_subscriptions (
    user_id, endpoint, p256dh_key, auth_key
) VALUES (
    $1, $2, $3, $4
) ON CONFLICT (user_id, endpoint)
DO UPDATE SET
    p256dh_key = EXCLUDED.p256dh_key,
    auth_key = EXCLUDED.auth_key,
    updated_at = NOW(),
    is_active = TRUE
RETURNING *;

-- name: GetUserPushSubscriptions :many
SELECT * FROM push_subscriptions
WHERE user_id = $1 AND is_active = TRUE
ORDER BY created_at DESC;

-- name: DeletePushSubscription :exec
UPDATE push_subscriptions
SET is_active = FALSE, updated_at = NOW()
WHERE user_id = $1 AND endpoint = $2;

-- name: CleanupOldSubscriptions :exec
DELETE FROM push_subscriptions
WHERE created_at < NOW() - INTERVAL '30 days' AND is_active = FALSE;

-- name: MarkSubscriptionInactive :exec
UPDATE push_subscriptions
SET is_active = FALSE, updated_at = NOW()
WHERE user_id = $1 AND endpoint = $2;
