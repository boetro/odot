package vision

import "context"

type ImageToTextResponse struct {
	Title   string `json:"title" binding:"required"`
	Content string `json:"content" binding:"required"`
}

type VisionService interface {
	ImageToText(ctx context.Context, imageData []byte) (*ImageToTextResponse, error)
}
