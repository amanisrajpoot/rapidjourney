"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import LoginSheet from "../components/LoginSheet";

// Dynamically import the map so it only loads on the client side (avoid SSR issues with MapLibre)
const InteractiveMap = dynamic(() => import("../components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-zinc-100 dark:bg-zinc-900">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-black dark:border-zinc-700 dark:border-t-white" />
    </div>
  ),
});

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [destination, setDestination] = useState("");
  const [showLogin, setShowLogin] = useState(false);

  const handleSearchFocus = () => {
    if (!isAuthenticated) {
      setShowLogin(true);
    }
  };

  return (
    <main className="relative flex h-full w-full flex-col">
      {/* Map Background layer */}
      <div className="absolute inset-0 z-0">
        <InteractiveMap />
      </div>

      {/* Floating UI Layer (Safe areas for mobile) */}
      <div className="pointer-events-none relative z-10 flex h-full w-full flex-col justify-between p-4 pb-8 safe-area-top safe-area-bottom">
        
        {/* Top Bar (Hamburger menu / Profile) */}
        <div className="flex w-full items-center justify-between">
          <button className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg dark:bg-zinc-800">
            <svg
              className="h-6 w-6 text-zinc-800 dark:text-zinc-100"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Bottom Sheet Area */}
        <div className="pointer-events-auto flex w-full flex-col gap-4">
          <div className="flex w-full flex-col rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
            <h1 className="mb-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Where are you going?
            </h1>
            
            {/* Search Input Simulation */}
            <div className="flex items-center rounded-xl bg-zinc-100 p-4 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700">
              <svg
                className="mr-3 h-5 w-5 text-zinc-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search destination"
                className="w-full bg-transparent text-lg outline-none placeholder:text-zinc-500 dark:text-white"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                onFocus={handleSearchFocus}
              />
            </div>
            
            <div className="mt-6 flex justify-around">
              <button className="flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-xl dark:bg-zinc-800">
                  🏠
                </div>
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Home</span>
              </button>
              <button className="flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-xl dark:bg-zinc-800">
                  💼
                </div>
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Work</span>
              </button>
              <button className="flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-xl dark:bg-zinc-800">
                  📍
                </div>
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Saved</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Login Modal Overlay */}
      {showLogin && !isAuthenticated && (
        <LoginSheet onClose={() => setShowLogin(false)} />
      )}
    </main>
  );
}
