// app/page.js
//
// 🎯 TOOL DASHBOARD — root route of app.dalalradar.com
//
// METADATA HANDLING:
//   Only declare a custom title here. EVERYTHING ELSE (robots, openGraph,
//   twitter, themeColor) is inherited from app/layout.js so the home page
//   is correctly marked noindex and uses the right OG/Twitter cards.
//
//   ⚠️ DO NOT re-declare `description`, `openGraph`, `twitter`, or `robots`
//   here unless you also re-declare ALL of them — Next.js shallow-merges
//   metadata, and a partial override at the page level (esp. for `robots`)
//   has previously caused this page to show as `index, follow` instead of
//   the layout's `noindex, nofollow`. Inheriting from layout is the safe default.

import ToolDashboard from "@/components/ToolDashboard";

export const metadata = {
  // Title only — uses the template "%s · DalalRadar" from layout.js,
  // but `default` here overrides it cleanly for just the root route.
  title: "DalalRadar — Smart Money Tools",
};

export default function Home() {
  return <ToolDashboard />;
}