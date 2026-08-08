"use client";

import { useEffect, useRef, useState } from "react";
import Map, { GeolocateControl, NavigationControl, MapRef, Source, Layer, Marker } from "react-map-gl/maplibre";
import * as maplibregl from "maplibre-gl";

// Fix Next.js App Router/Turbopack worker loading issue (MIME type 'text/html' error)
if (typeof window !== "undefined") {
  maplibregl.setWorkerUrl("https://unpkg.com/maplibre-gl@6.2.0/dist/maplibre-gl-worker.mjs");
}
interface InteractiveMapProps {
  originCoords: [number, number] | null;
  destCoords: [number, number] | null;
  routeGeoJSON: any | null;
  driverLocation?: [number, number] | null;
  onMapMove?: () => void;
  onMapCenterChange?: (coords: [number, number]) => void;
}

export default function InteractiveMap({ originCoords, destCoords, routeGeoJSON, driverLocation, onMapMove, onMapCenterChange }: InteractiveMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // ALL hooks MUST be called before any early return (Rules of Hooks)
  const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;

  // Fit bounds when route or coords change
  useEffect(() => {
    if (!mapTilerKey) return; // safe to guard inside effect
    if (mapLoaded && mapRef.current) {
      if (originCoords && destCoords) {
        const bounds = new maplibregl.LngLatBounds(originCoords, originCoords);
        bounds.extend(destCoords);
        mapRef.current.fitBounds(bounds, { padding: 60, duration: 1000 });
      } else if (originCoords && !destCoords) {
        mapRef.current.flyTo({ center: originCoords, zoom: 14, duration: 1000 });
      }
    }
  }, [mapLoaded, originCoords, destCoords, routeGeoJSON, mapTilerKey]);

  // Early return AFTER all hooks
  if (!mapTilerKey) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-zinc-900 text-white text-sm">
        <p>⚠️ Map key missing — add <code>NEXT_PUBLIC_MAPTILER_API_KEY</code> to <code>apps/web/.env.local</code></p>
      </div>
    );
  }

  const mapStyle = `https://api.maptiler.com/maps/streets-v2/style.json?key=${mapTilerKey}`;

  return (
    <div className="absolute inset-0 w-full h-full">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 77.5946, latitude: 12.9716, zoom: 11 }}
        mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
        style={{ width: "100%", height: "100%" }}
        onLoad={() => setMapLoaded(true)}
        attributionControl={false}
        maxBounds={[74.05, 11.59, 78.58, 18.44]}
        onMove={() => onMapMove && onMapMove()}
        onMoveEnd={(e) => {
          if (onMapCenterChange) {
            const center = e.viewState;
            onMapCenterChange([center.longitude, center.latitude]);
          }
        }}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl
          position="top-right"
          positionOptions={{ enableHighAccuracy: true }}
          trackUserLocation={true}
        />

        {/* Route Polyline */}
        {routeGeoJSON && (
          <Source id="route" type="geojson" data={routeGeoJSON}>
            <Layer
              id="route-line"
              type="line"
              source="route"
              layout={{
                "line-join": "round",
                "line-cap": "round",
              }}
              paint={{
                "line-color": "#3b82f6",
                "line-width": 5,
                "line-opacity": 0.8,
              }}
            />
          </Source>
        )}

        {/* Origin Marker */}
        {originCoords && (
          <Marker longitude={originCoords[0]} latitude={originCoords[1]} anchor="bottom">
            <div className="w-5 h-5 bg-green-500 border-2 border-white rounded-full shadow-lg" />
          </Marker>
        )}

        {/* Destination Marker */}
        {destCoords && (
          <Marker longitude={destCoords[0]} latitude={destCoords[1]} anchor="bottom">
            <div className="w-5 h-5 bg-red-500 border-2 border-white rounded-full shadow-lg" />
          </Marker>
        )}

        {/* Live Driver Marker — pulsing car */}
        {driverLocation && (
          <Marker longitude={driverLocation[0]} latitude={driverLocation[1]} anchor="center">
            <div className="relative flex items-center justify-center w-9 h-9">
              <span className="absolute animate-ping inline-flex h-full w-full rounded-full bg-blue-400 opacity-60" />
              <div className="relative flex items-center justify-center w-9 h-9 bg-blue-600 border-4 border-white rounded-full shadow-2xl text-base">
                🚗
              </div>
            </div>
          </Marker>
        )}
      </Map>
    </div>
  );
}
