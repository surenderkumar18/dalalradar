// app/robots.js
//
// 🎯 Block search engines from indexing the app subdomain.
//
// This file lives in your Next.js app's `app/` directory.
// Next.js auto-generates robots.txt from it.
//
// Verify after deploy: visit https://app.dalalradar.com/robots.txt
// Should serve "User-agent: *  Disallow: /"

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
    // No sitemap on the app — sitemap lives on the landing site
  };
}