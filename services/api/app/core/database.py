from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# Async engine
engine: AsyncEngine = create_async_engine(settings.DATABASE_URL_ASYNC, echo=True, future=True)

# Async session maker
AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

# Base class for models
Base = declarative_base()
