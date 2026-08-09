"use client";
import React, { useState, useEffect } from "react";
import { useDebounce } from "../hooks/useDebounce";

interface PlaceResult {
    place_id: string;
    display_name: string;
    lat: string;
    lon: string;
}

interface Props {
    placeholder?: string;
    onSelect: (result: PlaceResult) => void;
    biasCoords?: [number, number] | null;
}

export function SearchAutocomplete({ placeholder = "Search for a place...", onSelect, biasCoords }: Props) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<PlaceResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const debouncedQuery = useDebounce(query, 300); // 300ms is fast enough for MapTiler

    useEffect(() => {
        if (!debouncedQuery) {
            setResults([]);
            return;
        }

        const fetchResults = async () => {
            const apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
            if (!apiKey) {
                console.error("Missing NEXT_PUBLIC_MAPTILER_API_KEY");
                return;
            }

            try {
                let url = `https://api.maptiler.com/geocoding/${encodeURIComponent(debouncedQuery)}.json?key=${apiKey}&autocomplete=true&limit=5`;
                
                // Add proximity bias if coordinates are provided
                if (biasCoords) {
                    url += `&proximity=${biasCoords[1]},${biasCoords[0]}`; // MapTiler expects lon,lat
                } else {
                    // Default to India bounding box
                    url += `&bbox=68.1,6.5,97.4,35.5`;
                }

                const res = await fetch(url);
                const data = await res.json();
                
                if (data.features) {
                    const mappedResults = data.features.map((f: any) => ({
                        place_id: f.id,
                        display_name: f.place_name,
                        lon: f.geometry.coordinates[0].toString(),
                        lat: f.geometry.coordinates[1].toString()
                    }));
                    setResults(mappedResults);
                    setIsOpen(true);
                }
            } catch (err) {
                console.error("Failed to fetch autocomplete results", err);
            }
        };

        fetchResults();
    }, [debouncedQuery, biasCoords]);

    const handleSelect = (result: PlaceResult) => {
        setQuery(result.display_name);
        setIsOpen(false);
        setResults([]);
        onSelect(result);
    };

    return (
        <div className="relative w-full">
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
            {isOpen && results.length > 0 && (
                <ul className="absolute z-[100] w-full mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-h-64 overflow-auto py-2">
                    {results.map((r) => (
                        <li
                            key={r.place_id}
                            className="px-5 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-sm text-zinc-800 dark:text-zinc-200 transition-colors flex items-center gap-3"
                            onClick={() => handleSelect(r)}
                        >
                            <svg className="w-5 h-5 text-zinc-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            <span className="truncate">{r.display_name}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
