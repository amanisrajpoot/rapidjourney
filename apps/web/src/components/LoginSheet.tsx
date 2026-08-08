"use client";

import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { sendOtp } from "../lib/api";

interface LoginSheetProps {
  onClose: () => void;
}

export default function LoginSheet({ onClose }: LoginSheetProps) {
  const { loginWithOtp, loginGuest } = useAuth();
  
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [testOtp, setTestOtp] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setError("Please enter a valid phone number.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const response = await sendOtp(phone);
      if (response.otp) {
        setTestOtp(response.otp);
      }
      setStep("otp");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      setError("Please enter a valid code.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await loginWithOtp(phone, otp);
      onClose(); // Authentication successful
    } catch (err: any) {
      setError(err.message || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setError("");
    setLoading(true);
    try {
      await loginGuest();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to login as guest.");
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm transition-all duration-300">
      {/* Click outside to dismiss */}
      <div className="flex-1 w-full" onClick={onClose} />
      
      {/* Bottom Sheet */}
      <div className="w-full rounded-t-3xl bg-white p-6 pb-safe shadow-2xl dark:bg-zinc-900 transition-transform duration-300 ease-out translate-y-0">
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        
        {step === "phone" ? (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Get Started
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Enter your phone number to log in or create an account.
            </p>
            
            {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">{error}</div>}
            
            <div className="relative">
              <span className="absolute left-4 top-4 text-zinc-500">+91</span>
              <input
                type="tel"
                placeholder="Phone Number"
                className="w-full rounded-xl bg-zinc-100 p-4 pl-12 text-lg outline-none focus:ring-2 focus:ring-black dark:bg-zinc-800 dark:text-white dark:focus:ring-white transition-all"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center rounded-xl bg-black p-4 text-lg font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-black transition-transform active:scale-[0.98]"
            >
              {loading ? "Sending..." : "Continue"}
            </button>
            
            <div className="relative my-4 flex items-center py-2">
              <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
              <span className="mx-4 flex-shrink-0 text-sm text-zinc-400">or</span>
              <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
            </div>
            
            <button
              type="button"
              onClick={handleGuest}
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-zinc-100 p-4 font-medium text-zinc-900 disabled:opacity-50 dark:bg-zinc-800 dark:text-white transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700"
            >
              Continue as Guest
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep("phone")}
                className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <svg className="h-6 w-6 text-zinc-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Verify Code
              </h2>
            </div>
            
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Enter the 6-digit code sent to +91 {phone}
            </p>
            
            {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">{error}</div>}
            
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              className="w-full rounded-xl bg-zinc-100 p-4 text-center text-2xl tracking-[0.5em] outline-none focus:ring-2 focus:ring-black dark:bg-zinc-800 dark:text-white dark:focus:ring-white transition-all font-mono"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
              autoFocus
            />
            
            {testOtp && (
              <div className="mt-2 p-3 bg-blue-50 text-blue-800 rounded-xl text-center text-sm border border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                <span className="font-bold block mb-1">Testing Mode</span>
                Your OTP is: <span className="text-lg font-mono tracking-widest">{testOtp}</span>
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading || otp.length < 4}
              className="mt-4 flex w-full items-center justify-center rounded-xl bg-black p-4 text-lg font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-black transition-transform active:scale-[0.98]"
            >
              {loading ? "Verifying..." : "Verify & Continue"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
