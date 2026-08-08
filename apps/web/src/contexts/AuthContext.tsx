"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { verifyOtp, loginAsGuest } from "../lib/api";

interface User {
  id: string; // Placeholder for now (parsed from JWT in future)
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

  useEffect(() => {
    // Check local storage on load
    const storedToken = sessionStorage.getItem("access_token");
    if (storedToken) {
      setToken(storedToken);
      setIsAuthenticated(true);
      setUser({ id: "existing-user" });
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
    setUser({ id: "new-user" });
  };

  const loginGuest = async () => {
    const data = await loginAsGuest();
    sessionStorage.setItem("access_token", data.access_token);
    sessionStorage.setItem("refresh_token", data.refresh_token);
    sessionStorage.setItem("is_guest", "true");
    setToken(data.access_token);
    setIsAuthenticated(true);
    setIsGuest(true);
    setUser({ id: "guest-user" });
  };

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
