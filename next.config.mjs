// next.config.mjs
//
// 🔒 PROTECTION HARDENED CONFIG
//
// Applies multiple layers of light protection:
//   1. Disables source maps in production (no file structure exposed)
//   2. Strips console.* statements from production builds
//   3. Adds security headers (XSS, clickjacking protection)
//   4. Removes "Powered by Next.js" header
//   5. Redirects dev-only tools to 404 on production
//   6. 🆕 CORS headers for /api/* (allows landing → app cross-subdomain POST)
//
// This is the FAST PROTECTION layer — no extra packages needed.

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🔒 Disable source maps in production
  productionBrowserSourceMaps: false,

  // 🔒 Don't reveal we're using Next.js
  poweredByHeader: false,

  // 🔒 Strip console.* statements from production builds
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
  async redirects() {
    if (process.env.NODE_ENV !== "production") {
      return [];
    }

    return [
      // 🚫 Internal filters tool — never expose on live site
      {
        source: "/tools/filters",
        destination: "/404",
        permanent: false,
      },
      {
        source: "/tools/filters/:path*",
        destination: "/404",
        permanent: false,
      },
    ];
  },

  // 🔒 Security headers — prevent common attacks
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },

      // ──────────────────────────────────────────────────────────────
      // 🆕 CORS for /api/* — lets dalalradar.com (landing) POST to
      // app.dalalradar.com/api/contact for the contact form.
      //
      // route.js sets the precise Access-Control-Allow-Origin per
      // request (with origin allowlist). These headers provide the
      // method/headers allowance + preflight cache. Do NOT add
      // Access-Control-Allow-Origin here — route.js handles it
      // dynamically based on origin allowlist.
      // ──────────────────────────────────────────────────────────────
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "false" },
          { key: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },

      // 🔒 No-cache for any data files
      {
        source: "/data/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },

      // 🔒 No-index for dev tools (extra safety)
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
