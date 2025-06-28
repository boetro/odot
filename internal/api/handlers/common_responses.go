package handlers

// ErrorResponse represents a generic error response structure.
type ErrorResponse struct {
	Error string `json:"error"`
}

// MessageResponse represents a generic success message response structure.
type MessageResponse struct {
	Message string `json:"message"`
}
