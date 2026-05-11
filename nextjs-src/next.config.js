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
  // Packages that must not be bundled — they load native/WASM binaries at
  // runtime and webpack tree-shaking breaks them.
  experimental: {
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core', 'mupdf', 'sharp'],
  },
  // Konva imports node-canvas for SSR fallback; we don't use SSR for canvas
  // components (all wrapped in dynamic({ ssr: false })), so alias it out.
  // Server-level redirect: avoids the prerendered-redirect bug where Next 14
  // caches a 307 response without a Location header (causes white screen +
  // "Application error: a client-side exception").
  async redirects() {
    return [
      { source: '/', destination: '/projects', permanent: false },
    ];
  },
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
