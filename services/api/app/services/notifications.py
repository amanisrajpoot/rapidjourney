import firebase_admin
from firebase_admin import credentials, messaging
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.user import User
from sqlalchemy.future import select

# Initialize Firebase app only once
if settings.FIREBASE_CREDENTIALS_PATH and not firebase_admin._apps:
    try:
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        firebase_admin.initialize_app(cred)
        print("Firebase Admin initialized successfully.")
    except Exception as e:
        print(f"Failed to initialize Firebase Admin: {e}")

class NotificationService:
    @staticmethod
    async def send_push_notification(user_id: str, title: str, body: str, data: dict = None):
        """
        Sends a push notification to the user's registered FCM token.
        Falls back to stubbing if Firebase is not configured.
        """
        if not settings.FIREBASE_CREDENTIALS_PATH or not firebase_admin._apps:
            print(f"[PUSH NOTIFICATION STUB] To User: {user_id}")
            print(f"  Title: {title}")
            print(f"  Body: {body}")
            if data:
                print(f"  Data: {data}")
            return True

        # Real Firebase logic
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(select(User).where(User.id == user_id))
                user = result.scalar_one_or_none()
                
                if not user or not user.fcm_token:
                    print(f"Cannot send push notification: User {user_id} has no FCM token.")
                    return False
                    
                message = messaging.Message(
                    notification=messaging.Notification(
                        title=title,
                        body=body,
                    ),
                    data=data or {},
                    token=user.fcm_token,
                )
                
                # Send to FCM
                response = messaging.send(message)
                print(f"Successfully sent message to {user_id}: {response}")
                return True
                
        except Exception as e:
            print(f"Error sending push notification to {user_id}: {e}")
            return False
