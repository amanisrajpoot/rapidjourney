"use client";
import React, { useState, useEffect } from "react";
import { useDebounce } from "../hooks/useDebounce";

interface NominatimResult {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
}

interface Props {
    placeholder?: string;
    onSelect: (result: NominatimResult) => void;
    biasCoords?: [number, number] | null;
}

export function SearchAutocomplete({ placeholder = "Search for a place...", onSelect, biasCoords }: Props) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<NominatimResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const debouncedQuery = useDebounce(query, 1500);

    useEffect(() => {
        if (!debouncedQuery) {
            setResults([]);
            return;
        }

        const fetchResults = async () => {
            try {
                let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(debouncedQuery + " Karnataka, India")}&format=json&addressdetails=1&limit=5&email=rapidjourney@example.com`;
                // Karnataka bounding box: [Left/West, Top/North, Right/East, Bottom/South]
                // Viewbox: lon_left, lat_top, lon_right, lat_bottom
                url += `&viewbox=74.05,18.44,78.58,11.59&bounded=1`;
                const res = await fetch(url);
                const data = await res.json();
                setResults(data);
                setIsOpen(true);
            } catch (err) {
                console.error("Failed to fetch autocomplete results", err);
            }
        };

        fetchResults();
    }, [debouncedQuery]);

    const handleSelect = (result: NominatimResult) => {
        setQuery(result.display_name);
        setIsOpen(false);
        onSelect(result);
    };

    return (
        <div className="relative w-full">
            <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                placeholder={placeholder}
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    if (!isOpen) setIsOpen(true);
                }}
            />
            {isOpen && results.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    {results.map((r) => (
                        <li
                            key={r.place_id}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-800"
                            onClick={() => handleSelect(r)}
                        >
                            {r.display_name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
