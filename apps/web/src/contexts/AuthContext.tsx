"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { verifyOtp, loginAsGuest } from "../lib/api";
import { requestNotificationPermission } from "../lib/firebase";

interface User {
  id: string;
  name?: string;
  phone?: string;
  photo_url?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isGuest: boolean;
  isDriverMode: boolean;
  setDriverMode: (mode: boolean) => void;
  loginWithOtp: (phone: string, code: string) => Promise<void>;
  loginGuest: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isDriverMode, setDriverMode] = useState(false);

  const logout = () => {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    sessionStorage.removeItem("is_guest");
    setToken(null);
    setIsAuthenticated(false);
    setIsGuest(false);
    setUser(null);
    window.location.reload();
  };

  const fetchUser = async () => {
    try {
      const data = await apiClient.get('/users/me');
      setUser(data);
    } catch (err) {
      console.error("Failed to fetch user", err);
    }
  };

  useEffect(() => {
    // Check local storage on load
    const storedToken = sessionStorage.getItem("access_token");
    if (storedToken) {
      setToken(storedToken);
      setIsAuthenticated(true);
      fetchUser();
      if (sessionStorage.getItem("is_guest") === "true") {
        setIsGuest(true);
      }
    }

    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener("auth-unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("auth-unauthorized", handleUnauthorized);
    };
  }, []);

  const loginWithOtp = async (phone: string, code: string) => {
    const data = await verifyOtp(phone, code);
    sessionStorage.setItem("access_token", data.access_token);
    sessionStorage.setItem("refresh_token", data.refresh_token);
    sessionStorage.removeItem("is_guest");
    setToken(data.access_token);
    setIsAuthenticated(true);
    setIsGuest(false);
    
    // We must fetch the user details to get the real UUID
    try {
      const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/users/me`, {
        headers: { 'Authorization': `Bearer ${data.access_token}` }
      });
      if (userRes.ok) {
        setUser(await userRes.json());
      }
    } catch (e) {}
    
    // Request push token permission after login (needs user interaction context, which we have during login)
    setTimeout(() => requestNotificationPermission(), 1000);
  };

  const loginGuest = async () => {
    const data = await loginAsGuest();
    sessionStorage.setItem("access_token", data.access_token);
    sessionStorage.setItem("refresh_token", data.refresh_token);
    sessionStorage.setItem("is_guest", "true");
    setToken(data.access_token);
    setIsAuthenticated(true);
    setIsGuest(true);
    
    try {
      const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/users/me`, {
        headers: { 'Authorization': `Bearer ${data.access_token}` }
      });
      if (userRes.ok) {
        setUser(await userRes.json());
      }
    } catch (e) {}
    
    // Request push token permission after login
    setTimeout(() => requestNotificationPermission(), 1000);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, token, isGuest, isDriverMode, setDriverMode, loginWithOtp, loginGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
