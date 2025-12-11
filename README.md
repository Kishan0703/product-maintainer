# Product Maintainer

AI-powered product maintenance platform with intelligent insights and automation.

## 🚀 Project Structure

```
product-maintainer/
├── apps/
│   ├── web/                 # Next.js web application
│   └── api/                 # Node.js Express API
├── packages/
│   └── shared/              # Shared TypeScript types
├── docker-compose.yml       # Docker infrastructure
└── pnpm-workspace.yaml      # Monorepo configuration
```

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **Docker** and **Docker Compose**

## 🛠️ Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd product-maintainer

# Install dependencies
pnpm install
```

### 2. Set Up Environment Variables

```bash
# Copy environment files
cp .env.example .env
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
```

### 3. Start Docker Services

```bash
# Start Postgres (with pgvector) and Redis
docker-compose up -d

# Verify services are running
docker-compose ps
```

### 4. Run Database Migrations

```bash
# The migrations will run automatically when Postgres starts
# To verify, check the database:
docker exec -it product-maintainer-postgres psql -U postgres -d product_maintainer -c "\dt"

# Verify pgvector extension
docker exec -it product-maintainer-postgres psql -U postgres -d product_maintainer -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

### 5. Start Development Servers

```bash
# Terminal 1: Start the web app (Next.js)
pnpm dev:web
# Runs on http://localhost:3000

# Terminal 2: Start the API (Express)
pnpm dev:api
# Runs on http://localhost:4000
```

## 🧪 Verification

### Check API Health

```bash
# Basic health check
curl http://localhost:4000/health
# Expected: {"status":"ok"}

# Database health check
curl http://localhost:4000/health/db
# Expected: {"status":"ok","database":"connected"}
```

### Check Web App

Open your browser and navigate to:
- **Web App**: http://localhost:3000
- **API**: http://localhost:4000/health

## 📦 Available Scripts

```bash
# Development
pnpm dev:web          # Start Next.js dev server
pnpm dev:api          # Start Express API dev server

# Building
pnpm build            # Build all packages

# Code Quality
pnpm lint             # Run ESLint on all packages
pnpm type-check       # Run TypeScript type checking
pnpm format           # Format code with Prettier
```

## 🗄️ Database Schema

The project includes the following tables:

- **users** - User accounts
- **teams** - Team organizations
- **projects** - Product projects
- **activity_logs** - Activity tracking
- **embeddings** - Vector embeddings (using pgvector)
- **ai_summaries** - AI-generated summaries
- **oauth_tokens** - OAuth authentication tokens

## 🐳 Docker Services

### Postgres (with pgvector)
- **Port**: 5432
- **Database**: product_maintainer
- **User**: postgres
- **Password**: postgres

### Redis
- **Port**: 6379

### Useful Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart a service
docker-compose restart postgres

# Access Postgres CLI
docker exec -it product-maintainer-postgres psql -U postgres -d product_maintainer

# Access Redis CLI
docker exec -it product-maintainer-redis redis-cli
```

## 🔧 Troubleshooting

### Port Already in Use

If you get a port conflict error:

```bash
# Check what's using the port
lsof -i :3000  # or :4000, :5432, :6379

# Kill the process or change the port in .env files
```

### Database Connection Issues

```bash
# Ensure Postgres is running
docker-compose ps

# Check Postgres logs
docker-compose logs postgres

# Restart Postgres
docker-compose restart postgres
```

### pnpm Installation Issues

```bash
# Clear pnpm cache
pnpm store prune

# Remove node_modules and reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
```

## 🏗️ Tech Stack

### Web App
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React 18** - UI library

### API
- **Express** - Web framework
- **TypeScript** - Type safety
- **PostgreSQL** - Database
- **pgvector** - Vector similarity search
- **Redis** - Caching

### DevOps
- **Docker** - Containerization
- **pnpm** - Package management
- **GitHub Actions** - CI/CD
- **ESLint** - Linting
- **Prettier** - Code formatting

## 📝 License

MIT