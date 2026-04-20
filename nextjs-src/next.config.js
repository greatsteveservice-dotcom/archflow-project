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
      {
        protocol: 'https',
        hostname: 'db.archflow.ru',
      },
    ],
  },
  // @sparticuz/chromium and puppeteer-core must not be bundled — they load
  // native binaries at runtime and expect to be found in node_modules.
  experimental: {
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  },
  // Konva imports node-canvas for SSR fallback; we don't use SSR for canvas
  // components (all wrapped in dynamic({ ssr: false })), so alias it out.
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    if (isServer) {
      // Ensure puppeteer-core and @sparticuz/chromium stay external in server bundle
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('@sparticuz/chromium', 'puppeteer-core');
      }
    }
    return config;
  },
};

module.exports = nextConfig;
