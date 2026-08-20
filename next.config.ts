import type { NextConfig } from "next";

const supabaseHost = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
  .replace("https://", "")
  .replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/**" }]
      : [],
  },
  experimental: { optimizePackageImports: [] },
};

export default nextConfig;
