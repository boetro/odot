#!/bin/bash

# Development startup script for odot
# This script starts the development environment with separate frontend and backend servers

set -e

echo "🚀 Starting odot Development Environment"
echo "========================================="

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install Docker Compose first."
    exit 1
fi

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
docker-compose -f docker-compose.dev.yaml up --build

# Keep the script running
wait
