import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "*.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "*.flixcart.com",
      },
      { protocol: "https", 
        hostname: "static-assets-web.flixcart.com" 
      },
      // Amazon image CDNs (the host in your error is m.media-amazon.com, which
      // matches *.media-amazon.com; the ssl-images family covers images-na /
      // images-eu style URLs if you paste those too).
      {
        protocol: "https",
        hostname: "*.media-amazon.com",
      },
      {
        protocol: "https",
        hostname: "*.ssl-images-amazon.com",
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  allowedDevOrigins: ["10.24.128.75", "10.88.235.75", "localhost"],
};

export default nextConfig;