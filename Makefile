# Makefile

.PHONY: dev build test clean

dev:
	./dev.sh

# Build the application
build:
	go build -o bin/server ./cmd/server

# Run tests
test:
	go test ./...

# Clean up
clean:
	docker-compose down -v
	rm -rf bin tmp

# Connect to database
db:
	docker exec -it odot-postgres-dev psql -U postgres -d postgres

# View logs
logs:
	docker-compose logs -f

# Just the API logs
api-logs:
	docker-compose logs -f api

# Database logs
db-logs:
	docker-compose logs -f postgres

sql-gen:
	sqlc generate

migrate:
	docker-compose up migrations

docs-gen:
	swag init -g ./cmd/server/main.go -o cmd/docs
