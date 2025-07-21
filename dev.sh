#!/bin/bash

# Development startup script for odot
# This script starts the development environment with separate frontend and backend servers
# Usage: ./dev.sh [--no-cache] [--no-build]

set -e

echo "🚀 Starting odot Development Environment"
echo "========================================="

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Parse command line arguments
BUILD_FLAGS=""
BUILD_OPTION="--build"

for arg in "$@"; do
    case $arg in
        --no-cache)
            BUILD_FLAGS="--no-cache"
            echo "🔄 Building with --no-cache flag"
            ;;
        --no-build)
            BUILD_OPTION=""
            echo "⚡ Skipping build step"
            ;;
    esac
done

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down development environment..."
    docker-compose -f docker-compose.dev.yaml down
    exit 0
}

# Trap cleanup function on script exit
trap cleanup SIGINT SIGTERM

echo "📦 Starting services with docker-compose..."
if [[ "$BUILD_FLAGS" == "--no-cache" ]]; then
    docker-compose -f docker-compose.dev.yaml build --no-cache
    docker-compose -f docker-compose.dev.yaml up
else
    docker-compose -f docker-compose.dev.yaml up $BUILD_OPTION
fi

# Keep the script running
wait
