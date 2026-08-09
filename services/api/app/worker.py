import asyncio
from celery import Celery
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.journey import Journey
from app.services.routing import calculate_route
from sqlalchemy import select
from geoalchemy2.shape import to_shape

# Initialize Celery
celery_app = Celery(
    "journey_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

celery_app.conf.task_routes = {
    "app.worker.*": {"queue": "default"}
}

def sync_calculate_route(journey_id: str):
    """
    Synchronous wrapper for the async task.
    Celery runs synchronous tasks by default, so we use asyncio.run to execute the async route calculation.
    """
    asyncio.run(async_calculate_route(journey_id))

async def async_calculate_route(journey_id: str):
    async with AsyncSessionLocal() as db:
        # Fetch the journey
        result = await db.execute(select(Journey).where(Journey.id == journey_id))
        journey = result.scalar_one_or_none()
        
        if not journey:
            return
            
        # Get coordinates from geometry
        origin_shape = to_shape(journey.origin_geom)
        dest_shape = to_shape(journey.dest_geom)
        
        try:
            route_data = await calculate_route(
                start_lon=origin_shape.x, 
                start_lat=origin_shape.y, 
                end_lon=dest_shape.x, 
                end_lat=dest_shape.y
            )
            
            # Update journey with route details
            journey.distance_meters = route_data["distance"]
            journey.duration_seconds = route_data["duration"]
            journey.route_geom = route_data["geometry"]
            
            await db.commit()
        except Exception as e:
            print(f"Failed to calculate route for journey {journey_id}: {e}")

@celery_app.task
def calculate_route_task(journey_id: str):
    sync_calculate_route(journey_id)


def sync_expire_old_journeys():
    asyncio.run(async_expire_old_journeys())

async def async_expire_old_journeys():
    from datetime import datetime, timezone, timedelta
    from sqlalchemy import update
    async with AsyncSessionLocal() as db:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=30)
        await db.execute(
            update(Journey)
            .where(Journey.status == "pending")
            .where(Journey.scheduled_at < cutoff)
            .values(status="cancelled")
        )
        await db.commit()
        print(f"[Expiry Task] Auto-cancelled stale pending journeys before {cutoff}")

@celery_app.task
def expire_old_journeys_task():
    """Periodic task: cancel pending journeys that are >30 mins past scheduled time."""
    sync_expire_old_journeys()

# Schedule expiry to run every 5 minutes
celery_app.conf.beat_schedule = {
    "expire-old-journeys": {
        "task": "app.worker.expire_old_journeys_task",
        "schedule": 300.0,  # every 5 minutes
    }
}
celery_app.conf.timezone = "UTC"
