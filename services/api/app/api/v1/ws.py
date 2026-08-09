from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
import asyncio
import json
from typing import Dict, List
from app.services.pubsub import PubSubService

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # Maps journey_id to list of active websockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, journey_id: str):
        await websocket.accept()
        if journey_id not in self.active_connections:
            self.active_connections[journey_id] = []
            # Start background task to listen to Redis for this journey
            asyncio.create_task(self.listen_to_redis(journey_id))
            
        self.active_connections[journey_id].append(websocket)

    def disconnect(self, websocket: WebSocket, journey_id: str):
        if journey_id in self.active_connections:
            if websocket in self.active_connections[journey_id]:
                self.active_connections[journey_id].remove(websocket)
            if len(self.active_connections[journey_id]) == 0:
                del self.active_connections[journey_id]

    async def listen_to_redis(self, journey_id: str):
        pubsub = await PubSubService.subscribe_journey(journey_id)
        try:
            async for message in pubsub.listen():
                if message['type'] == 'message':
                    data = message['data']
                    # Broadcast to all connected clients for this journey
                    connections = self.active_connections.get(journey_id, [])
                    for connection in connections:
                        try:
                            await connection.send_text(data)
                        except Exception:
                            # Handle disconnected client
                            pass
        finally:
            await pubsub.unsubscribe(f"journey:{journey_id}")
            await pubsub.close()

manager = ConnectionManager()

@router.websocket("/{journey_id}")
async def websocket_endpoint(websocket: WebSocket, journey_id: str):
    await manager.connect(websocket, journey_id)
    try:
        while True:
            data = await websocket.receive_text()
            # If client sends data, we can publish it to Redis
            try:
                parsed = json.loads(data)
                # Ensure it has a type
                event_type = parsed.get("type", "update")
                event_data = parsed.get("data") if "data" in parsed else parsed
                
                # If driver sends location update, publish it
                if event_type == "location_update":
                    await PubSubService.publish_journey_event(journey_id, "location_update", event_data)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, journey_id)
