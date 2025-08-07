package main

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/boetro/odot/internal/webpush"
)

func main() {
	keys, err := webpush.GenerateVAPIDKeys()
	if err != nil {
		log.Fatal("Failed to generate VAPID keys:", err)
	}

	fmt.Println("VAPID Keys generated successfully:")
	fmt.Printf("VAPID_PUBLIC_KEY=%s\n", keys.PublicKey)
	fmt.Printf("VAPID_PRIVATE_KEY=%s\n", keys.PrivateKey)
	fmt.Println()
	fmt.Println("Also set VAPID_SUBJECT to your email or domain:")
	fmt.Println("VAPID_SUBJECT=mailto:your-email@domain.com")
	fmt.Println("# or")
	fmt.Println("VAPID_SUBJECT=https://yourdomain.com")

	// Pretty print JSON for reference
	jsonKeys, _ := json.MarshalIndent(keys, "", "  ")
	fmt.Printf("\nJSON format:\n%s\n", jsonKeys)
}