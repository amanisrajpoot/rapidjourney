"use client";
import React, { useState } from "react";
import { apiClient } from "../lib/api";
import { toast } from "react-hot-toast";

interface RatingModalProps {
    journeyId: string;
    onClose: () => void;
}

export function RatingModal({ journeyId, onClose }: RatingModalProps) {
    const [stars, setStars] = useState(0);
    const [hoverStars, setHoverStars] = useState(0);
    const [comment, setComment] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (stars === 0) {
            toast.error("Please select a star rating");
            return;
        }
        setLoading(true);
        try {
            await apiClient.post(`/journeys/${journeyId}/rate`, {
                stars,
                comment: comment.trim() || undefined
            });
            toast.success("Thanks for your feedback!");
            onClose();
        } catch (err: any) {
            toast.error(err.message || "Failed to submit rating");
            onClose(); // Close anyway if already rated
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                        🎉
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">You arrived!</h2>
                    <p className="text-zinc-500 dark:text-zinc-400">How was your journey?</p>
                </div>

                <div className="flex justify-center gap-2 mb-6">
                    {[1, 2, 3, 4, 5].map((s) => (
                        <button
                            key={s}
                            onMouseEnter={() => setHoverStars(s)}
                            onMouseLeave={() => setHoverStars(0)}
                            onClick={() => setStars(s)}
                            className="p-1 focus:outline-none transition-transform hover:scale-110"
                        >
                            <svg 
                                className={`w-10 h-10 transition-colors ${(hoverStars || stars) >= s ? "text-amber-400" : "text-zinc-200 dark:text-zinc-800"}`} 
                                fill="currentColor" 
                                viewBox="0 0 20 20"
                            >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                        </button>
                    ))}
                </div>

                <div className="mb-6">
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Leave a comment (optional)"
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow resize-none h-24"
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-sm font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 dark:text-zinc-400 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl transition-colors"
                    >
                        Skip
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || stars === 0}
                        className="flex-1 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors shadow-lg shadow-blue-600/20"
                    >
                        {loading ? "Submitting..." : "Submit"}
                    </button>
                </div>
            </div>
        </div>
    );
}
