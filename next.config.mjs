// next.config.mjs
//
// 🔒 PROTECTION HARDENED CONFIG
//
// Applies multiple layers of light protection:
//   1. Disables source maps in production (no file structure exposed)
//   2. Strips console.* statements from production builds
//   3. Adds security headers (XSS, clickjacking protection)
//   4. Removes "Powered by Next.js" header
//   5. 🆕 Redirects dev-only tools to 404 on production
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

  // ─────────────────────────────────────────────────────────────────
  // 🚫 DEV-ONLY ROUTES — block on production (Vercel)
  // ─────────────────────────────────────────────────────────────────
  // Pages listed here ONLY work in `npm run dev`.
  // On production they return 404 via redirect.
  //
  // Add more dev-only routes here as you build internal tools:
  //   { source: "/tools/foo", destination: "/404", permanent: false },
  // ─────────────────────────────────────────────────────────────────
  async redirects() {
    // No redirects in dev — everything stays accessible
    if (process.env.NODE_ENV !== "production") {
      return [];
    }

    return [
      // 🚫 Internal filters tool — never expose on live site
      {
        source: "/tools/filters",
        destination: "/404",
        permanent: false, // false = 307 temporary, lets us re-enable later
      },
      // 🚫 Catch any sub-routes too (e.g., /tools/filters/foo)
      {
        source: "/tools/filters/:path*",
        destination: "/404",
        permanent: false,
      },
      // Add more dev-tool blocks here as needed
    ];
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
      // 🔒 No-index for dev tools (extra safety, even if redirect fails)
      {
        source: "/tools/filters/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, nosnippet, noarchive",
          },
        ],
      },
    ];
  },

  // 🔒 React strict mode for catching bugs early
  reactStrictMode: true,
};

export default nextConfig;
