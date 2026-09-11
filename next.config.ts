import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // In development: proxy /api/python/* to the local FastAPI server
  // In production: no rewrite needed — Vercel routes /api/* directly to api/index.py
  rewrites: async () => {
    if (process.env.NODE_ENV === "development") {
      return [
        {
          source: "/api/python/:path*",
          destination: "http://127.0.0.1:5328/api/python/:path*",
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
