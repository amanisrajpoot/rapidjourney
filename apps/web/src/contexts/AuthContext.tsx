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
  const [isDriverMode, setDriverMode] = useState(false);

  useEffect(() => {
    // Check local storage on load
    const storedToken = localStorage.getItem("access_token");
    if (storedToken) {
      setToken(storedToken);
      setIsAuthenticated(true);
      setUser({ id: "existing-user" });
    }
  }, []);

  const loginWithOtp = async (phone: string, code: string) => {
    const data = await verifyOtp(phone, code);
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    setToken(data.access_token);
    setIsAuthenticated(true);
    setUser({ id: "new-user" });
  };

  const loginGuest = async () => {
    const data = await loginAsGuest();
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    setToken(data.access_token);
    setIsAuthenticated(true);
    setUser({ id: "guest-user" });
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setToken(null);
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, token, isDriverMode, setDriverMode, loginWithOtp, loginGuest, logout }}>
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
