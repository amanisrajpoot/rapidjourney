import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow mobile testing on LAN
  allowedDevOrigins: ["192.168.1.15", "192.168.1.16", "192.168.1.17", "192.168.1.18", "192.168.1.19"],
  // Proxy all /api requests to the FastAPI backend so there are
  // zero cross-origin requests from the browser (no CORS preflight).
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: process.env.API_URL 
            ? `${process.env.API_URL}/api/:path*` 
            : "http://journey-api:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
