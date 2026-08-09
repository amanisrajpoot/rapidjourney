from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.orm import joinedload
from typing import List
import uuid
from datetime import datetime, timedelta, timezone

from app.core.database import AsyncSessionLocal
from app.models.journey import Journey
from app.schemas.journey import JourneyCreate, JourneyResponse, JourneyUpdate
from app.worker import calculate_route_task
from app.services.notifications import NotificationService
from app.services.pubsub import PubSubService

router = APIRouter()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# Note: In a real app we'd decode the JWT to get user_id. 
# For this sprint, we'll accept host_id in headers or default to a fake UUID for testing, 
# or assume the frontend sends a valid token and we decode it.
# Let's add a basic dependency for it.
from fastapi.security import OAuth2PasswordBearer
from app.core.security import verify_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/token")

async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> uuid.UUID:
    try:
        payload = verify_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return uuid.UUID(user_id)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

@router.post("", response_model=JourneyResponse)
async def create_journey(
    journey_in: JourneyCreate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    # Construct PostGIS point geometry
    origin_geom = f"SRID=4326;POINT({journey_in.origin.lon} {journey_in.origin.lat})"
    dest_geom = f"SRID=4326;POINT({journey_in.destination.lon} {journey_in.destination.lat})"
    
    new_journey = Journey(
        host_id=user_id,
        origin_geom=origin_geom,
        origin_address=journey_in.origin_address,
        dest_geom=dest_geom,
        dest_address=journey_in.destination_address,
        vehicle_type=journey_in.vehicle_type,
        journey_type=journey_in.journey_type,
        price=journey_in.price,
        max_participants=journey_in.max_participants,
        scheduled_at=journey_in.scheduled_at,
        available_seats=journey_in.available_seats,
        status="pending"
    )
    
    db.add(new_journey)
    await db.commit()
    
    # Fetch with host to satisfy JourneyResponse
    result = await db.execute(select(Journey).options(joinedload(Journey.host)).where(Journey.id == new_journey.id))
    new_journey_with_host = result.scalar_one()
    
    # Dispatch celery task to calculate route
    calculate_route_task.delay(str(new_journey.id))
    
    return new_journey_with_host

@router.get("", response_model=List[JourneyResponse])
async def list_journeys(
    db: AsyncSession = Depends(get_db),
    limit: int = 100,
):
    result = await db.execute(select(Journey).options(joinedload(Journey.host)).limit(limit))
    return result.scalars().all()

@router.get("/search", response_model=List[JourneyResponse])
async def search_journeys(
    lat: float,
    lon: float,
    radius_km: float = 10.0,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    radius_meters = radius_km * 1000
    
    # Calculate cutoff time: rides expire 30 minutes after their scheduled start time
    cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=30)
    
    # Use PostGIS ST_DWithin to find journeys near the user's location
    # Note: ST_MakePoint takes (lon, lat)
    query = (
        select(Journey)
        .where(Journey.status == "pending")
        .where(Journey.scheduled_at >= cutoff_time)
        .where(
            text(f"ST_DWithin(origin_geom, ST_SetSRID(ST_MakePoint({lon}, {lat}), 4326)::geography, {radius_meters})")
        )
        .options(joinedload(Journey.host))
        .limit(limit)
    )
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/me/hosted", response_model=List[JourneyResponse])
async def get_hosted_journeys(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    query = select(Journey).options(joinedload(Journey.host)).where(Journey.host_id == user_id).order_by(Journey.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

from app.models.request import RideRequest
@router.get("/me/requested", response_model=List[JourneyResponse])
async def get_requested_journeys(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    query = select(Journey).options(joinedload(Journey.host)).join(RideRequest, Journey.id == RideRequest.journey_id).where(RideRequest.passenger_id == user_id).order_by(Journey.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

from app.schemas.request import RideRequestResponse
@router.get("/me/requests", response_model=List[RideRequestResponse])
async def get_my_requests(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    """Return all ride requests made by the current user with journey and status."""
    query = (
        select(RideRequest)
        .options(
            joinedload(RideRequest.journey).joinedload(Journey.host),
            joinedload(RideRequest.passenger)
        )
        .where(RideRequest.passenger_id == user_id)
        .order_by(RideRequest.created_at.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{journey_id}", response_model=JourneyResponse)
async def get_journey(journey_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Journey).options(joinedload(Journey.host)).where(Journey.id == journey_id))
    journey = result.scalar_one_or_none()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    return journey

@router.patch("/{journey_id}/status", response_model=JourneyResponse)
async def update_journey_status(
    journey_id: uuid.UUID,
    update_in: JourneyUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    result = await db.execute(select(Journey).options(joinedload(Journey.host)).where(Journey.id == journey_id))
    journey = result.scalar_one_or_none()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
        
    if journey.host_id != user_id:
        raise HTTPException(status_code=403, detail="Only the host can update the journey status")
        
    valid_statuses = ["pending", "accepted", "in_progress", "completed", "cancelled"]
    if update_in.status and update_in.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    if update_in.status:
        journey.status = update_in.status
        
        # Notify via PubSub for active listeners
        await PubSubService.publish_journey_event(
            str(journey.id), 
            "status_update", 
            {"status": journey.status}
        )
        
        # If in progress, send push notification
        if journey.status == "in_progress":
            # For this sprint, we'd find all accepted passengers and send notifications
            # We'll stub it here with the host just for demonstration
            await NotificationService.send_push_notification(
                str(journey.host_id),
                "Journey Started!",
                "Your journey is now in progress. Drive safe!"
            )
            
    await db.commit()
    
    # Reload with relations
    result = await db.execute(select(Journey).options(joinedload(Journey.host)).where(Journey.id == journey.id))
    journey_with_host = result.scalar_one()
    
    return journey_with_host


from app.models.rating import Rating
from app.models.user import User
from app.schemas.rating import RatingCreate, RatingResponse
from sqlalchemy import func

@router.post("/{journey_id}/rate", response_model=RatingResponse)
async def rate_journey(
    journey_id: uuid.UUID,
    rating_in: RatingCreate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    # Verify journey
    result = await db.execute(select(Journey).where(Journey.id == journey_id))
    journey = result.scalar_one_or_none()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    
    if journey.status != "completed":
        raise HTTPException(status_code=400, detail="Can only rate completed journeys")
        
    # Determine to_user_id
    to_user_id = rating_in.to_user_id
    if not to_user_id:
        if journey.host_id == user_id:
            raise HTTPException(status_code=400, detail="Host must specify to_user_id to rate a passenger")
        to_user_id = journey.host_id
    
    # Optional: verify that the user was actually part of this journey
    # For now, we trust they were (either host, or they have an accepted RideRequest)
    
    # Check if rating already exists
    existing_result = await db.execute(
        select(Rating).where(
            Rating.journey_id == journey_id,
            Rating.from_user_id == user_id
        )
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You have already rated this journey")
        
    # Create rating
    new_rating = Rating(
        journey_id=journey_id,
        from_user_id=user_id,
        to_user_id=to_user_id,
        stars=rating_in.stars,
        comment=rating_in.comment
    )
    db.add(new_rating)
    await db.commit()
    
    # Update user's average rating
    avg_result = await db.execute(
        select(func.avg(Rating.stars)).where(Rating.to_user_id == to_user_id)
    )
    new_avg = avg_result.scalar() or 0.0
    
    await db.execute(
        update(User).where(User.id == to_user_id).values(rating_avg=float(new_avg))
    )
    await db.commit()
    
    await db.refresh(new_rating)
    return new_rating

from app.models.message import Message
from app.schemas.message import MessageCreate, MessageResponse

@router.get("/{journey_id}/messages", response_model=List[MessageResponse])
async def get_journey_messages(
    journey_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    query = (
        select(Message)
        .options(joinedload(Message.sender))
        .where(Message.journey_id == journey_id)
        .order_by(Message.created_at.asc())
    )
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/{journey_id}/messages", response_model=MessageResponse)
async def create_journey_message(
    journey_id: uuid.UUID,
    message_in: MessageCreate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    # Verify journey exists
    result = await db.execute(select(Journey).where(Journey.id == journey_id))
    journey = result.scalar_one_or_none()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
        
    # Create the message
    new_message = Message(
        journey_id=journey_id,
        sender_id=user_id,
        content=message_in.content
    )
    db.add(new_message)
    await db.commit()
    
    # Reload with sender relation
    result = await db.execute(select(Message).options(joinedload(Message.sender)).where(Message.id == new_message.id))
    loaded_message = result.scalar_one()
    
    # Broadcast via Redis Pub/Sub
    await PubSubService.publish_journey_event(
        str(journey_id),
        "chat_message",
        {
            "id": str(loaded_message.id),
            "journey_id": str(loaded_message.journey_id),
            "sender_id": str(loaded_message.sender_id),
            "content": loaded_message.content,
            "created_at": loaded_message.created_at.isoformat(),
            "sender": {
                "name": loaded_message.sender.name,
                "photo_url": loaded_message.sender.photo_url
            } if loaded_message.sender else None
        }
    )
    
    return loaded_message
