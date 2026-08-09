import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { apiClient } from "./api";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only if config is present and we're on client
let app;
let messaging: any = null;

if (typeof window !== "undefined" && firebaseConfig.apiKey) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  } catch (err) {
    console.error("Failed to initialize Firebase:", err);
  }
}

export const requestNotificationPermission = async () => {
  try {
    if (!app || typeof window === "undefined") {
      console.log("Firebase not configured or not running in browser.");
      return null;
    }

    const supported = await isSupported();
    if (!supported) {
      console.log("Firebase messaging not supported in this browser.");
      return null;
    }

    // Initialize messaging
    messaging = getMessaging(app);

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const currentToken = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
      });
      
      if (currentToken) {
        // Send token to backend
        await apiClient.post("/users/me/push-token", { token: currentToken });
        console.log("FCM Token registered successfully.");
        return currentToken;
      } else {
        console.log('No registration token available. Request permission to generate one.');
      }
    } else {
      console.log("Notification permission not granted.");
    }
  } catch (err) {
    console.error("An error occurred while retrieving token. ", err);
  }
  return null;
};
