import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // In development: proxy /api/python/* to the local FastAPI server
  // In production: proxy /api/python/* to /api (which Vercel maps to api/index.py)
  rewrites: async () => {
    return [
      {
        source: "/api/python/:path*",
        destination:
          process.env.NODE_ENV === "development"
            ? "http://127.0.0.1:5328/api/python/:path*"
            : "/api",
      },
    ];
  },
};

export default nextConfig;
