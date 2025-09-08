#!/bin/bash

# Odot Local Build and Deploy Script
# Replicates the GitHub Actions workflow for local testing/deployment

set -euo pipefail

# Default values
REGISTRY="ghcr.io"
IMAGE_NAME="boetro/odot"
TAG=""
K8S_CONFIGS_PATH=""
PUSH_IMAGE=false
BUILD_PLATFORMS="linux/arm64"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print usage
usage() {
    echo "Usage: $0 -t <tag> -k <k8s-configs-path> [options]"
    echo ""
    echo "Required:"
    echo "  -t, --tag <tag>               Image tag to use (e.g., main-abc1234)"
    echo "  -k, --k8s-configs <path>      Path to k8s-configs repository"
    echo ""
    echo "Options:"
    echo "  -r, --registry <registry>     Container registry (default: $REGISTRY)"
    echo "  -i, --image <image-name>      Image name (default: $IMAGE_NAME)"
    echo "  -p, --push                    Push image to registry (default: false)"
    echo "  --platforms <platforms>       Build platforms (default: $BUILD_PLATFORMS)"
    echo "  -h, --help                    Show this help message"
    echo ""
    echo "Examples:"
    echo "  # Build and update k8s configs for local testing"
    echo "  $0 -t test-$(git rev-parse --short HEAD) -k ../k8s-configs"
    echo ""
    echo "  # Build, push, and update k8s configs"
    echo "  $0 -t main-$(git rev-parse --short HEAD) -k ../k8s-configs --push"
}

# Log functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -k|--k8s-configs)
            K8S_CONFIGS_PATH="$2"
            shift 2
            ;;
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        -i|--image)
            IMAGE_NAME="$2"
            shift 2
            ;;
        -p|--push)
            PUSH_IMAGE=true
            shift
            ;;
        --platforms)
            BUILD_PLATFORMS="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate required arguments
if [[ -z "$TAG" ]]; then
    log_error "Tag is required. Use -t or --tag to specify."
    usage
    exit 1
fi

if [[ -z "$K8S_CONFIGS_PATH" ]]; then
    log_error "K8s configs path is required. Use -k or --k8s-configs to specify."
    usage
    exit 1
fi

# Validate k8s-configs path exists
if [[ ! -d "$K8S_CONFIGS_PATH" ]]; then
    log_error "K8s configs directory does not exist: $K8S_CONFIGS_PATH"
    exit 1
fi

# Validate k8s-configs path contains the expected files
DEPLOYMENT_FILE="$K8S_CONFIGS_PATH/applications/odot/deployment.yaml"
NOTIFICATION_FILE="$K8S_CONFIGS_PATH/applications/odot/notification-cron.yaml"

if [[ ! -f "$DEPLOYMENT_FILE" ]]; then
    log_error "Deployment file not found: $DEPLOYMENT_FILE"
    exit 1
fi

if [[ ! -f "$NOTIFICATION_FILE" ]]; then
    log_error "Notification cron file not found: $NOTIFICATION_FILE"
    exit 1
fi

# Build full image name
FULL_IMAGE="$REGISTRY/$IMAGE_NAME:$TAG"

log_info "Starting build and deploy process..."
log_info "Image: $FULL_IMAGE"
log_info "K8s configs path: $K8S_CONFIGS_PATH"
log_info "Push to registry: $PUSH_IMAGE"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    log_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Build Docker image
log_info "Building Docker image: $FULL_IMAGE"
log_info "Platforms: $BUILD_PLATFORMS"

BUILD_ARGS=(
    "--platform=$BUILD_PLATFORMS"
    "--tag=$FULL_IMAGE"
    "--build-arg=BUILDKIT_INLINE_CACHE=1"
    "."
)

if [[ "$PUSH_IMAGE" == true ]]; then
    BUILD_ARGS+=("--push")
    log_info "Image will be pushed to registry"
else
    BUILD_ARGS+=("--load")
    log_warning "Image will only be built locally (use --push to push to registry)"
fi

if ! docker buildx build "${BUILD_ARGS[@]}"; then
    log_error "Docker build failed"
    exit 1
fi

log_success "Docker image built successfully: $FULL_IMAGE"

# Update Kubernetes deployment files
log_info "Updating Kubernetes deployment files..."

# Create backup of original files
cp "$DEPLOYMENT_FILE" "$DEPLOYMENT_FILE.backup"
cp "$NOTIFICATION_FILE" "$NOTIFICATION_FILE.backup"

log_info "Created backups of original deployment files"

# Update image tags in deployment files
if sed -i.tmp "s|image: ghcr.io/boetro/odot:.*|image: $FULL_IMAGE|g" "$DEPLOYMENT_FILE"; then
    rm "$DEPLOYMENT_FILE.tmp"
    log_success "Updated deployment.yaml"
else
    log_error "Failed to update deployment.yaml"
    exit 1
fi

if sed -i.tmp "s|image: ghcr.io/boetro/odot:.*|image: $FULL_IMAGE|g" "$NOTIFICATION_FILE"; then
    rm "$NOTIFICATION_FILE.tmp"
    log_success "Updated notification-cron.yaml"
else
    log_error "Failed to update notification-cron.yaml"
    exit 1
fi

# Check if there are any changes to commit
cd "$K8S_CONFIGS_PATH"

if git diff --quiet applications/odot/deployment.yaml applications/odot/notification-cron.yaml; then
    log_warning "No changes detected in k8s configuration files"
else
    log_info "Changes detected in k8s configuration files:"
    git diff applications/odot/deployment.yaml applications/odot/notification-cron.yaml

    log_info "Files updated successfully. You can now:"
    echo "  1. Review the changes: git diff applications/odot/"
    echo "  2. Commit the changes: git add applications/odot/ && git commit -m 'Update odot deployment to $TAG'"
    echo "  3. Push the changes: git push"
    echo ""
    echo "Or restore the original files using the .backup files created."
fi

cd - > /dev/null

log_success "Build and deploy process completed!"
log_info "Summary:"
log_info "  - Docker image: $FULL_IMAGE"
log_info "  - Image pushed: $PUSH_IMAGE"
log_info "  - K8s configs updated in: $K8S_CONFIGS_PATH"
log_info "  - Backup files created with .backup extension"
