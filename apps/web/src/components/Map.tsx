"use client";

import { useEffect, useRef, useState } from "react";
import Map, { GeolocateControl, NavigationControl, MapRef } from "react-map-gl/maplibre";
import * as maplibregl from "maplibre-gl";

// Fix Next.js App Router/Turbopack worker loading issue (MIME type 'text/html' error)
if (typeof window !== "undefined") {
  maplibregl.setWorkerUrl("https://unpkg.com/maplibre-gl@6.2.0/dist/maplibre-gl-worker.mjs");
}

export default function InteractiveMap() {
  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // MapTiler key from env
  const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;

  if (!mapTilerKey) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-zinc-900 text-white">
        <p>Error: NEXT_PUBLIC_MAPTILER_API_KEY is missing.</p>
      </div>
    );
  }

  // Default MapTiler style
  const mapStyle = `https://api.maptiler.com/maps/streets-v2/style.json?key=${mapTilerKey}`;

  return (
    <div className="absolute inset-0 w-full h-full">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 77.209, // Default to New Delhi
          latitude: 28.6139,
          zoom: 12,
        }}
        mapStyle={mapStyle}
        style={{ width: "100%", height: "100%" }}
        onLoad={() => setMapLoaded(true)}
        attributionControl={false} // Clean UI, we can add custom attribution if needed
      >
        <NavigationControl position="top-right" />
        <GeolocateControl
          position="top-right"
          positionOptions={{ enableHighAccuracy: true }}
          trackUserLocation={true}
          showUserHeading={true}
        />
      </Map>
    </div>
  );
}
