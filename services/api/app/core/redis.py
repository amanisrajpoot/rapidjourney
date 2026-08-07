import redis.asyncio as redis

from .config import settings

class RedisClient:
    _client: redis.Redis | None = None

    @classmethod
    async def get_client(cls) -> redis.Redis:
        if cls._client is None:
            cls._client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        return cls._client
