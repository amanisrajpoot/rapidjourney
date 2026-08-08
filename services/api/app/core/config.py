import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Core
    DATABASE_URL_ASYNC: str = "postgresql+asyncpg://journey:journey_dev@localhost:5432/journey"
    SQLALCHEMY_DATABASE_URL: str = "postgresql+psycopg2://journey:journey_dev@localhost:5432/journey"
    REDIS_URL: str = "redis://localhost:6379/0"
    OPEN_ROUTE_SERVICE_API_KEY: str = ""

    # JWT Settings
    JWT_SECRET: str = "supersecretkeychange_me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    # OTP
    OTP_EXPIRE_SECONDS: int = 300
    FAST2SMS_API_KEY: str | None = None
    # OAuth
    GOOGLE_CLIENT_ID: str = "your-google-client-id.apps.googleusercontent.com"
    GOOGLE_CLIENT_SECRET: str = "your-google-client-secret"
    # SMS Provider
    SMS_PROVIDER: str = "console"
    # Maps / Route
    OPEN_ROUTE_SERVICE_API_KEY: str | None = None
    # Misc
    CORS_ORIGINS: str = "*"

settings = Settings()
