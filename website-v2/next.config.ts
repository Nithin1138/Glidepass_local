import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: "/mac",
        destination: "/install-mac.sh",
        permanent: true,
      },
      {
        source: "/win",
        destination: "/install-windows.ps1",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
