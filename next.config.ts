import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: { dynamic: 0 },
    // הורדת Google Fonts דרך תעודות המערכת (פותר כשל TLS בפיתוח מקומי על Windows)
    turbopackUseSystemTlsCerts: true,
  },
};

export default nextConfig;
