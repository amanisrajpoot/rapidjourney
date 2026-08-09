"use client";

import { useState, useEffect } from "react";
import { apiClient } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

interface ProfileSheetProps {
  onClose: () => void;
}

export default function ProfileSheet({ onClose }: ProfileSheetProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await apiClient.get("/users/me");
      setName(data.name || "");
      setBio(data.bio || "");
      setWalletBalance(data.wallet_balance || 0);
    } catch (err: any) {
      toast.error(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const photo_url = name ? `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random` : null;
      await apiClient.patch("/users/me", { name, bio, photo_url });
      toast.success("Profile updated successfully!");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-zinc-900 animate-in slide-in-from-bottom duration-300 pointer-events-auto h-full max-h-[85vh] overflow-y-auto">
      <div className="sticky top-0 bg-white dark:bg-zinc-900 z-10 pb-4">
        <div className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Your Profile</h2>
            <button onClick={onClose} className="p-2 bg-zinc-100 rounded-full dark:bg-zinc-800">
                <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Build trust with other riders by completing your profile.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin dark:border-white"></div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-5 mt-4">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden shadow-inner flex items-center justify-center">
              {name ? (
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=128`} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-12 h-12 text-zinc-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-zinc-900 to-black dark:from-zinc-800 dark:to-zinc-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden mb-6">
            <div className="relative z-10">
              <p className="text-zinc-400 text-sm font-medium mb-1">Wallet Balance</p>
              <h3 className="text-4xl font-black">₹{walletBalance.toFixed(2)}</h3>
              <p className="text-xs text-zinc-500 mt-2">Available for your next ride or withdrawal</p>
            </div>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 dark:border-zinc-700 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all"
              placeholder="e.g. Jane Doe"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">About Me (Bio)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 dark:border-zinc-700 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all resize-none"
              placeholder="e.g. I love listening to podcasts and usually have a quiet ride."
              maxLength={500}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-black py-4 text-base font-bold text-white transition-transform hover:opacity-90 active:scale-[0.98] dark:bg-white dark:text-black disabled:opacity-70 flex justify-center items-center mt-8"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin dark:border-black"></div>
            ) : (
              "Save Profile"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
