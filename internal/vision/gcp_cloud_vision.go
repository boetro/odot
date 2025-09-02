package vision

import (
	"context"
	"fmt"
	"strings"

	vision "cloud.google.com/go/vision/apiv1"
	"cloud.google.com/go/vision/v2/apiv1/visionpb"
	"google.golang.org/api/option"
)

type GoogleCloudVisionClient struct {
	client *vision.ImageAnnotatorClient
}

func NewGoogleCloudVisionClient(ctx context.Context) (*GoogleCloudVisionClient, error) {
	// TODO: make this configurable
	client, err := vision.NewImageAnnotatorClient(ctx, option.WithQuotaProject("odot-dev"))
	if err != nil {
		return nil, fmt.Errorf("failed to create GCP Vision client: %w", err)
	}

	return &GoogleCloudVisionClient{
		client: client,
	}, nil
}

func (s *GoogleCloudVisionClient) Close() error {
	return s.client.Close()
}

func (s *GoogleCloudVisionClient) ImageToText(ctx context.Context, imageData []byte) (string, error) {
	image := &visionpb.Image{
		Content: imageData,
	}
	annotations, err := s.client.DetectTexts(ctx, image, nil, 10)
	if err != nil {
		return "", fmt.Errorf("failed to detect text: %w", err)
	}

	if len(annotations) == 0 {
		return "", fmt.Errorf("No text found in image")
	}

	var texts []string

	for i := 1; i < len(annotations); i++ {
		texts = append(texts, annotations[i].Description)
	}

	joinedText := strings.Join(texts, "\n")
	return joinedText, nil
}
