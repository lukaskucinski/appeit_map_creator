import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
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
