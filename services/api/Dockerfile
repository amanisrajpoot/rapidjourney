FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN pip install uv

COPY pyproject.toml .

RUN uv pip install --system fastapi uvicorn "sqlalchemy[asyncio]" asyncpg geoalchemy2 alembic pydantic-settings "python-jose[cryptography]" "passlib[bcrypt]" "redis[hiredis]" authlib httpx celery psycopg2-binary

COPY . .
