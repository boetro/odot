# Project Info

This is a todo application with a golang backend that uses gin, and a react frontend that uses bun, tanstack router, and tan stack query

# Directory Structure

- `ui` all ui code lives in this directory
- `cmd` golang binaries live here
- `sql` sql files live here. We use `sqlc` to generate our sql code for the golang backend
- `internal` all internal backend golang code lives here
- `docker` all docker files live here

# Development

When developing locally I use a docker compose setup with the file `docker-compose.dev.yaml`. The `Makefile` in this project contains common commands for development and deployment.
