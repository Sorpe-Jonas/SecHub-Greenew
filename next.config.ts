import type { NextConfig } from "next";
import { securityHeaders } from "@/lib/security";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["googleapis"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
