"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { verifyOtp, loginAsGuest } from "../lib/api";

interface User {
  id: string; // Placeholder for now (parsed from JWT in future)
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loginWithOtp: (phone: string, code: string) => Promise<void>;
  loginGuest: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check local storage on load
    const token = localStorage.getItem("access_token");
    if (token) {
      setIsAuthenticated(true);
      setUser({ id: "existing-user" });
    }
  }, []);

  const loginWithOtp = async (phone: string, code: string) => {
    const data = await verifyOtp(phone, code);
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    setIsAuthenticated(true);
    setUser({ id: "new-user" });
  };

  const loginGuest = async () => {
    const data = await loginAsGuest();
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    setIsAuthenticated(true);
    setUser({ id: "guest-user" });
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loginWithOtp, loginGuest, logout }}>
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
