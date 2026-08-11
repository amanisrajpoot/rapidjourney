"use client";

import dynamic from "next/dynamic";
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import LoginSheet from "../components/LoginSheet";
import { PostJourneyFlow } from "../components/PostJourneyFlow";
import { JourneyMatchesList } from "../components/JourneyMatchesList";
import { DriverJourneysSheet } from "../components/DriverJourneysSheet";
import { PassengerJourneysSheet } from "../components/PassengerJourneysSheet";
import ProfileSheet from "../components/ProfileSheet";
import ChatSheet from "../components/ChatSheet";
import { GlobalJourneyListener } from "../components/GlobalJourneyListener";
import { RatingModal } from "../components/RatingModal";
import LocationSearchOverlay from "../components/LocationSearchOverlay";
import { RideStatusBottomSheet } from "../components/RideStatusBottomSheet";
import { apiClient } from "../lib/api";
import { reverseGeocode, NominatimPlace } from "../lib/nominatim";
import toast from "react-hot-toast";

const InteractiveMap = dynamic(() => import("../components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-zinc-100 dark:bg-zinc-900">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-black dark:border-zinc-700 dark:border-t-white" />
    </div>
  ),
});

type Screen = "home" | "posting" | "matches" | "activeJourney" | "driver_journeys" | "passenger_journeys";
type SearchMode = "origin" | "dest" | null;

// Helper to convert lat/lon to NominatimPlace shape for local state
function createPlace(lat: number, lon: number, name: string): NominatimPlace {
  return {
    place_id: Date.now(),
    lat: lat.toString(),
    lon: lon.toString(),
    display_name: name,
    type: "custom",
  };
}

export default function Home() {
  const { isAuthenticated, isDriverMode, setDriverMode, logout, isGuest } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [screen, setScreen] = useState<Screen>("home");
  const [showLogin, setShowLogin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>(null);
  const [mapPickerMode, setMapPickerMode] = useState<SearchMode>(null);
  
  // Map picker state
  const [pickerCenterCoords, setPickerCenterCoords] = useState<[number, number] | null>(null);
  const [pickerAddress, setPickerAddress] = useState<string>("Locating...");
  const [isDraggingMap, setIsDraggingMap] = useState(false);

  // Core location states
  const [originPlace, setOriginPlace] = useState<NominatimPlace | null>(null);
  const [destPlace, setDestPlace] = useState<NominatimPlace | null>(null);
  const [currentLocationName, setCurrentLocationName] = useState<string>("Fetching location...");

  // Chat state
  const [chatState, setChatState] = useState<{ isOpen: boolean; journeyId: string; otherPartyName: string } | null>(null);
  const [ratingJourneyId, setRatingJourneyId] = useState<string | null>(null);
  const [hasAutoLocated, setHasAutoLocated] = useState(false);

  const [matches, setMatches] = useState<any[]>([]);
  const [activeJourneyId, setActiveJourneyId] = useState<string | null>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<[number, number] | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // Auto-locate user on mount
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation && !hasAutoLocated) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          const name = await reverseGeocode(latitude, longitude);
          setCurrentLocationName(name);
          // Set origin to current location automatically
          if (!originPlace) {
            setOriginPlace(createPlace(latitude, longitude, name));
          }
          setHasAutoLocated(true);
        },
        (err) => {
          console.warn("Geolocation failed:", err);
          setCurrentLocationName("Location unavailable");
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
  }, [hasAutoLocated, originPlace]);

  const [activeJourneyStatus, setActiveJourneyStatus] = useState("pending");

  // Geolocation broadcast for active journey
  useEffect(() => {
    if (!isDriverMode || !activeJourneyId || activeJourneyStatus !== "in_progress" || typeof navigator === "undefined" || !navigator.geolocation) return;
    
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        // Driver always broadcasts their actual location, even if they set a different origin
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "location_update", data: coords }));
        }
      },
      (err) => console.error("Geo error:", err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isDriverMode, activeJourneyId, activeJourneyStatus]);

  // WebSocket Connection
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Global listener for cross-component reactive UI updates
    const handleJourneyEvent = (e: Event) => {
        const customEvent = e as CustomEvent;
        const msg = customEvent.detail.message;
        
        if (msg.type === "request_updated" && msg.data.new_status === "accepted") {
            // Auto switch to active journey when a driver accepts your request
            setActiveJourneyId(customEvent.detail.journeyId);
            setActiveJourneyStatus("pending"); // Waiting for driver to start
            setScreen("activeJourney");
        } else if (msg.type === "status_update" && msg.data.status === "in_progress") {
            // Auto switch to active journey tracking when driver starts the ride
            setActiveJourneyId(customEvent.detail.journeyId);
            setActiveJourneyStatus("in_progress");
            setScreen("activeJourney");
        }
    };
    
    window.addEventListener("journey-event", handleJourneyEvent);
    return () => window.removeEventListener("journey-event", handleJourneyEvent);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!activeJourneyId) {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        return;
    }

    // Connect to WebSocket using the current host so it passes through the Next.js proxy
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host; // This includes the port, e.g., localhost:3000
    const wsUrl = `${protocol}//${host}/api/v1/ws/${activeJourneyId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            if (msg.type === "location_update" && !isDriverMode) {
                setDriverLocation(msg.data);
            } else if (msg.type === "status_update") {
                setActiveJourneyStatus(msg.data.status);
                if (msg.data.status === "in_progress") {
                    toast.success("Ride is now in progress!");
                } else if (msg.data.status === "completed") {
                    toast.success("Journey has been completed.");
                    if (!isDriverMode && activeJourneyId) {
                        setRatingJourneyId(activeJourneyId);
                    }
                    setActiveJourneyId(null);
                    setScreen("home");
                }
            } else if (msg.type === "new_request" && isDriverMode) {
                // Driver gets a ping when a new passenger requests to join
                toast.success(`🙋 ${msg.data.passenger_name} wants to join your ride!`, { duration: 5000 });
            } else if (msg.type === "request_updated" && !isDriverMode) {
                // Passenger gets notified when driver accepts/rejects
                const status = msg.data.new_status;
                if (status === "accepted") {
                    toast.success("✅ Your ride request was accepted!", { duration: 5000 });
                } else if (status === "rejected") {
                    toast.error("❌ Your ride request was declined.", { duration: 5000 });
                }
            }
        } catch (e) {
            console.error("WS parse error", e);
        }
    };

    return () => {
        ws.close();
        wsRef.current = null;
    };
  }, [activeJourneyId, isDriverMode]);

  // Fetch route when both origin and destination are selected
  useEffect(() => {
    if (!originPlace || !destPlace || mapPickerMode) {
      if (mapPickerMode) setRouteGeoJSON(null);
      return;
    }

    const fetchRoute = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_OPEN_ROUTE_SERVICE_API_KEY;
        console.log("ORS API KEY IS:", apiKey ? "Loaded" : "Missing");
        if (!apiKey) {
            console.error("ORS API KEY IS MISSING!");
            return;
        }

        const response = await fetch(
          `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${originPlace.lon},${originPlace.lat}&end=${destPlace.lon},${destPlace.lat}`
        );

        if (!response.ok) {
            console.error("Failed to fetch route");
            return;
        }

        const data = await response.json();
        console.log("ORS Route Data:", data);
        setRouteGeoJSON(data);
      } catch (e) {
        console.error("Error fetching route", e);
      }
    };

    fetchRoute();
  }, [originPlace, destPlace, mapPickerMode]);

  const requireAuth = (cb: () => void) => {
    if (!isAuthenticated) { setShowLogin(true); return; }
    cb();
  };

  const handleFindRide = () => {
    requireAuth(async () => {
      if (!originPlace || !destPlace) return;
      try {
        // Find rides near origin
        const results = await apiClient.get(
          `/journeys/search?lat=${originPlace.lat}&lon=${originPlace.lon}&radius_km=10&limit=10`
        );
        setMatches(results || []);
        setScreen("matches");
      } catch (e: any) {
        toast.error(e.message || "Failed to search for rides");
      }
    });
  };

  const handleOfferRide = () => {
    requireAuth(() => setScreen("posting"));
  };

  const handleJourneyPosted = (journey: any) => {
    if (journey?.id) setActiveJourneyId(journey.id);
    setActiveJourneyStatus("pending");
    setScreen("activeJourney");
  };

  const handleStartJourney = async () => {
    try {
        await apiClient.patch(`/journeys/${activeJourneyId}/status`, { status: "in_progress" });
        setActiveJourneyStatus("in_progress");
        toast.success("Journey started!");
    } catch (e: any) {
        toast.error("Failed to start journey");
    }
  };

  const handleEndJourney = async () => {
    if (isDriverMode && activeJourneyId) {
        try {
            await apiClient.patch(`/journeys/${activeJourneyId}/status`, { status: "completed" });
            toast.success("Journey completed successfully!");
        } catch (e: any) {
            toast.error("Failed to complete journey");
            return;
        }
    }
    setActiveJourneyId(null);
    setDriverLocation(null);
    setOriginPlace(null);
    setDestPlace(null);
    setRouteGeoJSON(null);
    setScreen("home");
  };

  const originCoords: [number, number] | null = React.useMemo(() => 
    originPlace ? [parseFloat(originPlace.lon), parseFloat(originPlace.lat)] : null,
  [originPlace]);

  const destCoords: [number, number] | null = React.useMemo(() => 
    destPlace ? [parseFloat(destPlace.lon), parseFloat(destPlace.lat)] : null,
  [destPlace]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-zinc-50 dark:bg-black">
      {/* Background WS Listener */}
      <GlobalJourneyListener />
      
      {/* ── MAP LAYER ── */}
      <div className="absolute inset-0 z-0">
        <InteractiveMap
          originCoords={mapPickerMode === "origin" ? null : originCoords}
          destCoords={mapPickerMode === "dest" ? null : destCoords}
          routeGeoJSON={routeGeoJSON}
          driverLocation={driverLocation}
          onMapMove={() => {
            if (mapPickerMode) setIsDraggingMap(true);
          }}
          onMapCenterChange={async (coords) => {
            if (mapPickerMode) {
              setIsDraggingMap(false);
              setPickerCenterCoords(coords);
              setPickerAddress("Fetching address...");
              const name = await reverseGeocode(coords[1], coords[0]);
              setPickerAddress(name);
            }
          }}
        />
      </div>

      {/* ── TOP BAR ── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 pointer-events-none">
        <button
          onClick={() => requireAuth(() => toast("Menu coming soon!"))}
          className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg dark:bg-zinc-800 transition-transform active:scale-95"
          aria-label="Menu"
        >
          <svg className="h-5 w-5 text-zinc-800 dark:text-zinc-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {mounted && (
          <div className="pointer-events-auto flex items-center gap-3">
            {!isAuthenticated && (
              <button
                onClick={() => setShowLogin(true)}
                className="h-10 rounded-full bg-black px-6 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-80 dark:bg-white dark:text-black"
              >
                Log In
              </button>
            )}
            {isAuthenticated && (
              <>
                {!isGuest && (
                  <div className="flex h-11 items-center gap-2 rounded-full bg-white px-4 shadow-lg dark:bg-zinc-800 animate-in fade-in zoom-in duration-300">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200 transition-colors">Driver</span>
                <button
                  onClick={() => setDriverMode(!isDriverMode)}
                  role="switch"
                  aria-checked={isDriverMode}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 focus:outline-none ${
                    isDriverMode ? "bg-green-500" : "bg-zinc-300 dark:bg-zinc-600"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-300 ease-in-out ${
                      isDriverMode ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            )}
              <button
                onClick={() => setShowProfile(true)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg dark:bg-zinc-800 transition-transform hover:scale-105 active:scale-95"
                aria-label="Profile"
                title="Profile"
              >
                <svg className="h-5 w-5 text-zinc-700 dark:text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              <button
                onClick={() => {
                  logout();
                  toast("Logged out successfully");
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg dark:bg-zinc-800 transition-transform hover:scale-105 active:scale-95"
                aria-label="Log Out"
                title="Log Out"
              >
                <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── MAP PICKER CENTER PIN ── */}
      {mapPickerMode && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 pb-8">
            <div className={`relative flex flex-col items-center transition-transform ${isDraggingMap ? '-translate-y-4' : ''}`}>
                <div className={`w-8 h-8 rounded-full shadow-lg border-2 border-white flex items-center justify-center text-white ${mapPickerMode === 'origin' ? 'bg-green-500' : 'bg-red-500'}`}>
                    <span className="w-2 h-2 bg-white rounded-full"></span>
                </div>
                <div className="w-1 h-4 bg-black rounded-full mt-1"></div>
            </div>
        </div>
      )}

      {/* ── BOTTOM SHEET / MAIN UI ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-8 pointer-events-none">
        <div className="pointer-events-auto w-full">
          {mapPickerMode ? (
            <div className="w-full rounded-3xl bg-white p-5 shadow-2xl dark:bg-zinc-900 animate-in slide-in-from-bottom duration-300">
               <div className="flex justify-between items-center mb-4">
                 <h2 className="text-lg font-bold dark:text-white">
                   Set {mapPickerMode === 'origin' ? 'Pickup' : 'Destination'}
                 </h2>
                 <button onClick={() => setMapPickerMode(null)} className="p-2 bg-zinc-100 rounded-full dark:bg-zinc-800">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                 </button>
               </div>
               
               <div className="flex items-center bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl mb-4 border border-zinc-200 dark:border-zinc-700">
                   <span className="text-2xl mr-3">{isDraggingMap ? '🗺️' : '📍'}</span>
                   <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2">
                       {isDraggingMap ? 'Moving...' : pickerAddress}
                   </span>
               </div>
               
               <button 
                 disabled={isDraggingMap || !pickerCenterCoords}
                 onClick={() => {
                   if (pickerCenterCoords) {
                       const place = createPlace(pickerCenterCoords[1], pickerCenterCoords[0], pickerAddress);
                       if (mapPickerMode === 'origin') setOriginPlace(place);
                       else setDestPlace(place);
                   }
                   setMapPickerMode(null);
                 }}
                 className="w-full bg-black dark:bg-white text-white dark:text-black font-bold py-4 rounded-2xl disabled:opacity-50 transition-opacity"
               >
                 Confirm Location
               </button>
            </div>
          ) : screen === "activeJourney" ? (
            <RideStatusBottomSheet 
              status={activeJourneyStatus}
              isDriverMode={isDriverMode}
              onStartJourney={handleStartJourney}
              onEndJourney={handleEndJourney}
              destCoords={destCoords}
            />
          ) : screen === "posting" ? (
            <PostJourneyFlow
              onSuccess={() => setScreen("home")}
              onCancel={() => setScreen("home")}
              originPlace={originPlace!}
              destPlace={destPlace!}
            />
          ) : screen === "driver_journeys" ? (
            <DriverJourneysSheet 
              onClose={() => setScreen("home")} 
              onStartRide={(id) => {
                setActiveJourneyId(id);
                setActiveJourneyStatus("in_progress");
                setScreen("activeJourney");
              }}
              onOpenChat={(journeyId, otherPartyName) => {
                setChatState({ isOpen: true, journeyId, otherPartyName });
              }}
            />
          ) : screen === "passenger_journeys" ? (
            <PassengerJourneysSheet 
              onClose={() => setScreen("home")} 
              onTrackRide={(id) => {
                setActiveJourneyId(id);
                setActiveJourneyStatus("in_progress");
                setScreen("activeJourney");
              }}
              onOpenChat={(journeyId, otherPartyName) => {
                setChatState({ isOpen: true, journeyId, otherPartyName });
              }}
            />
          ) : screen === "matches" ? (
            <div className="w-full relative">
                <button onClick={() => setScreen("home")} className="absolute -top-12 left-0 bg-white p-2 rounded-full shadow-md text-gray-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
                </button>
                <JourneyMatchesList 
                    journeys={matches} 
                    onRequestSent={() => setScreen("passenger_journeys")}
                />
            </div>
          ) : (
            <>
              {screen === "home" && isAuthenticated && (
                <div className="mb-4">
                  <button 
                    onClick={() => setScreen(isDriverMode ? "driver_journeys" : "passenger_journeys")}
                    className="w-full bg-white/90 backdrop-blur px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold text-zinc-900 border border-zinc-200 dark:bg-zinc-800/90 dark:text-white dark:border-zinc-700 hover:scale-[1.02] transition-transform"
                  >
                    {isDriverMode ? "Manage Rides" : "My Rides"}
                  </button>
                </div>
              )}
              <div className="w-full rounded-3xl bg-white p-5 shadow-2xl dark:bg-zinc-900 animate-in slide-in-from-bottom duration-300">
                <h1 className="mb-4 text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  {isDriverMode ? "Where are you driving?" : "Where to?"}
                </h1>

                {/* Location Picker Fields */}
                <div className="flex flex-col gap-3 relative">
                  {/* Connecting Line */}
                  <div className="absolute left-[1.1rem] top-[2.25rem] bottom-[2.25rem] w-0.5 bg-zinc-200 dark:bg-zinc-700 z-0"></div>

                  {/* Pickup Field */}
                  <button
                    onClick={() => setSearchMode("origin")}
                    className="flex items-center w-full rounded-2xl bg-zinc-50 border border-zinc-200 px-4 py-3.5 dark:bg-zinc-800/50 dark:border-zinc-700 transition-colors active:bg-zinc-100 dark:active:bg-zinc-800 z-10"
                  >
                    <div className="mr-3 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-green-500 ring-4 ring-green-100 dark:ring-green-900/30 flex-shrink-0" />
                    <span className={`text-left text-base font-medium truncate ${originPlace ? "text-zinc-900 dark:text-white" : "text-zinc-400 dark:text-zinc-500"}`}>
                      {originPlace ? originPlace.display_name.split(',')[0] : "Pickup location"}
                    </span>
                  </button>

                  {/* Destination Field */}
                  <button
                    onClick={() => setSearchMode("dest")}
                    className="flex items-center w-full rounded-2xl bg-zinc-50 border border-zinc-200 px-4 py-3.5 dark:bg-zinc-800/50 dark:border-zinc-700 transition-colors active:bg-zinc-100 dark:active:bg-zinc-800 z-10"
                  >
                    <div className="mr-3 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 ring-4 ring-red-100 dark:ring-red-900/30 flex-shrink-0" />
                    <span className={`text-left text-base font-medium truncate ${destPlace ? "text-zinc-900 dark:text-white" : "text-zinc-400 dark:text-zinc-500"}`}>
                      {destPlace ? destPlace.display_name.split(',')[0] : "Search destination..."}
                    </span>
                  </button>
                </div>

                {/* Action Buttons (Show if both selected) */}
                {originPlace && destPlace && (
                  <div className="mt-5 flex gap-3 animate-in fade-in duration-300">
                    <button
                      onClick={isDriverMode ? handleOfferRide : handleFindRide}
                      className="flex-1 rounded-2xl bg-black py-4 text-base font-bold text-white transition-transform hover:opacity-90 active:scale-[0.98] dark:bg-white dark:text-black"
                    >
                      {isDriverMode ? "Offer Ride" : "Find Ride"}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── FULL SCREEN SEARCH OVERLAY ── */}
      {searchMode !== null && (
        <LocationSearchOverlay
          title={searchMode === "origin" ? "Set pickup location" : "Set destination"}
          placeholder={searchMode === "origin" ? "Search pickup location..." : "Search destination..."}
          onClose={() => setSearchMode(null)}
          onSelect={(place: any) => {
            if (searchMode === "origin") setOriginPlace(place);
            else setDestPlace(place);
            setSearchMode(null);
          }}
          currentLocationLabel={currentLocationName}
          onUseCurrentLocation={() => {
            if (hasAutoLocated && typeof navigator !== "undefined") {
              navigator.geolocation.getCurrentPosition((pos) => {
                const p = createPlace(pos.coords.latitude, pos.coords.longitude, currentLocationName);
                if (searchMode === "origin") setOriginPlace(p);
                else setDestPlace(p);
                setSearchMode(null);
              });
            }
          }}
          biasCoords={originCoords}
          onChooseOnMap={() => {
            setMapPickerMode(searchMode);
            const initialCoords = searchMode === "origin" ? originCoords : (searchMode === "dest" ? destCoords : originCoords);
            if (initialCoords) {
                setPickerCenterCoords(initialCoords);
                setPickerAddress("Fetching address...");
                reverseGeocode(initialCoords[1], initialCoords[0]).then(setPickerAddress);
            }
            setSearchMode(null);
          }}
        />
      )}

      {/* ── MODALS & SHEETS ── */}
      {/* Overlays */}
      <div className={`fixed inset-0 z-50 bg-black/50 transition-opacity ${showLogin ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <div className="absolute bottom-0 w-full">
          {showLogin && <LoginSheet onClose={() => setShowLogin(false)} />}
        </div>
      </div>

      <div className={`fixed inset-0 z-50 bg-black/50 transition-opacity ${showProfile ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <div className="absolute bottom-0 w-full pointer-events-auto">
          {showProfile && <ProfileSheet onClose={() => setShowProfile(false)} />}
        </div>
      </div>

      <div className={`fixed inset-0 z-50 bg-black/50 transition-opacity ${chatState?.isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <div className="absolute bottom-0 w-full pointer-events-auto">
          {chatState?.isOpen && (
            <ChatSheet 
              journeyId={chatState.journeyId}
              otherPartyName={chatState.otherPartyName}
              onClose={() => setChatState(null)} 
            />
          )}
        </div>
      </div>

      {ratingJourneyId && (
        <RatingModal 
            journeyId={ratingJourneyId} 
            onClose={() => setRatingJourneyId(null)} 
        />
      )}
    </main>
  );
}
