from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from typing import List
import uuid

from app.core.database import AsyncSessionLocal
from app.models.journey import Journey
from app.models.request import RideRequest
from app.models.payment import Payment
from app.schemas.request import RideRequestCreate, RideRequestResponse, RideRequestUpdate
from app.api.v1.journeys import get_current_user_id
from app.api.v1.payments import get_razorpay_client

router = APIRouter()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

@router.get("/{journey_id}/requests", response_model=List[RideRequestResponse])
async def get_journey_requests(
    journey_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    # Verify journey exists and user is host
    result = await db.execute(select(Journey).where(Journey.id == journey_id))
    journey = result.scalar_one_or_none()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
        
    if journey.host_id != user_id:
        raise HTTPException(status_code=403, detail="Only the host can view requests")
        
    query = select(RideRequest).options(joinedload(RideRequest.passenger), joinedload(RideRequest.journey).joinedload(Journey.host)).where(RideRequest.journey_id == journey_id).order_by(RideRequest.created_at.desc())
    req_result = await db.execute(query)
    return req_result.scalars().all()

@router.post("/{journey_id}/requests", response_model=RideRequestResponse)
async def create_ride_request(
    journey_id: uuid.UUID,
    request_in: RideRequestCreate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    # Verify journey exists
    result = await db.execute(select(Journey).where(Journey.id == journey_id))
    journey = result.scalar_one_or_none()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
        
    if journey.host_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot request to join your own journey")
        
    # Check if already requested
    existing = await db.execute(select(RideRequest).options(joinedload(RideRequest.passenger), joinedload(RideRequest.journey).joinedload(Journey.host)).where(
        RideRequest.journey_id == journey_id,
        RideRequest.passenger_id == user_id
    ))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already requested to join this journey")
        
    new_request = RideRequest(
        journey_id=journey_id,
        passenger_id=user_id,
        seats_requested=request_in.seats_requested,
        status="pending"
    )
    
    db.add(new_request)
    await db.commit()
    
    # Fetch with relations to satisfy RideRequestResponse
    result = await db.execute(select(RideRequest).options(joinedload(RideRequest.passenger), joinedload(RideRequest.journey).joinedload(Journey.host)).where(RideRequest.id == new_request.id))
    new_request_with_rels = result.scalar_one()
    
    # Notify driver via WebSocket in real-time
    from app.services.pubsub import PubSubService
    from app.schemas.request import RideRequestResponse
    passenger = new_request_with_rels.passenger
    await PubSubService.publish_journey_event(
        str(journey_id),
        "new_request",
        {
            "request_id": str(new_request.id),
            "passenger_name": passenger.name or "Someone",
            "passenger_photo": passenger.photo_url,
            "seats_requested": new_request.seats_requested,
        }
    )
    
    return new_request_with_rels

@router.patch("/{journey_id}/requests/{request_id}", response_model=RideRequestResponse)
async def update_ride_request(
    journey_id: uuid.UUID,
    request_id: uuid.UUID,
    update_in: RideRequestUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    # Verify journey exists and user is host
    result = await db.execute(select(Journey).where(Journey.id == journey_id))
    journey = result.scalar_one_or_none()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
        
    if journey.host_id != user_id:
        raise HTTPException(status_code=403, detail="Only the host can accept or reject requests")
        
    req_result = await db.execute(select(RideRequest).options(joinedload(RideRequest.passenger), joinedload(RideRequest.journey).joinedload(Journey.host)).where(RideRequest.id == request_id))
    ride_req = req_result.scalar_one_or_none()
    if not ride_req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if update_in.status not in ["accepted", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    if update_in.status == "accepted":
        if journey.available_seats is not None and journey.available_seats < ride_req.seats_requested:
            raise HTTPException(status_code=400, detail="Not enough seats available")
        # Decrease seats
        if journey.available_seats is not None:
            journey.available_seats -= ride_req.seats_requested
            
    if update_in.status == "rejected":
        # Find payment and trigger refund
        payment_result = await db.execute(select(Payment).where(
            Payment.journey_id == journey_id,
            Payment.user_id == ride_req.passenger_id,
            Payment.status == "captured"
        ))
        payment = payment_result.scalar_one_or_none()
        if payment:
            try:
                client = get_razorpay_client()
                if payment.razorpay_payment_id:
                    client.payment.refund(payment.razorpay_payment_id, {
                        "amount": int(payment.amount * 100),
                        "speed": "optimum"
                    })
                    payment.status = "refunded"
            except Exception as e:
                # Log error in real app, but proceed to mark rejected
                print(f"Refund failed: {e}")
                
    ride_req.status = update_in.status
    
    await db.commit()
    
    # Fetch with relations
    result = await db.execute(select(RideRequest).options(joinedload(RideRequest.passenger), joinedload(RideRequest.journey).joinedload(Journey.host)).where(RideRequest.id == ride_req.id))
    ride_req_with_rels = result.scalar_one()
    
    # Notify passenger in real-time
    from app.services.pubsub import PubSubService
    await PubSubService.publish_journey_event(
        str(journey_id),
        "request_updated",
        {
            "request_id": str(ride_req.id),
            "passenger_id": str(ride_req.passenger_id),
            "new_status": ride_req.status,
        }
    )
    
    return ride_req_with_rels


@router.delete("/{journey_id}/requests/{request_id}", status_code=204)
async def cancel_ride_request(
    journey_id: uuid.UUID,
    request_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    """Allow a passenger to cancel their own pending request."""
    req_result = await db.execute(
        select(RideRequest).where(
            RideRequest.id == request_id,
            RideRequest.passenger_id == user_id,
            RideRequest.journey_id == journey_id,
        )
    )
    ride_req = req_result.scalar_one_or_none()
    if not ride_req:
        raise HTTPException(status_code=404, detail="Request not found")
    if ride_req.status != "pending":
        raise HTTPException(status_code=400, detail="Can only cancel pending requests")
    
    # Restore seats if needed
    journey_result = await db.execute(select(Journey).where(Journey.id == journey_id))
    journey = journey_result.scalar_one_or_none()
    if journey and journey.available_seats is not None:
        journey.available_seats += ride_req.seats_requested
    # Trigger refund since it was pending
    payment_result = await db.execute(select(Payment).where(
        Payment.journey_id == journey_id,
        Payment.user_id == user_id,
        Payment.status == "captured"
    ))
    payment = payment_result.scalar_one_or_none()
    if payment:
        try:
            client = get_razorpay_client()
            if payment.razorpay_payment_id:
                client.payment.refund(payment.razorpay_payment_id, {
                    "amount": int(payment.amount * 100),
                    "speed": "optimum"
                })
                payment.status = "refunded"
        except Exception as e:
            print(f"Refund failed: {e}")
    
    ride_req.status = "cancelled"
    await db.commit()
    return None
