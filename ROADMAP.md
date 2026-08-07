# RapidJourney — Product Roadmap

> **Sprint 1 ✅ COMPLETE** — Interactive Map Interface & PWA Shell, Database & Backend Infrastructure, Phone OTP Authentication (Fast2SMS)

---

## Sprint 2 — Route Planning & Ride Matching Core
> *Goal: Users can post a journey and get matched with others going the same way.*

### Backend
- [ ] **Route Engine**: Integrate OpenRouteService API to calculate distance, duration, and polyline between origin and destination.
- [ ] **Journey CRUD API** (`/journeys`): Create, list, update, and cancel journeys. Store origin/destination as PostGIS `GEOMETRY(Point)` with departure time.
- [ ] **Geo-spatial Matching Algorithm**: Query the database to find overlapping journeys using PostGIS `ST_DWithin` and route-corridor matching.
- [ ] **Ride Request API** (`/journeys/{id}/request`): Allow a passenger to send a join request to a driver's journey.
- [ ] **Celery Background Tasks**: Offload route calculation and notification dispatch to async workers.

### Frontend
- [ ] **Search & Autocomplete**: Connect search bar to Nominatim (OpenStreetMap) for place autocomplete suggestions.
- [ ] **Route Preview**: After selecting origin + destination, draw the planned route polyline on the map.
- [ ] **"Post a Journey" Flow**: Multi-step form (Origin → Destination → Date/Time → Seats → Price).
- [ ] **Matches List View**: Display a list of matched journeys with driver info, departure time, price, and seats.

---

## Sprint 3 — Real-time Features (WebSockets)
> *Goal: Live driver tracking and real-time ride status updates.*

### Backend
- [ ] **WebSocket Gateway**: FastAPI WebSocket endpoint (`/ws/{journey_id}`) for real-time bidirectional communication.
- [ ] **Location Broadcasting**: Drivers publish their live GPS coordinates to a Redis Pub/Sub channel every 3 seconds.
- [ ] **Ride State Machine**: Manage journey states — `PENDING → ACCEPTED → IN_PROGRESS → COMPLETED → CANCELLED`.
- [ ] **Push Notifications**: Integrate Firebase Cloud Messaging (FCM) to send push alerts for match requests, acceptance, and ride start.

### Frontend
- [ ] **Live Driver Marker**: A moving map marker showing the driver's real-time position.
- [ ] **Ride Status Bottom Sheet**: A persistent bottom sheet that shows the current ride status and driver ETA.
- [ ] **In-App Notifications**: Toast/banner notifications for ride request updates.
- [ ] **Driver Mode Toggle**: A switch in settings to toggle between Passenger and Driver modes.

---

## Sprint 4 — User Profiles & Social Trust
> *Goal: Build the social graph that makes carpooling feel safe and trustworthy.*

### Backend
- [ ] **Profile API** (`/users/me`): Update name, photo, bio, preferred role (driver/passenger), vehicle info.
- [ ] **Ratings & Reviews API**: After a completed journey, both parties can leave a star rating + comment.
- [ ] **Verification Flow**: Store a "verified" flag; trigger ID verification via a 3rd-party document check API (e.g., HyperVerge, IDfy).
- [ ] **Follow/Block API**: Users can follow trusted travellers or block others.
- [ ] **Mutual Connections**: Surface "Friends of Friends" journeys higher in the matching algorithm.

### Frontend
- [ ] **Profile Screen**: Avatar, name, rating stars, journey history, vehicle details, verification badge.
- [ ] **Post-Ride Rating Modal**: 5-star rating screen that auto-appears after a journey is completed.
- [ ] **Public Profile View**: Tappable driver/passenger cards to see their full profile before accepting a match.
- [ ] **Verification Prompt**: In-app flow to upload and verify government ID.

---

## Sprint 5 — Payments & Fare Splitting
> *Goal: Enable cashless transactions between passengers and drivers.*

### Backend
- [ ] **Razorpay Integration**: Create orders, capture payments, and issue refunds using Razorpay APIs.
- [ ] **Fare Calculation Engine**: Compute suggested fare based on distance, fuel cost, seats, and a platform margin.
- [ ] **Wallet / Escrow**: Hold the passenger's payment in escrow; release to the driver on journey completion.
- [ ] **Split-Fare Logic**: When multiple passengers share a ride, auto-split the fare equally.
- [ ] **Payout API**: Allow drivers to withdraw their balance to a bank account via Razorpay Payouts.
- [ ] **Transaction History API** (`/payments/history`): Full ledger of credits and debits per user.

### Frontend
- [ ] **Fare Display**: Show estimated cost breakdown on the ride match card.
- [ ] **Razorpay Checkout Sheet**: In-app payment sheet using the Razorpay JS SDK.
- [ ] **Wallet Screen**: Balance display, top-up option, and transaction history list.
- [ ] **Receipt Screen**: Post-journey summary with fare breakdown and a shareable receipt.

---

## Sprint 6 — Chat & Communication
> *Goal: Let riders and drivers communicate safely without exposing phone numbers.*

### Backend
- [ ] **In-App Chat API**: Persistent, per-journey chat rooms stored in the database.
- [ ] **WebSocket Chat**: Real-time message delivery via existing WebSocket gateway.
- [ ] **Number Masking**: Proxy phone calls and SMS through a virtual number (e.g., Exotel) so real numbers are never shared.
- [ ] **Message Moderation**: Flag abusive messages using a simple keyword filter or AI moderation API.

### Frontend
- [ ] **Chat Screen**: A WhatsApp-style chat interface for each active journey.
- [ ] **Message Notifications**: Unread message badge on the ride status bottom sheet.
- [ ] **Quick Replies**: Pre-set quick reply messages ("I'm on my way", "5 mins late", "Here!").
- [ ] **Call Button**: A masked in-app call button that routes through a proxy number.

---

## Sprint 7 — Discovery & Community
> *Goal: Give users reasons to return even when not actively travelling.*

### Backend
- [ ] **Regular Routes API**: Let users save their daily commute route to get automatic match alerts.
- [ ] **Notifications Service**: Scheduled daily alerts when new journeys match a saved route.
- [ ] **Journey Feed API**: A time-sorted, geo-filtered feed of upcoming public journeys near the user.
- [ ] **Community Groups API**: Users can create route-based groups (e.g., "Bandra → BKC Daily").

### Frontend
- [ ] **Explore Screen**: A scrollable card feed of nearby upcoming journeys on the map.
- [ ] **Regular Routes Manager**: UI to save, manage, and toggle alerts for recurring commutes.
- [ ] **Community Groups**: Group list, join/leave, and a shared announcement board.
- [ ] **Smart Suggestions**: "You often travel this route on Mondays" contextual homepage card.

---

## Sprint 8 — Admin Panel & Operations
> *Goal: Give the internal team tools to manage the platform and handle disputes.*

### Backend
- [ ] **Admin Auth**: Separate admin JWT roles (`ROLE_ADMIN`, `ROLE_SUPPORT`).
- [ ] **User Management API**: List, search, ban, and unban user accounts.
- [ ] **Journey Oversight API**: View all active journeys on the platform; cancel or intervene.
- [ ] **Dispute Resolution API**: Log and manage reported issues between users.
- [ ] **Analytics Pipeline**: Log all key events (ride requests, completions, payments) to a data warehouse for dashboards.

### Frontend (Internal Web Dashboard)
- [ ] **Admin Dashboard**: KPI cards — DAU, journeys completed, revenue, new signups.
- [ ] **User Table**: Searchable, filterable table of all users with ban/verify controls.
- [ ] **Live Map View**: Admin-only full map showing all active journeys in real-time.
- [ ] **Disputes Queue**: A support ticket-style queue to resolve user-reported issues.

---

## Sprint 9 — Native Mobile Apps
> *Goal: Wrap the experience in a native iOS and Android app.*

- [ ] **React Native App (`apps/mobile`)**: Scaffold a new React Native (Expo) project in the monorepo.
- [ ] **Shared Components**: Migrate UI components to a shared `packages/ui` library used by both web and mobile.
- [ ] **Maps (Mobile)**: Integrate `react-native-maps` with MapLibre for native performance.
- [ ] **Background Location**: Use `expo-task-manager` to broadcast driver location even when the app is backgrounded.
- [ ] **Deep Linking**: Universal links to open specific journeys from push notifications.
- [ ] **App Store Submission**: Prepare assets, App Store screenshots, and metadata for iOS and Android.

---

## Sprint 10 — Production Launch Hardening
> *Goal: Make the platform production-ready, secure, and scalable.*

- [ ] **Infrastructure as Code**: Define all cloud infrastructure using Terraform (AWS EC2/RDS/ElastiCache or GCP equivalent).
- [ ] **CI/CD Pipeline**: GitHub Actions for linting, testing, Docker build, and auto-deploy to staging/production.
- [ ] **Security Audit**: Rate limiting on all public endpoints, input sanitisation, OWASP check.
- [ ] **End-to-End Tests**: Playwright test suite covering the full user journey (signup → match → complete ride → pay).
- [ ] **Performance**: Tune database indexes, add Redis caching layers to hot endpoints, CDN for static assets.
- [ ] **Monitoring & Alerting**: Set up Sentry for error tracking, Prometheus + Grafana for infrastructure metrics.
- [ ] **Privacy & Compliance**: DPDPA (India) compliance review, privacy policy, terms of service.
