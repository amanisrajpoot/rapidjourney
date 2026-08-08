import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy all /api requests to the FastAPI backend so there are
  // zero cross-origin requests from the browser (no CORS preflight).
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
