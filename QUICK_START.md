# Quick Start Guide

## 🚀 Start the Project

```bash
sudo docker-compose up -d
```

This starts all services (MongoDB, Backend, Frontend) in the background.

Wait a few seconds, then access:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000

## 🛑 Stop the Project

```bash
sudo docker-compose down
```

This stops and removes all containers (but keeps your MongoDB data).

## 📊 Check Status

```bash
sudo docker-compose ps
```

## 📝 View Logs

```bash
# All services
sudo docker-compose logs -f

# Specific service
sudo docker-compose logs -f backend
sudo docker-compose logs -f frontend
```

## 🔄 Restart Services

```bash
sudo docker-compose restart
```

## ⚠️ Complete Cleanup (removes all data)

```bash
sudo docker-compose down -v
```

This removes containers AND volumes (MongoDB data will be lost).

---

For more detailed commands, see `DOCKER_COMMANDS.md`
