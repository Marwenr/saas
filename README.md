# SaaS Starter Monorepo

A clean, flexible SaaS starter monorepo built with JavaScript, using pnpm workspaces.

## Project Structure

```
saas/
├── frontend/          # Next.js application (App Router)
│   ├── app/          # Next.js App Router pages and layouts
│   ├── package.json
│   └── .env.example
├── backend/          # Fastify server with MongoDB
│   ├── src/          # Backend source code
│   │   └── index.js  # Server entry point
│   ├── package.json
│   └── .env.example
├── shared/           # Shared utilities and constants
│   ├── index.js      # Shared exports
│   └── package.json
├── docker/           # Docker configuration
│   ├── Dockerfile.frontend
│   ├── Dockerfile.backend
│   └── docker-compose.yml
├── .husky/           # Git hooks
│   └── pre-commit    # Pre-commit hook configuration
├── package.json      # Root package.json with workspace config
├── pnpm-workspace.yaml
├── .eslintrc.cjs     # ESLint configuration
├── .prettierrc       # Prettier configuration
├── .editorconfig     # Editor configuration
└── README.md
```

## Tech Stack

- **Monorepo**: pnpm workspaces
- **Frontend**: Next.js 14 (App Router), React 18
- **Backend**: Fastify, Node.js, MongoDB, Mongoose
- **Language**: JavaScript (ES Modules)
- **Linting**: ESLint with Next.js and Node.js configs
- **Formatting**: Prettier
- **Git Hooks**: Husky + lint-staged
- **Containerization**: Docker + Docker Compose

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker (optional, for containerized development)
- MongoDB (or use Docker Compose)

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Setup

Copy environment example files and configure:

```bash
# Root
cp .env.example .env

# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env.local
```

Edit the `.env` files with your configuration values.

### 3. Development

Start all services in development mode:

```bash
pnpm dev
```

Or start services individually:

```bash
# Frontend only (port 3000)
cd frontend && pnpm dev

# Backend only (port 4000)
cd backend && pnpm dev
```

### 4. Linting and Formatting

```bash
# Lint all workspaces
pnpm lint

# Format all files
pnpm format

# Check formatting without changing files
pnpm format:check
```

## Docker Development

### Prerequisites

Make sure Docker is installed and accessible:

```bash
# Check if Docker is installed
docker --version

# Check if Docker is running
docker ps
```

#### Docker Permissions

**If Docker is installed via Snap** (common on Ubuntu/Debian):

- Snap-installed Docker typically requires `sudo` for commands
- Use `sudo` with docker/docker-compose commands:
  ```bash
  sudo docker ps
  sudo docker-compose up -d
  ```

**If Docker is installed via apt/yum** (traditional installation):

- You can add your user to the docker group:
  ```bash
  sudo usermod -aG docker $USER
  newgrp docker  # Or log out and log back in
  ```
- This allows running docker commands without `sudo`

### Using Docker Compose

Start all services (MongoDB, backend, frontend):

```bash
cd docker
# Use sudo if Docker is installed via snap:
sudo docker-compose up -d
# Or if you're in the docker group:
docker-compose up -d
```

Stop services:

```bash
# Use sudo if needed:
sudo docker-compose down
# Or:
docker-compose down
```

### Build Individual Services

```bash
# Build backend
docker build -f docker/Dockerfile.backend -t saas-backend .

# Build frontend
docker build -f docker/Dockerfile.frontend -t saas-frontend .
```

## Project Workspaces

### `@saas/shared`

Shared utilities and constants used across frontend and backend.

```javascript
import { log, DEFAULT_PORT, API_VERSION } from '@saas/shared';
```

### `@saas/frontend`

Next.js application using App Router.

- Development: `http://localhost:3000`
- API endpoint: Configured via `NEXT_PUBLIC_API_URL`

### `@saas/backend`

Fastify server with MongoDB connection.

- Development: `http://localhost:4000`
- Health check: `GET /health`
- API: `GET /api/v1`

## Git Hooks

Husky is configured to run linting and formatting on pre-commit:

- ESLint auto-fix for `.js` and `.jsx` files
- Prettier formatting for all staged files

The hooks run automatically when you commit changes.

## Configuration Files

- **`.eslintrc.cjs`**: ESLint configuration with rules for Node.js, browser, and Next.js
- **`.prettierrc`**: Prettier formatting rules
- **`.editorconfig`**: Editor configuration for consistent coding styles
- **`.lintstagedrc.cjs`**: Lint-staged configuration for pre-commit hooks

## Future Considerations

This structure is designed to be scalable and can be migrated to TypeScript in the future without major restructuring:

- All configuration files support TypeScript
- Folder structure accommodates `.ts` and `.tsx` files
- Workspace setup is compatible with TypeScript tooling

## Scripts Reference

### Root Scripts

- `pnpm dev` - Start all workspaces in development mode
- `pnpm lint` - Lint all workspaces
- `pnpm format` - Format all files with Prettier
- `pnpm format:check` - Check formatting without changing files

### Backend Scripts

- `pnpm dev` - Start backend in watch mode
- `pnpm start` - Start backend in production mode
- `pnpm lint` - Lint backend code

### Frontend Scripts

- `pnpm dev` - Start Next.js dev server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Lint Next.js code

## License

MIT
