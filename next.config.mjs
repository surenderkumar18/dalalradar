// next.config.mjs
//
// 🔒 PROTECTION HARDENED CONFIG
//
// Applies multiple layers of light protection:
//   1. Disables source maps in production (no file structure exposed)
//   2. Strips console.* statements from production builds
//   3. Adds security headers (XSS, clickjacking protection)
//   4. Removes "Powered by Next.js" header
//
// This is the FAST PROTECTION layer — no extra packages needed.
// For full obfuscation, add webpack-obfuscator later (see OBFUSCATION_GUIDE.md).

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🔒 Disable source maps in production
  // Source maps let attackers reverse-engineer minified code
  productionBrowserSourceMaps: false,

  // 🔒 Don't reveal we're using Next.js
  poweredByHeader: false,

  // 🔒 Strip console.* statements from production builds
  // Keeps console.error and console.warn for actual debugging
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },

  // 🔒 Security headers — prevent common attacks
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent your site being framed (clickjacking protection)
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // Prevent MIME-type sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Don't leak referrer information
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Legacy XSS protection (still helps older browsers)
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // Enable DNS prefetch for faster loads
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
      // 🔒 No-cache for any data files
      {
        source: "/data/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow",
          },
        ],
      },
    ];
  },

  // 🔒 React strict mode for catching bugs early
  reactStrictMode: true,
};

export default nextConfig;
