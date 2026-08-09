"use client";
import React, { useState } from "react";
import { apiClient } from "../lib/api";
import { toast } from "react-hot-toast";
import useRazorpay from "react-razorpay";

interface Journey {
    id: string;
    origin_address: string;
    dest_address: string;
    price: number;
    available_seats: number;
    scheduled_at: string;
    host?: {
        name: string | null;
        photo_url: string | null;
        rating_avg: number;
    };
}

interface JourneyMatchesListProps {
    journeys: Journey[];
    onRequestSent?: () => void; // navigate to My Rides after requesting
}

export function JourneyMatchesList({ journeys, onRequestSent }: JourneyMatchesListProps) {
    const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const [Razorpay] = useRazorpay();

    const requestToJoin = async (id: string, price: number) => {
        setLoadingId(id);
        try {
            // 1. Create order on backend
            const orderRes = await apiClient.post(`/payments/create-order`, {
                journey_id: id,
                amount: price
            });
            const { order_id } = orderRes;

            // 2. Open Razorpay Checkout
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "", // fallback needed if not in env
                amount: (price * 100).toString(),
                currency: "INR",
                name: "Rapid Journey",
                description: "Ride Fare Payment",
                order_id: order_id,
                handler: async function (response: any) {
                    try {
                        // 3. Verify on backend
                        await apiClient.post(`/payments/verify`, {
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature
                        });
                        
                        setRequestedIds(prev => new Set([...prev, id]));
                        toast.success("Payment successful & request sent! 🎉");
                        setTimeout(() => {
                            onRequestSent?.();
                        }, 1200);
                    } catch (err: any) {
                        toast.error(err.message || "Failed to verify payment");
                    }
                },
                theme: {
                    color: "#000000",
                },
            };

            const rzp = new Razorpay(options);
            rzp.on("payment.failed", function (response: any) {
                toast.error(`Payment Failed: ${response.error.description}`);
            });
            rzp.open();
            
        } catch (err: any) {
            toast.error(err.message || "Failed to initiate payment");
        } finally {
            setLoadingId(null);
        }
    };

    if (journeys.length === 0) {
        return (
            <div className="w-full rounded-3xl bg-white dark:bg-zinc-900 p-8 shadow-2xl text-center">
                <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                </div>
                <p className="font-semibold text-zinc-700 dark:text-zinc-300 mb-1">No rides found nearby</p>
                <p className="text-sm text-zinc-400">Try expanding your search area or check back later.</p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-3">
            <div className="flex items-center justify-between px-1 mb-2">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{journeys.length} ride{journeys.length !== 1 ? 's' : ''} found nearby</h3>
            </div>
            {journeys.map((journey) => {
                const isRequested = requestedIds.has(journey.id);
                const isLoading = loadingId === journey.id;
                return (
                    <div key={journey.id} className="bg-white dark:bg-zinc-900 rounded-2xl shadow-md border border-zinc-100 dark:border-zinc-800 overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="p-4">
                            {/* Route */}
                            <div className="space-y-2 mb-3">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0 ring-4 ring-green-100 dark:ring-green-900/30" />
                                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 leading-tight">
                                        {journey.origin_address.split(',').slice(0, 2).join(',')}
                                    </p>
                                </div>
                                <div className="ml-1 w-px h-3 bg-zinc-200 dark:bg-zinc-700" />
                                <div className="flex items-start gap-3">
                                    <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0 ring-4 ring-red-100 dark:ring-red-900/30" />
                                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 leading-tight">
                                        {journey.dest_address.split(',').slice(0, 2).join(',')}
                                    </p>
                                </div>
                            </div>

                            {/* Meta row */}
                            <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mb-3 flex-wrap">
                                <span>🕐 {new Date(journey.scheduled_at).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="text-zinc-200 dark:text-zinc-700">•</span>
                                <span className="font-bold text-lg text-zinc-800 dark:text-white">₹{journey.price}</span>
                                <span className="text-zinc-200 dark:text-zinc-700">•</span>
                                <span>{journey.available_seats} seat{journey.available_seats !== 1 ? 's' : ''} left</span>
                            </div>

                            {/* Driver + action */}
                            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                {journey.host ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden flex-shrink-0">
                                            {journey.host.photo_url ? (
                                                <img src={journey.host.photo_url} alt="Driver" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300">
                                                    {(journey.host.name || "?")[0].toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{journey.host.name || "Anonymous"}</p>
                                            <p className="text-xs text-zinc-400">⭐ {journey.host.rating_avg.toFixed(1)}</p>
                                        </div>
                                    </div>
                                ) : <div />}

                                    <button
                                        onClick={() => requestToJoin(journey.id, journey.price)}
                                        disabled={isLoading || isRequested}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${isRequested
                                            ? 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 cursor-not-allowed'
                                            : 'bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 active:scale-95'
                                            }`}
                                    >
                                        {isLoading ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                            </svg>
                                            Sending…
                                        </span>
                                    ) : isRequested ? "✓ Requested" : "Request to Join"}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
