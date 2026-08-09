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
        <div className="w-full rounded-t-[2.5rem] bg-white/90 backdrop-blur-xl p-8 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:bg-zinc-900/90 dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-8 duration-500 pointer-events-auto border-t border-white/20 dark:border-zinc-800/50">
            <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            
            <div className="mb-6 flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-1">
                        Active Journey
                    </h2>
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                        {status === "in_progress" && (
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                            </span>
                        )}
                        {getStatusText()}
                    </p>
                </div>
                <span className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${
                    status === 'in_progress' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    status === 'completed' ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300' :
                    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                }`}>
                    {status.replace("_", " ")}
                </span>
            </div>
            
            <div className="flex flex-col gap-3 mt-4">
                {isDriverMode && status === "pending" && (
                    <button
                        onClick={onStartJourney}
                        className="group relative flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl bg-black font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] dark:bg-white dark:text-black"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            Start Journey
                            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </span>
                    </button>
                )}
                
                {isDriverMode && status === "in_progress" && destCoords && (
                    <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${destCoords[1]},${destCoords[0]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl bg-black font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] dark:bg-white dark:text-black"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                            Navigate (Google Maps)
                        </span>
                    </a>
                )}
                
                <button
                    onClick={onEndJourney}
                    className="h-14 w-full rounded-2xl bg-zinc-100 font-semibold text-zinc-900 transition hover:bg-red-50 hover:text-red-600 active:scale-[0.98] dark:bg-zinc-800 dark:text-white dark:hover:bg-red-900/20 dark:hover:text-red-400"
                >
                    {isDriverMode ? "End Journey" : "Leave Journey"}
                </button>
            </div>
        </div>
    );
}
