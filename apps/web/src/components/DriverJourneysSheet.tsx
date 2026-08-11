"use client";
import React, { useEffect, useState } from "react";
import { apiClient } from "../lib/api";
import { toast } from "react-hot-toast";

interface Journey {
    id: string;
    origin_address: string;
    dest_address: string;
    price: number;
    available_seats: number;
    scheduled_at: string;
    status: string;
}

interface RideRequest {
    id: string;
    passenger_id: string;
    status: string;
    seats_requested: number;
    passenger?: {
        name: string | null;
        photo_url: string | null;
        rating_avg: number;
    };
}

interface DriverJourneysSheetProps {
    onClose: () => void;
    onStartRide: (journeyId: string) => void;
    onOpenChat: (journeyId: string, otherPartyName: string) => void;
}

export function DriverJourneysSheet({ onClose, onStartRide, onOpenChat }: DriverJourneysSheetProps) {
    const [journeys, setJourneys] = useState<Journey[]>([]);
    const [requestsByJourney, setRequestsByJourney] = useState<Record<string, RideRequest[]>>({});
    const [loading, setLoading] = useState(true);
    const [expandedJourneyId, setExpandedJourneyId] = useState<string | null>(null);

    useEffect(() => {
        fetchHostedJourneys();
    }, []);

    // Listen for global journey events to refresh the UI
    useEffect(() => {
        const handleJourneyEvent = (e: Event) => {
            const customEvent = e as CustomEvent;
            const msg = customEvent.detail.message;
            if (msg.type === "new_request" || msg.type === "request_cancelled") {
                fetchRequestsForJourney(customEvent.detail.journeyId);
            }
        };
        window.addEventListener("journey-event", handleJourneyEvent);
        return () => window.removeEventListener("journey-event", handleJourneyEvent);
    }, []);

    const fetchHostedJourneys = async () => {
        try {
            const data = await apiClient.get("/journeys/me/hosted");
            setJourneys(data || []);
        } catch (err: any) {
            toast.error(err.message || "Failed to load journeys");
        } finally {
            setLoading(false);
        }
    };

    const fetchRequestsForJourney = async (journeyId: string) => {
        try {
            const data = await apiClient.get(`/journeys/${journeyId}/requests`);
            setRequestsByJourney(prev => ({ ...prev, [journeyId]: data || [] }));
        } catch (err: any) {
            toast.error(err.message || "Failed to load requests");
        }
    };

    const toggleJourney = (journeyId: string) => {
        if (expandedJourneyId === journeyId) {
            setExpandedJourneyId(null);
        } else {
            setExpandedJourneyId(journeyId);
            if (!requestsByJourney[journeyId]) {
                fetchRequestsForJourney(journeyId);
            }
        }
    };

    const handleJourneyAction = async (journeyId: string, status: "cancelled" | "in_progress") => {
        try {
            await apiClient.patch(`/journeys/${journeyId}/status`, { status });
            toast.success(`Ride ${status}`);
            if (status === "in_progress") {
                onStartRide(journeyId);
            } else {
                fetchHostedJourneys(); // Refresh
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to cancel ride");
        }
    };

    const handleRequestAction = async (journeyId: string, requestId: string, status: "accepted" | "rejected") => {
        try {
            await apiClient.patch(`/journeys/${journeyId}/requests/${requestId}`, { status });
            toast.success(`Request ${status}`);
            fetchRequestsForJourney(journeyId); // Refresh
            fetchHostedJourneys(); // Refresh seats if accepted
        } catch (err: any) {
            toast.error(err.message || "Action failed");
        }
    };

    if (loading) {
        return (
            <div className="w-full rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900 animate-in slide-in-from-bottom flex justify-center items-center h-40">
                <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin dark:border-white"></div>
            </div>
        );
    }

    return (
        <div className="w-full max-h-[70vh] overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl dark:bg-zinc-900 animate-in slide-in-from-bottom duration-300">
            <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">My Hosted Rides</h2>
                <button onClick={onClose} className="p-2 bg-zinc-100 rounded-full dark:bg-zinc-800 hover:bg-zinc-200">
                    <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            {journeys.length === 0 ? (
                <div className="text-center p-6 bg-zinc-50 rounded-2xl dark:bg-zinc-800/50">
                    <p className="text-zinc-500">You haven't offered any rides yet.</p>
                </div>
            ) : (
                <div className="space-y-4 pb-10">
                    {journeys.map(journey => (
                        <div key={journey.id} className="border border-zinc-200 rounded-2xl overflow-hidden dark:border-zinc-700">
                            <div 
                                className="p-4 bg-zinc-50 cursor-pointer flex justify-between items-center hover:bg-zinc-100 transition-colors dark:bg-zinc-800/80 dark:hover:bg-zinc-800"
                                onClick={() => toggleJourney(journey.id)}
                            >
                                <div className="flex-1 pr-4">
                                    <p className="font-semibold text-sm truncate">{journey.origin_address.split(',')[0]} → {journey.dest_address.split(',')[0]}</p>
                                    <p className="text-xs text-zinc-500 mt-1">
                                        {new Date(journey.scheduled_at).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})} • {journey.available_seats} seats • <span className="capitalize">{journey.status}</span>
                                    </p>
                                </div>
                                <div>
                                    <svg className={`w-5 h-5 text-zinc-400 transition-transform ${expandedJourneyId === journey.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                            
                            {expandedJourneyId === journey.id && (
                                <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700">
                                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Passenger Requests</h4>
                                    
                                    {!requestsByJourney[journey.id] ? (
                                        <div className="text-sm text-zinc-500 text-center py-4 flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
                                            Loading...
                                        </div>
                                    ) : requestsByJourney[journey.id].length === 0 ? (
                                        <div className="text-sm text-zinc-500 text-center py-4 bg-zinc-50 rounded-xl border border-zinc-100 dark:bg-zinc-800/50 dark:border-zinc-800">No requests yet.</div>
                                    ) : (
                                        <div className="space-y-3">
                                            {requestsByJourney[journey.id].map(req => (
                                                <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-zinc-50 rounded-xl dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-zinc-200 overflow-hidden flex-shrink-0">
                                                            {req.passenger?.photo_url ? (
                                                                <img src={req.passenger.photo_url} alt="Passenger" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-zinc-300 text-zinc-600 font-bold">
                                                                    {(req.passenger?.name || "?")[0].toUpperCase()}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold">{req.passenger?.name || "Anonymous Passenger"}</p>
                                                            <p className="text-xs text-zinc-500 mt-0.5">⭐ {req.passenger?.rating_avg.toFixed(1) || "0.0"} • {req.seats_requested} seat(s) • <span className={`font-semibold ${req.status === 'accepted' ? 'text-green-500' : req.status === 'rejected' ? 'text-red-500' : 'text-orange-500'}`}>{req.status.charAt(0).toUpperCase() + req.status.slice(1)}</span></p>
                                                        </div>
                                                    </div>
                                                    {req.status === 'pending' && (
                                                        <div className="flex gap-2 self-end sm:self-auto">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleRequestAction(journey.id, req.id, "rejected"); }}
                                                                className="px-4 py-2 text-xs font-bold text-red-600 bg-red-100 rounded-lg hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition-colors"
                                                            >
                                                                Reject
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleRequestAction(journey.id, req.id, "accepted"); }}
                                                                className="px-4 py-2 text-xs font-bold text-white bg-green-500 rounded-lg hover:bg-green-600 shadow-sm transition-colors"
                                                            >
                                                                Accept
                                                            </button>
                                                        </div>
                                                    )}
                                                    {req.status === 'accepted' && (
                                                        <div className="flex gap-2 self-end sm:self-auto">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); onOpenChat(journey.id, req.passenger?.name || "Passenger"); }}
                                                                className="px-4 py-2 text-xs font-bold text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 transition-colors flex items-center gap-1"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                                                Chat
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    
                                    {journey.status === 'pending' && (
                                        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleJourneyAction(journey.id, "cancelled"); }}
                                                className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                                            >
                                                Cancel Ride
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleJourneyAction(journey.id, "in_progress"); }}
                                                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                                            >
                                                Start Ride
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
