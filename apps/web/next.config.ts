import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  transpilePackages: ["@gorev/shared"],
  // Tarayıcı aynı kökenden /api'ye istek atar; Next bunu API sunucusuna iletir.
  // Böylece oturum çerezi sorunsuz çalışır ve CORS gerekmez.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
