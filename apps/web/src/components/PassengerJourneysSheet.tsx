import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { apiClient } from "../lib/api";

interface RideRequest {
    id: string;
    status: string; // pending | accepted | rejected | cancelled
    seats_requested: number;
    created_at: string;
    journey: {
        id: string;
        origin_address: string;
        dest_address: string;
        scheduled_at: string;
        price: number;
        status: string;
        host?: {
            name: string | null;
            photo_url: string | null;
            rating_avg: number;
        };
    };
}

interface PassengerJourneysSheetProps {
    onClose: () => void;
    onTrackRide: (journeyId: string) => void;
    onOpenChat: (journeyId: string, otherPartyName: string) => void;
}

const STATUS_STYLES: Record<string, string> = {
    pending:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    accepted:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    rejected:  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    cancelled: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

const STATUS_LABELS: Record<string, string> = {
    pending:   "⏳ Pending",
    accepted:  "✅ Accepted",
    rejected:  "❌ Rejected",
    cancelled: "🚫 Cancelled",
};

export function PassengerJourneysSheet({ onClose, onTrackRide, onOpenChat }: PassengerJourneysSheetProps) {
    const [requests, setRequests] = useState<RideRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<string | null>(null);

    const fetchMyRequests = async () => {
        try {
            setLoading(true);
            const data = await apiClient.get("/journeys/me/requests");
            setRequests(data || []);
        } catch (err: any) {
            toast.error(err.message || "Failed to load your requests");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyRequests();
    }, []);

    // Listen for global journey events to refresh the UI
    useEffect(() => {
        const handleJourneyEvent = () => fetchMyRequests();
        window.addEventListener("journey-event", handleJourneyEvent);
        return () => window.removeEventListener("journey-event", handleJourneyEvent);
    }, []);

    const handleCancel = async (req: RideRequest) => {
        setCancellingId(req.id);
        try {
            await apiClient.delete(`/journeys/${req.journey.id}/requests/${req.id}`);
            toast.success("Request cancelled");
            fetchMyRequests();
        } catch (err: any) {
            toast.error(err.message || "Failed to cancel request");
        } finally {
            setCancellingId(null);
        }
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[75vh] max-h-[650px] border border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-bottom-8 duration-300">
            {/* Header */}
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur sticky top-0 z-10">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">My Rides</h2>
                    <p className="text-sm text-zinc-500">Rides you've requested to join</p>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-full transition-colors"
                >
                    <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex-1 space-y-3 p-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-36 rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                    ))}
                </div>
            ) : requests.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
                    <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="font-semibold text-zinc-700 dark:text-zinc-300 mb-1">No ride requests yet</p>
                    <p className="text-sm text-zinc-400">Find a ride and request to join!</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {requests.map(req => (
                        <div key={req.id} className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700 shadow-sm overflow-hidden">
                            {/* Status bar */}
                            <div className={`px-4 py-2 flex items-center justify-between ${STATUS_STYLES[req.status] || STATUS_STYLES.pending}`}>
                                <span className="text-xs font-bold tracking-wide">{STATUS_LABELS[req.status] || req.status.toUpperCase()}</span>
                                <span className="text-xs opacity-70">{new Date(req.created_at).toLocaleDateString()}</span>
                            </div>

                            <div className="p-4">
                                {/* Journey route */}
                                <div className="space-y-2 mb-3">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 leading-tight">
                                            {req.journey.origin_address.split(',').slice(0, 2).join(',')}
                                        </p>
                                    </div>
                                    <div className="ml-1 w-px h-4 bg-zinc-200 dark:bg-zinc-600" />
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 leading-tight">
                                            {req.journey.dest_address.split(',').slice(0, 2).join(',')}
                                        </p>
                                    </div>
                                </div>

                                {/* Time + price */}
                                <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                                    <span>🕐 {new Date(req.journey.scheduled_at).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="text-zinc-300 dark:text-zinc-600">•</span>
                                    <span className="font-semibold text-zinc-700 dark:text-zinc-200">₹{req.journey.price}</span>
                                    <span className="text-zinc-300 dark:text-zinc-600">•</span>
                                    <span>{req.seats_requested} seat{req.seats_requested > 1 ? 's' : ''}</span>
                                </div>

                                {/* Driver info */}
                                {req.journey.host && (
                                    <div className="flex items-center gap-2 py-2 border-t border-zinc-100 dark:border-zinc-700">
                                        <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden flex-shrink-0">
                                            {req.journey.host.photo_url ? (
                                                <img src={req.journey.host.photo_url} alt="Driver" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300">
                                                    {(req.journey.host.name || "?")[0].toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">{req.journey.host.name || "Anonymous Driver"}</p>
                                            <p className="text-xs text-zinc-400">⭐ {req.journey.host.rating_avg.toFixed(1)}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2 mt-3">
                                    {req.status === "pending" && (
                                        <button
                                            onClick={() => handleCancel(req)}
                                            disabled={cancellingId === req.id}
                                            className="flex-1 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-xl transition-colors disabled:opacity-50"
                                        >
                                            {cancellingId === req.id ? "Cancelling…" : "Cancel Request"}
                                        </button>
                                    )}
                                    {(req.status === "accepted" || req.journey.status === "in_progress") && (
                                        <>
                                            {req.journey.status === "in_progress" && (
                                                <button
                                                    onClick={() => { onTrackRide(req.journey.id); onClose(); }}
                                                    className="flex-1 py-2 text-xs font-bold text-white bg-black dark:bg-white dark:text-black rounded-xl hover:opacity-80 transition-opacity"
                                                >
                                                    Track Ride
                                                </button>
                                            )}
                                            <button
                                                onClick={() => { onOpenChat(req.journey.id, req.journey.host?.name || "Driver"); onClose(); }}
                                                className="flex-1 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 rounded-xl transition-colors flex items-center justify-center gap-1"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                                </svg>
                                                Chat
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
