import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.google.com",
        pathname: "/s2/favicons**",
      },
    ],
  },
  experimental: {
    // Carga solo los iconos usados en vez del paquete completo.
    optimizePackageImports: ["@tabler/icons-react"],
  },
};

export default nextConfig;
