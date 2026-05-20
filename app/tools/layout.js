// app/tools/layout.js
//
// 🎯 TOOLS LAYOUT — wraps every page under /tools/*
//
// Renders:
//   1. Top header with logo + tool switcher tabs
//   2. The actual tool content (passed as children)
//
// Every tool (BubbleChart, Rollover, Heatmap) gets this layout automatically.
// No need to duplicate the header in each tool's page.js.

import ToolSwitcher from "@/components/ToolSwitcher";
import { UserPlanProvider } from "@/context/UserPlanContext";

export const metadata = {
  title: "Tools",
};

export default function ToolsLayout({ children }) {
  return (
    <UserPlanProvider>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg)",
        }}
      >
        {/*<ToolSwitcher /> */}
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          {children}
        </main>
      </div>
    </UserPlanProvider>
  );
}
