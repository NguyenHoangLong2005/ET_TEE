import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server for the Docker image (web/Dockerfile); `next dev` ignores it
  output: "standalone",
  experimental: {
    // /api is proxied to the backend; Next's default 30 s cut off slow requests such as a
    // product import (each row is validated against the remote DB) with a bare 500.
    proxyTimeout: 180_000,
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8081";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

