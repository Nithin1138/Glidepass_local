import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
