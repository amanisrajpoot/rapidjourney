"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiClient } from "../lib/api";
import { toast } from "react-hot-toast";

export function GlobalJourneyListener() {
    const { token, isAuthenticated } = useAuth();
    const activeSockets = useRef<Record<string, WebSocket>>({});

    useEffect(() => {
        if (!isAuthenticated || !token) return;

        const connectToJourney = (journeyId: string) => {
            if (activeSockets.current[journeyId]) return; // Already connected

            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            const wsUrl = `${protocol}//${host}/api/v1/ws/${journeyId}?token=${token}`;
            const ws = new WebSocket(wsUrl);

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    
                    // Dispatch a global event so any component can react
                    window.dispatchEvent(new CustomEvent("journey-event", { 
                        detail: { journeyId, message: msg } 
                    }));

                    // Handle global UI toasts for critical events
                    if (msg.type === "new_request") {
                        toast.success(`🙋 ${msg.data.passenger_name} wants to join your ride!`, { duration: 6000 });
                    } else if (msg.type === "request_updated") {
                        if (msg.data.new_status === "accepted") {
                            toast.success("✅ Your ride request was accepted!", { duration: 6000 });
                        } else if (msg.data.new_status === "rejected") {
                            toast.error("❌ Your ride request was declined.", { duration: 6000 });
                        }
                    } else if (msg.type === "status_update") {
                        if (msg.data.status === "in_progress") {
                            toast.success("🚗 Ride has started! Live tracking enabled.");
                        } else if (msg.data.status === "completed") {
                            toast.success("🏁 Ride completed.");
                        }
                    } else if (msg.type === "chat_message") {
                        // Only toast if chat is likely closed (you'd ideally check if chat is open, but simple toast is fine)
                    }
                } catch (e) {}
            };

            ws.onclose = () => {
                delete activeSockets.current[journeyId];
            };

            activeSockets.current[journeyId] = ws;
        };

        const fetchAndConnect = async () => {
            try {
                // Fetch hosted journeys (Driver mode)
                const hosted = await apiClient.get("/journeys/me/hosted");
                if (Array.isArray(hosted)) {
                    hosted.forEach(j => {
                        if (j.status !== "completed" && j.status !== "cancelled") {
                            connectToJourney(j.id);
                        }
                    });
                }

                // Fetch requested journeys (Passenger mode)
                const requests = await apiClient.get("/journeys/me/requests");
                if (Array.isArray(requests)) {
                    requests.forEach(r => {
                        if (r.journey && r.journey.status !== "completed" && r.journey.status !== "cancelled") {
                            connectToJourney(r.journey.id);
                        }
                    });
                }
            } catch (e) {
                console.error("Failed to fetch journeys for WebSocket listener", e);
            }
        };

        // Initial fetch
        fetchAndConnect();

        // Poll every 15 seconds to pick up newly created journeys 
        // (since we wouldn't have a WS connection yet for a journey just created on another device)
        const interval = setInterval(fetchAndConnect, 15000);

        return () => {
            clearInterval(interval);
            // Cleanup all sockets on unmount
            Object.values(activeSockets.current).forEach(ws => ws.close());
            activeSockets.current = {};
        };
    }, [isAuthenticated, token]);

    return null; // This is a silent background component
}
