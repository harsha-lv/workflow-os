import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "openai", "postgres", "viem"],
  poweredByHeader: false,
  typedRoutes: false,
};

export default nextConfig;
