from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
import uuid
import razorpay
import hmac
import hashlib

from app.core.database import AsyncSessionLocal
from app.core.config import settings
from app.models.journey import Journey
from app.models.payment import Payment
from app.models.request import RideRequest
from app.schemas.payment import PaymentCreate, PaymentVerify, PaymentResponse
from app.schemas.request import RideRequestResponse, RideRequestCreate
from app.api.v1.journeys import get_current_user_id
from app.services.pubsub import PubSubService

router = APIRouter()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

def get_razorpay_client():
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=500, detail="Razorpay is not configured")
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

@router.post("/create-order")
async def create_order(
    payment_in: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    # Verify journey exists
    result = await db.execute(select(Journey).where(Journey.id == payment_in.journey_id))
    journey = result.scalar_one_or_none()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
        
    if journey.host_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot request to join your own journey")
        
    # Check if request already exists
    existing_req = await db.execute(select(RideRequest).where(
        RideRequest.journey_id == payment_in.journey_id,
        RideRequest.passenger_id == user_id
    ))
    if existing_req.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You have already requested to join this journey")
        
    # Calculate amount in paise (multiply by 100)
    amount_in_paise = int(payment_in.amount * 100)
    
    # Create Razorpay Order
    client = get_razorpay_client()
    try:
        order_data = {
            "amount": amount_in_paise,
            "currency": "INR",
            "receipt": f"journey_{payment_in.journey_id}_{user_id}",
            "notes": {
                "journey_id": str(payment_in.journey_id),
                "user_id": str(user_id)
            }
        }
        order = client.order.create(data=order_data)
        
        return {
            "order_id": order["id"],
            "amount": payment_in.amount,
            "currency": "INR"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify", response_model=RideRequestResponse)
async def verify_payment_and_create_request(
    payment_verify: PaymentVerify,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    client = get_razorpay_client()
    
    # Verify signature
    try:
        client.utility.verify_payment_signature({
            'razorpay_order_id': payment_verify.razorpay_order_id,
            'razorpay_payment_id': payment_verify.razorpay_payment_id,
            'razorpay_signature': payment_verify.razorpay_signature
        })
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid payment signature")
        
    # Fetch the order from Razorpay to get the journey_id and amount
    try:
        order = client.order.fetch(payment_verify.razorpay_order_id)
        journey_id_str = order.get("notes", {}).get("journey_id")
        amount = float(order.get("amount", 0)) / 100.0
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch order details")
        
    if not journey_id_str:
        raise HTTPException(status_code=400, detail="Order is missing journey_id metadata")
        
    journey_id = uuid.UUID(journey_id_str)
    
    # Check if payment already exists
    existing_payment = await db.execute(select(Payment).where(Payment.razorpay_order_id == payment_verify.razorpay_order_id))
    if existing_payment.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Payment already processed")
        
    # Create Payment Record
    new_payment = Payment(
        journey_id=journey_id,
        user_id=user_id,
        razorpay_order_id=payment_verify.razorpay_order_id,
        razorpay_payment_id=payment_verify.razorpay_payment_id,
        razorpay_signature=payment_verify.razorpay_signature,
        amount=amount,
        status="captured" # We capture it immediately via auto-capture setting or verify
    )
    db.add(new_payment)
    
    # Create Ride Request
    new_request = RideRequest(
        journey_id=journey_id,
        passenger_id=user_id,
        status="pending",
        seats_requested=1
    )
    db.add(new_request)
    
    await db.commit()
    await db.refresh(new_request)
    
    # Load relationships for response
    result = await db.execute(select(RideRequest).options(joinedload(RideRequest.passenger), joinedload(RideRequest.journey).joinedload(Journey.host)).where(RideRequest.id == new_request.id))
    loaded_req = result.scalar_one()
    
    # Notify host
    await PubSubService.publish_journey_event(
        str(journey_id),
        "new_request",
        {"request_id": str(loaded_req.id)}
    )
    
    return loaded_req

@router.post("/cod", response_model=RideRequestResponse)
async def create_cod_request(
    payment_in: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    # Verify journey exists
    result = await db.execute(select(Journey).where(Journey.id == payment_in.journey_id))
    journey = result.scalar_one_or_none()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
        
    if journey.host_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot request to join your own journey")
        
    # Check if request already exists
    existing_req = await db.execute(select(RideRequest).where(
        RideRequest.journey_id == payment_in.journey_id,
        RideRequest.passenger_id == user_id
    ))
    if existing_req.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You have already requested to join this journey")
        
    # Create Payment Record
    new_payment = Payment(
        journey_id=payment_in.journey_id,
        user_id=user_id,
        razorpay_order_id=f"cod_{uuid.uuid4().hex[:10]}",
        razorpay_payment_id="COD",
        amount=payment_in.amount,
        status="cod_pending"
    )
    db.add(new_payment)
    await db.flush()
    
    # Create Ride Request
    new_request = RideRequest(
        journey_id=payment_in.journey_id,
        passenger_id=user_id,
        seats_requested=1,
        status="pending"
    )
    db.add(new_request)
    await db.commit()
    
    # Fetch with relations
    result = await db.execute(select(RideRequest).options(joinedload(RideRequest.passenger), joinedload(RideRequest.journey).joinedload(Journey.host)).where(RideRequest.id == new_request.id))
    new_request_with_rels = result.scalar_one()
    
    # Notify driver via WebSocket in real-time
    passenger = new_request_with_rels.passenger
    await PubSubService.publish_journey_event(
        str(payment_in.journey_id),
        "new_request",
        {
            "request_id": str(new_request.id),
            "passenger_name": passenger.name or "Someone",
            "passenger_photo": passenger.photo_url,
            "seats_requested": new_request.seats_requested,
        }
    )
    
    return new_request_with_rels
