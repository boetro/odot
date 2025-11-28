package vision

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

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

var prompt = `You are tasked with converting an image to markdown text.

## Response format

Always respond in a json form that matches:
{
	"title": "<the title of the markdown that you converted>"
	"content": "<the actual content of the markdown you converted>"
}

## Important Notes

if the image looks like a grocery list or any type of list the would require manually checking stuff of please prefix each item with - [ ] (with a space between the brackets for proper GFM syntax)
`

func (s *GoogleGeminiVisionClient) ImageToText(ctx context.Context, imageData []byte) (*ImageToTextResponse, error) {
	parts := []*genai.Part{
		genai.NewPartFromText(prompt),
		{
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
		return nil, fmt.Errorf("failed to generate content: %w", err)
	}

	txt := result.Text()

	// Clean up the response - remove markdown code blocks if present
	txt = strings.TrimSpace(txt)
	txt = strings.TrimPrefix(txt, "```json")
	txt = strings.TrimPrefix(txt, "```")
	txt = strings.TrimSuffix(txt, "```")
	txt = strings.TrimSpace(txt)

	// Parse the JSON response
	var response ImageToTextResponse
	if err := json.Unmarshal([]byte(txt), &response); err != nil {
		return nil, fmt.Errorf("failed to parse JSON response: %w", err)
	}

	return &response, nil
}
