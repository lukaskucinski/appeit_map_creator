import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // TODO(security-followup): re-enable strict type checking. Currently 15
    // pre-existing type errors block this: 8x missing '@types/geojson', 6x
    // invalid stage literals in lib/mock-processing.ts, and 1x null/undefined
    // mismatch in components/config-panel.tsx:175. Flipping this to false
    // without fixing those first would break the Vercel build.
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Security headers applied to all routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          // Baseline, non-breaking CSP hardening for the app shell. Deliberately
          // omits script-src/style-src (Next.js relies on inline scripts) to
          // avoid breakage; the /maps route sets a fuller policy of its own.
          { key: 'Content-Security-Policy', value: "object-src 'none'; base-uri 'self'; frame-ancestors 'self'" },
        ],
      },
    ]
  },
  // Turbopack resolver aliases for browser compatibility
  // sql.js (used by @ngageoint/geopackage) tries to require Node.js 'fs' module
  turbopack: {
    root: __dirname, // Set root to peit-app-homepage directory to prevent lockfile warning
    resolveAlias: {
      fs: { browser: './lib/empty-module.js' },
      path: { browser: './lib/empty-module.js' },
      crypto: { browser: './lib/empty-module.js' },
    },
  },
  webpack: (config, { isServer }) => {
    // sql.js (used by @ngageoint/geopackage) tries to require 'fs' on Node
    // This tells webpack to treat 'fs' as an empty module in the browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }
    }
    return config
  },
}

export default nextConfig
