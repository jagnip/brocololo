import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Parent /Users/jagoda/Dev has a stray package-lock.json; without this, Turbopack
// picks the wrong workspace root and RSC chunks (e.g. loading skeletons) fail to compile.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  logging: {
    fetches: {
      fullUrl: true,
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '693ddb9df55f1be79303da63.mockapi.io',
      },
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};



export default nextConfig;
