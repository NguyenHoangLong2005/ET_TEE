import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server for the Docker image (web/Dockerfile); `next dev` ignores it
  output: "standalone",
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

