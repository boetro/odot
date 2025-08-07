package webpush

import (
	"encoding/json"
	"fmt"

	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/boetro/odot/internal/db"
)

type Service struct {
	VAPIDKeys    *VAPIDKeys
	VAPIDSubject string
}

type VAPIDKeys struct {
	PublicKey  string `json:"public_key"`
	PrivateKey string `json:"private_key"`
}

type NotificationPayload struct {
	Title string      `json:"title"`
	Body  string      `json:"body"`
	Icon  string      `json:"icon,omitempty"`
	Badge string      `json:"badge,omitempty"`
	Data  interface{} `json:"data,omitempty"`
}

type PushSubscription struct {
	Endpoint string `json:"endpoint"`
	Keys     struct {
		P256dh string `json:"p256dh"`
		Auth   string `json:"auth"`
	} `json:"keys"`
}

func PushSubscriptionFromDB(dbSub db.PushSubscription) *PushSubscription {
	return &PushSubscription{
		Endpoint: dbSub.Endpoint,
		Keys: struct {
			P256dh string `json:"p256dh"`
			Auth   string `json:"auth"`
		}{
			P256dh: dbSub.P256dhKey,
			Auth:   dbSub.AuthKey,
		},
	}
}

func NewService(vapidKeys *VAPIDKeys, subject string) *Service {
	return &Service{
		VAPIDKeys:    vapidKeys,
		VAPIDSubject: subject,
	}
}

func GenerateVAPIDKeys() (*VAPIDKeys, error) {
	privateKey, publicKey, err := webpush.GenerateVAPIDKeys()
	if err != nil {
		return nil, fmt.Errorf("failed to generate VAPID keys: %w", err)
	}

	return &VAPIDKeys{
		PublicKey:  publicKey,
		PrivateKey: privateKey,
	}, nil
}

func (s *Service) SendNotification(subscription *PushSubscription, payload *NotificationPayload) error {
	// Convert our subscription format to webpush-go format
	sub := &webpush.Subscription{
		Endpoint: subscription.Endpoint,
		Keys: webpush.Keys{
			P256dh: subscription.Keys.P256dh,
			Auth:   subscription.Keys.Auth,
		},
	}

	// Marshal payload to JSON
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	// Create push options
	options := &webpush.Options{
		Subscriber:      s.VAPIDSubject,
		VAPIDPublicKey:  s.VAPIDKeys.PublicKey,
		VAPIDPrivateKey: s.VAPIDKeys.PrivateKey,
		TTL:             86400, // 24 hours
	}

	// Send the notification
	resp, err := webpush.SendNotification(payloadBytes, sub, options)
	if err != nil {
		return fmt.Errorf("failed to send push notification: %w", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("push service responded with status %d", resp.StatusCode)
	}

	return nil
}
