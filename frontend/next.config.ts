import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow local network IP access (prevents 403 on chunks and HMR in dev)
  allowedDevOrigins: [
    "localhost:3000",
    "127.0.0.1:3000",
    "192.168.56.1:3000",
    "192.168.56.1",
  ],
  async rewrites() {
    return [
      {
        source: "/backend-api/:path*",
        destination: "http://127.0.0.1:8081/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
