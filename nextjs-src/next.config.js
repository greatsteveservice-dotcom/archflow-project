/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output: produces .next/standalone/server.js which is a
  // self-contained Node.js server (minus node_modules of deps marked
  // external). Used for deploying to a Russian VPS to bypass Netlify
  // (which is blocked by some RU ISPs on Cloudflare Free-tier edges).
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.beget.app',
      },
    ],
  },
};

module.exports = nextConfig;
