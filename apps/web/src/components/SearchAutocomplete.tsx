"use client";
import React, { useState, useEffect, useRef } from "react";

interface PlaceResult {
    place_id: string;
    description: string;
}

interface Props {
    placeholder?: string;
    onSelect: (result: { place_id: string; display_name: string; lat: string; lon: string }) => void;
    biasCoords?: [number, number] | null;
}

export function SearchAutocomplete({ placeholder = "Search for a place...", onSelect, biasCoords }: Props) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<PlaceResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesService = useRef<google.maps.places.PlacesService | null>(null);
    const mapDiv = useRef<HTMLDivElement>(null);
    const [scriptLoaded, setScriptLoaded] = useState(false);

    useEffect(() => {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            console.error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env");
            return;
        }

        if (window.google?.maps?.places) {
            // Already loaded
            if (!scriptLoaded) {
                setTimeout(() => setScriptLoaded(true), 0);
            }
            return;
        }

        const existingScript = document.getElementById("google-maps-script");
        if (!existingScript) {
            const script = document.createElement("script");
            script.id = "google-maps-script";
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
            script.async = true;
            script.defer = true;
            script.onload = () => setScriptLoaded(true);
            document.head.appendChild(script);
        } else {
            existingScript.addEventListener("load", () => setScriptLoaded(true));
        }
    }, []);

    useEffect(() => {
        if (scriptLoaded && !autocompleteService.current) {
            autocompleteService.current = new window.google.maps.places.AutocompleteService();
            if (mapDiv.current) {
                placesService.current = new window.google.maps.places.PlacesService(mapDiv.current);
            }
        }
    }, [scriptLoaded]);

    useEffect(() => {
        if (!query.trim() || !autocompleteService.current) {
            setResults([]);
            return;
        }

        const request: google.maps.places.AutocompletionRequest = {
            input: query,
            componentRestrictions: { country: "in" }, // Restrict to India for now
        };

        if (biasCoords) {
            const center = new window.google.maps.LatLng(biasCoords[0], biasCoords[1]);
            request.locationBias = {
                radius: 50000, // 50km radius
                center,
            };
        }

        autocompleteService.current.getPlacePredictions(request, (predictions, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                setResults(predictions.map(p => ({
                    place_id: p.place_id,
                    description: p.description
                })));
                setIsOpen(true);
            } else {
                setResults([]);
            }
        });
    }, [query, biasCoords]);

    const handleSelect = (result: PlaceResult) => {
        setQuery(result.description);
        setIsOpen(false);
        setResults([]);

        // Get details (lat/lon)
        if (placesService.current) {
            placesService.current.getDetails(
                { placeId: result.place_id, fields: ["geometry", "formatted_address"] },
                (place, status) => {
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
                        onSelect({
                            place_id: result.place_id,
                            display_name: place.formatted_address || result.description,
                            lat: place.geometry.location.lat().toString(),
                            lon: place.geometry.location.lng().toString()
                        });
                    }
                }
            );
        }
    };

    return (
        <div className="relative w-full">
            <div ref={mapDiv} style={{ display: 'none' }}></div>
            <input
                type="text"
                className="w-full px-5 py-4 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-sm focus:ring-2 focus:ring-black dark:focus:ring-white outline-none text-zinc-900 bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-100 transition-all text-sm font-medium"
                placeholder={placeholder}
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    if (!isOpen) setIsOpen(true);
                }}
            />
            {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
                <p className="text-xs text-red-500 mt-2 px-2">Missing Google Maps API Key in .env</p>
            )}
            {isOpen && results.length > 0 && (
                <ul className="absolute z-[100] w-full mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-h-64 overflow-auto py-2">
                    {results.map((r) => (
                        <li
                            key={r.place_id}
                            className="px-5 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-sm text-zinc-800 dark:text-zinc-200 transition-colors flex items-center gap-3"
                            onClick={() => handleSelect(r)}
                        >
                            <svg className="w-5 h-5 text-zinc-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            <span className="truncate">{r.description}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
