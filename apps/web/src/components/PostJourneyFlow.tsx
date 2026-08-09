"use client";
import React, { useState } from "react";
import { apiClient } from "../lib/api";
import { toast } from "react-hot-toast";
import { NominatimPlace } from "../lib/nominatim";

interface PostJourneyFlowProps {
    onSuccess?: () => void;
    onCancel?: () => void;
    originPlace: NominatimPlace;
    destPlace: NominatimPlace;
}

export function PostJourneyFlow({ onSuccess, onCancel, originPlace, destPlace }: PostJourneyFlowProps) {
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Radius of the earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        return R * c;
    };
    const [scheduleMode, setScheduleMode] = React.useState<"now" | "later">("now");
    const [price, setPrice] = useState("");
    const [seats, setSeats] = useState("3");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    React.useEffect(() => {
        const dist = calculateDistance(
            parseFloat(originPlace.lat), 
            parseFloat(originPlace.lon), 
            parseFloat(destPlace.lat), 
            parseFloat(destPlace.lon)
        );
        // Base fare: 20, per km: 10
        const suggestedPrice = Math.round(20 + dist * 10);
        setPrice(suggestedPrice.toString());
    }, [originPlace, destPlace]);

    const handleSubmit = async () => {
        if (!price) {
            toast.error("Please enter a price");
            return;
        }

        let finalDate = date;
        let finalTime = time;

        if (scheduleMode === "now") {
            const now = new Date();
            now.setMinutes(now.getMinutes() + 5);
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            finalDate = `${year}-${month}-${day}`;
            
            const hours = String(now.getHours()).padStart(2, '0');
            const mins = String(now.getMinutes()).padStart(2, '0');
            finalTime = `${hours}:${mins}`;
        } else {
            if (!date || !time) {
                toast.error("Please fill in date and time for later departures");
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const scheduled_at = new Date(`${finalDate}T${finalTime}`).toISOString();
            await apiClient.post("/journeys", {
                origin: { lat: parseFloat(originPlace.lat), lon: parseFloat(originPlace.lon) },
                origin_address: originPlace.display_name,
                destination: { lat: parseFloat(destPlace.lat), lon: parseFloat(destPlace.lon) },
                destination_address: destPlace.display_name,
                price: parseFloat(price),
                available_seats: parseInt(seats),
                max_participants: parseInt(seats),
                scheduled_at,
                vehicle_type: "car",
                journey_type: "car",
            });
            toast.success("Journey created successfully!");
            if (onSuccess) onSuccess();
        } catch (err: any) {
            toast.error(err.message || "Failed to create journey");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full rounded-3xl bg-white p-5 shadow-2xl dark:bg-zinc-900 animate-in slide-in-from-bottom duration-300">
            <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2">Offer a Ride</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                Fill in the details below to share your journey.
            </p>

            <div className="space-y-5">
                <div className="flex bg-zinc-100 p-1 rounded-2xl dark:bg-zinc-800">
                    <button
                        className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-all duration-300 ${
                            scheduleMode === "now" ? "bg-white shadow-md text-black dark:bg-zinc-700 dark:text-white" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                        }`}
                        onClick={() => setScheduleMode("now")}
                    >
                        Leave Now
                    </button>
                    <button
                        className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-all duration-300 ${
                            scheduleMode === "later" ? "bg-white shadow-md text-black dark:bg-zinc-700 dark:text-white" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                        }`}
                        onClick={() => setScheduleMode("later")}
                    >
                        Leave Later
                    </button>
                </div>

                {scheduleMode === "later" && (
                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 fade-in duration-200">
                        <div>
                            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Date</label>
                            <input 
                                type="date" 
                                className="w-full rounded-xl bg-zinc-100 p-4 text-base outline-none focus:ring-2 focus:ring-black dark:bg-zinc-800 dark:text-white dark:focus:ring-white transition-all"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Time</label>
                            <input 
                                type="time" 
                                className="w-full rounded-xl bg-zinc-100 p-4 text-base outline-none focus:ring-2 focus:ring-black dark:bg-zinc-800 dark:text-white dark:focus:ring-white transition-all"
                                value={time}
                                onChange={e => setTime(e.target.value)}
                            />
                        </div>
                    </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Available Seats</label>
                        <select 
                            className="w-full rounded-xl bg-zinc-100 p-4 text-base outline-none focus:ring-2 focus:ring-black dark:bg-zinc-800 dark:text-white dark:focus:ring-white transition-all appearance-none"
                            value={seats}
                            onChange={e => setSeats(e.target.value)}
                        >
                            {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} {n === 1 ? 'seat' : 'seats'}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Price (₹)</label>
                        <input 
                            type="number" 
                            className="w-full rounded-xl bg-zinc-100 p-4 text-base outline-none focus:ring-2 focus:ring-black dark:bg-zinc-800 dark:text-white dark:focus:ring-white transition-all"
                            placeholder="e.g. 500"
                            value={price}
                            onChange={e => setPrice(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <button 
                        className="flex-1 rounded-2xl bg-zinc-100 py-4 text-base font-bold text-zinc-900 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button 
                        className="flex-[2] rounded-2xl bg-black py-4 text-base font-bold text-white transition-transform hover:opacity-90 active:scale-[0.98] dark:bg-white dark:text-black flex items-center justify-center disabled:opacity-50"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : "Post Journey"}
                    </button>
                </div>
            </div>
        </div>
    );
}
