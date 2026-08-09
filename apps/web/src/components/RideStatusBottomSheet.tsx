"use client";
import React from "react";

interface RideStatusBottomSheetProps {
    status: string;
    isDriverMode: boolean;
    onEndJourney?: () => void;
    onStartJourney?: () => void;
    destCoords?: [number, number] | null;
}

export function RideStatusBottomSheet({ status, isDriverMode, onEndJourney, onStartJourney, destCoords }: RideStatusBottomSheetProps) {
    
    const getStatusText = () => {
        if (isDriverMode) {
            switch(status) {
                case "pending": return "Waiting for passengers...";
                case "in_progress": return "Broadcasting your location to passengers...";
                case "completed": return "Journey completed";
                default: return `Status: ${status}`;
            }
        } else {
            switch(status) {
                case "pending": return "Waiting for driver to start...";
                case "in_progress": return "Driver is on the way! Live tracking enabled.";
                case "completed": return "You have reached your destination.";
                default: return `Status: ${status}`;
            }
        }
    };

    return (
        <div className="w-full rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900 animate-in slide-in-from-bottom duration-300 pointer-events-auto">
            <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Active Journey</h2>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
                    {status.replace("_", " ").toUpperCase()}
                </span>
            </div>
            
            <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">
                {getStatusText()}
            </p>
            
            <div className="flex flex-col gap-3">
                {isDriverMode && status === "pending" && (
                    <button
                        onClick={onStartJourney}
                        className="h-12 w-full rounded-xl bg-blue-600 font-semibold text-white transition hover:bg-blue-700 active:scale-95"
                    >
                        Start Journey
                    </button>
                )}
                {isDriverMode && status === "in_progress" && destCoords && (
                    <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${destCoords[1]},${destCoords[0]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-12 w-full flex items-center justify-center rounded-xl bg-green-600 font-semibold text-white transition hover:bg-green-700 active:scale-95"
                    >
                        Navigate (Google Maps)
                    </a>
                )}
                
                <button
                    onClick={onEndJourney}
                    className="h-12 w-full rounded-xl bg-red-600 font-semibold text-white transition hover:bg-red-700 active:scale-95"
                >
                    {isDriverMode ? "End Journey" : "Leave Journey"}
                </button>
            </div>
        </div>
    );
}
