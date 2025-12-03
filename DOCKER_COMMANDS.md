# Docker Commands Guide

## Starting the Project

### Start all services (detached mode - runs in background)

```bash
sudo docker-compose up -d
```

### Start all services (with logs visible in terminal)

```bash
sudo docker-compose up
```

Press `Ctrl+C` to stop all services when running in foreground mode.

### Start and rebuild if needed

```bash
sudo docker-compose up -d --build
```

## Stopping the Project

### Stop all services (keeps containers)

```bash
sudo docker-compose stop
```

### Stop and remove containers (keeps volumes/data)

```bash
sudo docker-compose down
```

### Stop and remove everything including volumes (⚠️ deletes MongoDB data)

```bash
sudo docker-compose down -v
```

## Checking Status

### View running services

```bash
sudo docker-compose ps
```

### View logs for all services

```bash
sudo docker-compose logs -f
```

### View logs for specific service

```bash
sudo docker-compose logs -f backend
sudo docker-compose logs -f frontend
sudo docker-compose logs -f mongodb
```

## Restarting Services

### Restart all services

```bash
sudo docker-compose restart
```

### Restart specific service

```bash
sudo docker-compose restart backend
```

### Rebuild and restart

```bash
sudo docker-compose up -d --build
```

## Quick Reference

| Command                       | Description                               |
| ----------------------------- | ----------------------------------------- |
| `sudo docker-compose up -d`   | Start all services in background          |
| `sudo docker-compose down`    | Stop and remove containers                |
| `sudo docker-compose ps`      | Show service status                       |
| `sudo docker-compose logs -f` | Follow logs from all services             |
| `sudo docker-compose restart` | Restart all services                      |
| `sudo docker-compose down -v` | Stop and remove everything including data |

## Accessing Services

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Health Check**: http://localhost:4000/health
- **MongoDB**: localhost:27017

## Troubleshooting

### View logs to debug issues

```bash
sudo docker-compose logs backend
sudo docker-compose logs frontend
```

### Restart a specific service

```bash
sudo docker-compose restart backend
```

```bash
sudo docker-compose up -d --build backend
```

### Remove all containers and start fresh

```bash
sudo docker-compose down
sudo docker-compose up -d --build
```
