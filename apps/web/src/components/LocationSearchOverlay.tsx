"use client";
import React from "react";
import { SearchAutocomplete } from "./SearchAutocomplete";

export default function LocationSearchOverlay({ title, placeholder, onClose, onSelect, currentLocationLabel, onUseCurrentLocation, biasCoords, onChooseOnMap }: any) {
    return (
        <div className="fixed inset-0 z-50 bg-white dark:bg-black p-4 flex flex-col">
            <div className="flex items-center mb-6">
                <button onClick={onClose} className="p-2 mr-2 bg-gray-100 rounded-full dark:bg-zinc-800">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
                </button>
                <h2 className="text-xl font-bold dark:text-white">{title}</h2>
            </div>
            
            <SearchAutocomplete 
                placeholder={placeholder}
                onSelect={(res) => onSelect({
                    place_id: res.place_id,
                    lat: res.lat,
                    lon: res.lon,
                    display_name: res.display_name,
                    type: "custom"
                })}
                biasCoords={biasCoords}
            />

            <div className="mt-8">
                <button onClick={onUseCurrentLocation} className="flex items-center text-blue-600 dark:text-blue-400 font-medium p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl w-full">
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    <div className="text-left">
                        <div>Use Current Location</div>
                        <div className="text-sm font-normal text-gray-500 dark:text-gray-400">{currentLocationLabel}</div>
                    </div>
                </button>

                {onChooseOnMap && (
                    <button onClick={onChooseOnMap} className="mt-4 flex items-center text-zinc-700 dark:text-zinc-300 font-medium p-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-full">
                        <span className="text-xl mr-3">📍</span>
                        <div className="text-left">
                            <div>Choose on Map</div>
                            <div className="text-sm font-normal text-gray-500 dark:text-gray-400">Drag map to position pin</div>
                        </div>
                    </button>
                )}
            </div>
        </div>
    );
}
