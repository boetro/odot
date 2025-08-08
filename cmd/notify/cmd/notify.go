package cmd

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/boetro/odot/internal/db"
	"github.com/boetro/odot/internal/webpush"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/spf13/cobra"
)

var rootCmd *cobra.Command

func newRootCmd(ctx context.Context, queries db.Querier, pushService *webpush.Service) *cobra.Command {
	return &cobra.Command{
		Use:   "notify",
		Short: "Send notifications that are due over a time range",
		Run: func(cmd *cobra.Command, args []string) {
			startStr, _ := cmd.Flags().GetString("start")
			endStr, _ := cmd.Flags().GetString("end")

			now := time.Now()
			var start, end time.Time
			var err error

			if startStr == "" {
				start = now.Add(-time.Minute)
			} else {
				start, err = time.Parse(time.RFC3339, startStr)
				if err != nil {
					fmt.Printf("Error parsing start time: %v\n", err)
					return
				}
			}

			if endStr == "" {
				end = now.Add(time.Minute)
			} else {
				end, err = time.Parse(time.RFC3339, endStr)
				if err != nil {
					fmt.Printf("Error parsing end time: %v\n", err)
					return
				}
			}

			fmt.Printf("Start time: %s\n", start.Format(time.RFC3339))
			fmt.Printf("End time: %s\n", end.Format(time.RFC3339))

			notifies, err := queries.GetNotificationsWithTodoAndSubscriptions(context.Background(), db.GetNotificationsWithTodoAndSubscriptionsParams{
				ScheduledFor: pgtype.Timestamptz{
					Time:  start,
					Valid: true,
				},
				ScheduledFor_2: pgtype.Timestamptz{
					Time:  end,
					Valid: true,
				},
			})

			if err != nil {
				fmt.Printf("Error getting notifications: %v\n", err)
				return
			}

			if len(notifies) == 0 {
				fmt.Println("No notifications found")
				return
			}

			for _, notify := range notifies {
				fmt.Printf("Sending notification: %d\n", notify.TodoID)
				fmt.Printf("  Todo: %s\n", notify.TodoTitle)
				fmt.Printf("  User: %d\n", notify.UserID)
				fmt.Printf("  Endpoint: %s\n", notify.Endpoint)
				fmt.Printf("  Subscription ID: %d\n", notify.SubscriptionID)

				pushService.SendNotification(&webpush.PushSubscription{
					Endpoint: notify.Endpoint,
					Keys: struct {
						P256dh string `json:"p256dh"`
						Auth   string `json:"auth"`
					}{
						P256dh: notify.P256dhKey,
						Auth:   notify.AuthKey,
					},
				}, &webpush.NotificationPayload{
					Title: notify.TodoTitle,
					Body:  notify.TodoDescription.String,
					Data: map[string]interface{}{
						"todoId": notify.TodoID,
					},
				})

				err := queries.MarkNotificationSent(ctx, notify.NotificationID)
				if err != nil {
					fmt.Printf("Error marking notification as sent: %v\n", err)
				}
			}
		},
	}
}

func Execute(c context.Context, querier db.Querier, pushService *webpush.Service) {
	rootCmd = newRootCmd(c, querier, pushService)

	rootCmd.PersistentFlags().StringP("start", "s", "", "Start time for notification range (RFC3339 format, defaults to 1 minute ago)")
	rootCmd.PersistentFlags().StringP("end", "e", "", "End time for notification range (RFC3339 format, defaults to 1 minute from now)")

	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
