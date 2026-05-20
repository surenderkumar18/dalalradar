// app/tools/page.js
//
// 🎯 TOOLS INDEX — when user navigates to /tools (no specific tool)
//
// Redirects to the main dashboard at "/" since that's where users
// pick a tool. Could alternatively show a tool picker here, but
// the dashboard already does that job.

import { redirect } from "next/navigation";

export default function ToolsIndex() {
  redirect("/");
}