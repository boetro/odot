package vision

import (
	"context"
	"fmt"

	"github.com/boetro/odot/internal/config"
	"google.golang.org/genai"
)

type GoogleGeminiVisionClient struct {
	client *genai.Client
}

func NewGoogleGeminiVisionClient(ctx context.Context, cfg *config.Config) (*GoogleGeminiVisionClient, error) {
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  cfg.GeminiAPIKey,
		Backend: genai.BackendGeminiAPI,
	})

	if err != nil {
		return nil, fmt.Errorf("failed to create genai client: %w", err)
	}

	return &GoogleGeminiVisionClient{
		client: client,
	}, nil
}

func (s *GoogleGeminiVisionClient) ImageToText(ctx context.Context, imageData []byte) (string, error) {
	parts := []*genai.Part{
		genai.NewPartFromText("convert this image to markdown. please respond in raw text"),
		&genai.Part{
			InlineData: &genai.Blob{
				// TODO need to figure out the mimetype
				MIMEType: "image/jpeg",
				Data:     imageData,
			},
		},
	}
	contents := []*genai.Content{
		genai.NewContentFromParts(parts, genai.RoleUser),
	}

	result, err := s.client.Models.GenerateContent(
		ctx,
		"gemini-2.5-flash",
		contents,
		nil,
	)

	if err != nil {
		return "", fmt.Errorf("failed to generate content: %w", err)
	}

	txt := result.Text()

	return txt, nil
}
