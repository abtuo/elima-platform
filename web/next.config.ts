import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: path.resolve(process.cwd(), ".."),
  },
  async redirects() {
    const mobileAppUrl = (process.env.ELIMA_MOBILE_APP_URL || "https://app.elima.ci").replace(/\/$/, "");
    return [
      {
        source: "/signup/:path*",
        destination: `${mobileAppUrl}/auth/inscription`,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
