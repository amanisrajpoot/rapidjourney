import json
from app.core.redis import RedisClient

class PubSubService:
    @staticmethod
    async def publish_journey_event(journey_id: str, event_type: str, data: dict):
        redis = await RedisClient.get_client()
        channel = f"journey:{journey_id}"
        message = {
            "type": event_type,
            "data": data
        }
        await redis.publish(channel, json.dumps(message))

    @staticmethod
    async def subscribe_journey(journey_id: str):
        redis = await RedisClient.get_client()
        pubsub = redis.pubsub()
        channel = f"journey:{journey_id}"
        await pubsub.subscribe(channel)
        return pubsub
