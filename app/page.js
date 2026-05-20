// app/page.js
//
// 🎯 STEP 2 OF REFACTOR — Tool Dashboard
//
// BEFORE: Random redirect to /MarketStructure
//   import { redirect } from 'next/navigation';
//   export default function Home() {
//     redirect('/MarketStructure');
//   }
//
// AFTER: Proper tool dashboard that:
//   ✅ Shows all DalalRadar tools as cards
//   ✅ Distinguishes "live" vs "soon" tools
//   ✅ Lets users pick what they want to do
//   ✅ Auto-updates when you add new tools to lib/tools.js

import ToolDashboard from "@/components/ToolDashboard";

export const metadata = {
  title: "DalalRadar — Smart Money Tools",
  description:
    "Your dashboard of smart money tools for Dalal Street. BubbleChart for institutional flow, Rollover for F&O analytics, and more.",
};

export default function Home() {
  return <ToolDashboard />;
}