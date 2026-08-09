from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from typing import List
import uuid

from app.core.database import AsyncSessionLocal
from app.models.journey import Journey
from app.models.message import Message
from app.schemas.message import MessageCreate, MessageResponse
from app.api.v1.journeys import get_current_user_id
from app.services.pubsub import PubSubService

router = APIRouter()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

@router.get("/{journey_id}/messages", response_model=List[MessageResponse])
async def get_journey_messages(
    journey_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    # Verify journey exists
    result = await db.execute(select(Journey).where(Journey.id == journey_id))
    journey = result.scalar_one_or_none()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
        
    # Anyone who is part of the journey could read messages (host or accepted passengers).
    # For simplicity, we assume if they know the journey_id and are authenticated they can read, 
    # but ideally we'd check if they are the host or an accepted passenger.
        
    query = select(Message).options(joinedload(Message.sender)).where(Message.journey_id == journey_id).order_by(Message.created_at.asc())
    msg_result = await db.execute(query)
    return msg_result.scalars().all()

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
        
    new_message = Message(
        journey_id=journey_id,
        sender_id=user_id,
        content=message_in.content
    )
    
    db.add(new_message)
    await db.commit()
    
    # Reload with sender relation
    result = await db.execute(select(Message).options(joinedload(Message.sender)).where(Message.id == new_message.id))
    message_with_sender = result.scalar_one()
    
    # Publish via WebSocket PubSub
    await PubSubService.publish_journey_event(
        str(journey_id), 
        "chat_message", 
        {
            "id": str(message_with_sender.id),
            "journey_id": str(journey_id),
            "sender_id": str(user_id),
            "content": message_in.content,
            "created_at": message_with_sender.created_at.isoformat(),
            "sender": {
                "id": str(message_with_sender.sender.id),
                "name": message_with_sender.sender.name,
                "photo_url": message_with_sender.sender.photo_url
            }
        }
    )
    
    return message_with_sender
