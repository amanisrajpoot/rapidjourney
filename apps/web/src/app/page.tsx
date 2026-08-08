"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import LoginSheet from "../components/LoginSheet";
import PostJourneyForm from "../components/PostJourneyForm";
import MatchesList from "../components/MatchesList";
import LocationSearchOverlay from "../components/LocationSearchOverlay";
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

type Screen = "home" | "posting" | "matches" | "activeJourney";
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
  const { isAuthenticated, isDriverMode, setDriverMode } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [screen, setScreen] = useState<Screen>("home");
  const [showLogin, setShowLogin] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>(null);

  // Core location states
  const [originPlace, setOriginPlace] = useState<NominatimPlace | null>(null);
  const [destPlace, setDestPlace] = useState<NominatimPlace | null>(null);
  const [currentLocationName, setCurrentLocationName] = useState<string>("Fetching location...");
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

  // Geolocation broadcast for active journey
  useEffect(() => {
    if (!isDriverMode || !activeJourneyId || typeof navigator === "undefined") return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        // Driver always broadcasts their actual location, even if they set a different origin
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "location_update", coords }));
        }
      },
      (err) => console.error("Geo error:", err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isDriverMode, activeJourneyId]);

  const requireAuth = (cb: () => void) => {
    if (!isAuthenticated) { setShowLogin(true); return; }
    cb();
  };

  const handleFindRide = () => {
    requireAuth(async () => {
      if (!originPlace || !destPlace) return;
      try {
        // Find rides near origin
        const results = await apiClient(`/journeys/search?radius_km=10&limit=10`);
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
    setScreen("activeJourney");
  };

  const handleEndJourney = () => {
    setActiveJourneyId(null);
    setDriverLocation(null);
    setOriginPlace(null);
    setDestPlace(null);
    setRouteGeoJSON(null);
    setScreen("home");
  };

  const originCoords: [number, number] | null = originPlace ? [parseFloat(originPlace.lon), parseFloat(originPlace.lat)] : null;
  const destCoords: [number, number] | null = destPlace ? [parseFloat(destPlace.lon), parseFloat(destPlace.lat)] : null;

  return (
    <main className="relative h-full w-full overflow-hidden bg-zinc-100 dark:bg-black">
      {/* ── MAP LAYER ── */}
      <div className="absolute inset-0 z-0">
        <InteractiveMap
          originCoords={originCoords}
          destCoords={destCoords}
          routeGeoJSON={routeGeoJSON}
          driverLocation={driverLocation}
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
              <div className="flex h-11 items-center gap-2 rounded-full bg-white px-4 shadow-lg dark:bg-zinc-800">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Driver</span>
                <button
                  onClick={() => setDriverMode(!isDriverMode)}
                  role="switch"
                  aria-checked={isDriverMode}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    isDriverMode ? "bg-green-500" : "bg-zinc-300 dark:bg-zinc-600"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                      isDriverMode ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── BOTTOM SHEET / MAIN UI ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-8 pointer-events-none">
        <div className="pointer-events-auto w-full">
          {screen === "activeJourney" ? (
            <div className="w-full rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900 animate-in slide-in-from-bottom duration-300">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Active Journey</h2>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
                  Live
                </span>
              </div>
              <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">
                {isDriverMode ? "Broadcasting your location to passengers..." : "Waiting for driver to start..."}
              </p>
              <button
                onClick={handleEndJourney}
                className="h-12 w-full rounded-xl bg-red-600 font-semibold text-white transition hover:bg-red-700 active:scale-95"
              >
                End Journey
              </button>
            </div>
          ) : screen === "posting" ? (
            <PostJourneyForm
              originPlace={originPlace}
              destPlace={destPlace}
              onCancel={() => setScreen("home")}
              onJourneyPosted={handleJourneyPosted}
            />
          ) : screen === "matches" ? (
            <MatchesList matches={matches} onClose={() => setScreen("home")} />
          ) : (
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
          )}
        </div>
      </div>

      {/* ── FULL SCREEN SEARCH OVERLAY ── */}
      {searchMode !== null && (
        <LocationSearchOverlay
          title={searchMode === "origin" ? "Set pickup location" : "Set destination"}
          placeholder={searchMode === "origin" ? "Search pickup location..." : "Search destination..."}
          onClose={() => setSearchMode(null)}
          onSelect={(place) => {
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
        />
      )}

      {/* ── LOGIN MODAL ── */}
      {showLogin && !isAuthenticated && (
        <div className="pointer-events-auto">
          <LoginSheet onClose={() => setShowLogin(false)} />
        </div>
      )}
    </main>
  );
}
