import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: ["@elima/auth", "@elima/supabase-client"],
  turbopack: { root: path.resolve(process.cwd(), "../..") },
};

export default nextConfig;
