# Production Dockerfile for ODOT Go Application
# Multi-stage build for smaller final image

# UI Build stage
FROM oven/bun:1-debian AS ui-builder

WORKDIR /app/ui

# Copy UI package files
COPY ui/package.json ./
COPY ui/bun.lock ./

# Install UI dependencies
RUN bun install --frozen-lockfile

# Copy UI source
COPY ui/ ./

# Build the UI
RUN bun run build

# Go Build stage
FROM golang:1.24-alpine AS go-builder

# Install required packages for building
RUN apk add --no-cache curl ca-certificates

WORKDIR /app

# Copy dependency files first for better layer caching
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download && go mod verify

# Install goose binary directly (much faster than go install)
RUN curl -fsSL https://github.com/pressly/goose/releases/latest/download/goose_linux_arm64 -o /tmp/goose && \
    chmod +x /tmp/goose && \
    mv /tmp/goose /go/bin/goose

# Copy source code
COPY . .

# Copy built UI from ui-builder stage
COPY --from=ui-builder /app/ui/dist ./ui/dist

# Build the application with optimizations (UI files will be embedded)
# Use build args for target platform instead of hardcoded values
ARG TARGETOS=linux
ARG TARGETARCH=arm64
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build \
    -ldflags='-w -s -extldflags "-static"' \
    -o bin/server \
    ./cmd/server

# Production stage
FROM gcr.io/distroless/static-debian12:nonroot

# Copy the binary from go-builder stage
COPY --from=go-builder /app/bin/server /server

# Copy goose binary for migrations
COPY --from=go-builder /go/bin/goose /usr/local/bin/goose


# Copy migrations
COPY sql/migrations /migrations

# Use non-root user for security
USER nonroot:nonroot

# Expose port (configurable via environment)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["/server", "-health-check"] || exit 1

# Run the server
ENTRYPOINT ["/server"]
