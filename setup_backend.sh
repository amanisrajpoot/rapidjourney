#!/usr/bin/env bash
set -euo pipefail

# -------------------------------------------------
# Backend setup script for Journey platform
# -------------------------------------------------
# This script assumes the host machine has:
#   - Docker + Docker Compose
#   - Python 3.13 (or >=3.10) with pip
#   - git (optional, for pulling the repo)
# It will:
#   1) Create a Python virtual environment
#   2) Install all backend dependencies
#   3) Bring up PostgreSQL (with PostGIS) and Redis via Docker Compose
#   4) Wait until the DB containers are healthy
#   5) Run Alembic migrations
#   6) Launch the FastAPI app with Uvicorn
# -------------------------------------------------

# ---- 1. Determine project root ----
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$PROJECT_ROOT"

# ---- 2. Verify required binaries ----
for cmd in docker docker-compose python3 pip3; do
  if ! command -v $cmd >/dev/null 2>&1; then
    echo "Error: required command '$cmd' not found in PATH. Install it first."
    exit 1
  fi
done

# ---- 3. Create (or reuse) a virtual environment ----
VENV_DIR=".venv"
if [ ! -d "$VENV_DIR" ]; then
  echo "Creating virtual environment ..."
  python3 -m venv "$VENV_DIR"
fi
source "$VENV_DIR/bin/activate"

# ---- 4. Ensure pip is available and upgrade ----
echo "Ensuring pip is installed ..."
python3 -m ensurepip --upgrade
echo "Upgrading pip ..."
python3 -m pip install --upgrade pip

# Install backend deps – uses the pyproject.toml for version pins
echo "Installing backend dependencies ..."
python3 -m pip install "fastapi[standard]" uvicorn "sqlalchemy[asyncio]" asyncpg psycopg2-binary geoalchemy2 alembic pydantic-settings "python-jose[cryptography]" "passlib[bcrypt]" "redis[hiredis]" authlib httpx celery

# ---- 5. Start Docker services ----
echo "Starting PostgreSQL + PostGIS and Redis via Docker Compose ..."
# Use the compose file located at the project root
docker compose up -d

# ---- 6. Wait for containers to become healthy ----
echo "Waiting for PostgreSQL to be ready ..."
# Simple loop checking pg_isready inside the container
until docker exec journey-postgres pg_isready -U journey >/dev/null 2>&1; do
  echo "  postgres not ready yet, sleeping 2s..."
  sleep 2
done

echo "PostgreSQL is ready."

echo "Waiting for Redis to be ready ..."
# Check redis ping
until docker exec journey-redis redis-cli ping | grep PONG >/dev/null 2>&1; do
  echo "  redis not ready yet, sleeping 2s..."
  sleep 2
done

echo "Redis is ready."

# ---- 7. Run Alembic migrations ----
# Ensure we are in the backend directory where alembic.ini lives
cd services/api
echo "Running Alembic migrations ..."
alembic -c alembic.ini upgrade head

# ---- 8. Launch FastAPI server ----
# Return to project root (the script will keep running the server)
cd "$PROJECT_ROOT"

# Export env file so settings load automatically
export $(grep -v '^#' .env | xargs)

echo "Starting FastAPI server (uvicorn) ..."
uvicorn services.api.app.main:app --host 0.0.0.0 --port 8000
