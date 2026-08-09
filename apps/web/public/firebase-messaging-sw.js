importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Parse URL params for config
const searchParams = new URL(location).searchParams;
const configString = searchParams.get("config");
let firebaseConfig = {};

if (configString) {
  try {
    firebaseConfig = JSON.parse(decodeURIComponent(configString));
  } catch(e) {
    console.error("SW: Failed to parse config");
  }
} else {
  // We can't use process.env in service worker easily without a bundler, 
  // so we'll just listen to Push events if it's initialized from the main thread
  console.log("No config string passed to SW");
}

if (firebaseConfig.apiKey) {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();
    
    messaging.onBackgroundMessage((payload) => {
      console.log(
        '[firebase-messaging-sw.js] Received background message ',
        payload
      );
      
      const notificationTitle = payload.notification?.title || 'New message';
      const notificationOptions = {
        body: payload.notification?.body || '',
        icon: '/favicon.ico',
        data: payload.data
      };
    
      self.registration.showNotification(notificationTitle, notificationOptions);
    });
}

self.addEventListener("install", (event) => {
    console.log("Service Worker installed");
});

self.addEventListener("activate", (event) => {
    console.log("Service Worker activated");
});
