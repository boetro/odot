# Odot - Simple Todo Application

A full-stack todo application built with Go (Gin) backend and React frontend.

## 🚀 Features

- **Backend**: RESTful API built with Go and Gin framework
- **Frontend**: Modern React UI with Vite build tool
- **Database**: PostgreSQL with migrations
- **Development**: Hot reload with Air (Go) and Vite (React)
- **API Documentation**: Swagger/OpenAPI integration
- **Containerization**: Docker Compose for easy development setup

## 🏗️ Architecture

```
odot/
├── cmd/                    # Application entry points
│   ├── server/            # Main server application
│   └── docs/              # Generated API documentation
├── internal/              # Private application code
│   ├── api/               # HTTP handlers and routes
│   ├── config/            # Configuration management
│   ├── db/                # Database connection and queries
│   ├── logger/            # Logging utilities
│   ├── models/            # Data models
│   └── types/             # Type definitions
├── sql/                   # Database related files
│   ├── migrations/        # Database migration files
│   └── queries/           # SQL queries for SQLC
├── ui/                    # React frontend
│   ├── src/               # React source code
│   ├── public/            # Static assets
│   └── dist/              # Built frontend assets
├── docker/                # Docker configuration files
└── init-scripts/          # Database initialization scripts
```

## 📋 Prerequisites

- Go 1.24.1 or later
- Node.js 18+ and npm
- Docker and Docker Compose
- PostgreSQL (if running locally)

## 🚀 Quick Start

### Using Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd odot
   ```

2. **Start the development environment**
   ```bash
   make dev
   ```

   This will start:
   - PostgreSQL database on port 5432
   - Go API server on port 8080 with hot reload
   - React development server accessible through the API

3. **Access the application**
   - Frontend: http://localhost:5173
   - API: http://localhost:8080
   - Swagger Docs: http://localhost:8080/swagger/index.html
   - Health Check: http://localhost:8080/health

### Manual Setup

1. **Database Setup**
   ```bash
   # Start PostgreSQL
   docker run -d \
     --name odot-postgres \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=postgres \
     -p 5432:5432 \
     postgres:14-alpine
   ```

2. **Backend Setup**
   ```bash
   # Install Go dependencies
   go mod download

   # Run database migrations
   make migrate

   # Generate SQL code
   make sql-gen

   # Generate API documentation
   make docs-gen

   # Start the server
   make build
   ./bin/server
   ```

3. **Frontend Setup**
   ```bash
   cd ui
   npm install
   npm run dev
   ```

## 🛠️ Development

The development environment uses **separate frontend and backend servers** for optimal developer experience:

- **Frontend**: React + Vite dev server on `http://localhost:5173`
- **Backend**: Go API server on `http://localhost:8080`
- **Database**: PostgreSQL on `localhost:5432`

### Available Make Commands

- `make dev` - Start full development environment with Docker Compose
- `make build` - Build the Go application
- `make test` - Run all tests
- `make clean` - Clean up containers and build artifacts
- `make db` - Connect to the PostgreSQL database
- `make logs` - View all container logs
- `make api-logs` - View API server logs only
- `make db-logs` - View database logs only
- `make sql-gen` - Generate Go code from SQL queries
- `make migrate` - Run database migrations
- `make docs-gen` - Generate API documentation

### Database Operations

**Connect to Database:**
```bash
make db
```

**Run Migrations:**
```bash
make migrate
```

**Generate SQL Code:**
```bash
make sql-gen
```

## 🔧 Configuration

The application uses environment variables for configuration:

- `PORT` - Server port (default: 8080)
- `DATABASE_URL` - PostgreSQL connection string
- `ENVIRONMENT` - Application environment (development/production)
- `LOG_LEVEL` - Logging level (debug/info/warn/error)

## 🚧 Development Status

This project is currently in early development. The basic infrastructure is set up, but todo-specific features are yet to be implemented.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📞 Support

For questions and support, please open an issue in the repository.
