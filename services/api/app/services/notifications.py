class NotificationService:
    @staticmethod
    async def send_push_notification(user_id: str, title: str, body: str, data: dict = None):
        """
        Stub for Firebase Cloud Messaging (FCM).
        In production, this would use firebase-admin SDK to send notifications
        to the tokens associated with the user_id.
        """
        print(f"[PUSH NOTIFICATION STUB] To User: {user_id}")
        print(f"  Title: {title}")
        print(f"  Body: {body}")
        if data:
            print(f"  Data: {data}")
        # Return success for now
        return True
