import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
<<<<<<< HEAD
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8080/api/:path*",
=======
    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8081";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
>>>>>>> main
      },
    ];
  },
};

export default nextConfig;

