package vision

import "context"

type VisionService interface {
	ImageToText(ctx context.Context, imageData []byte) (string, error)
}
