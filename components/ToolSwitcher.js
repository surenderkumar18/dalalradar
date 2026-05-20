"use client";

// components/ToolSwitcher.js
//
// 🔀 TOOL SWITCHER — top nav tabs for switching between tools.
//
// Pulls tool list from lib/tools.js (single source of truth).
// Highlights the currently active tool based on URL.
// Soon tools are shown but disabled.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TOOLS } from "@/lib/tools";

export default function ToolSwitcher() {
  const pathname = usePathname();

  // Only show "tools" type entries in switcher (not Learn — that's separate nav)
  const toolList = TOOLS.filter((t) => t.id !== "learn");

  return (
    <div className="tool-switcher">
      <div className="tool-switcher-inner">
        {/* ─── LOGO (left) ─── */}
        <Link href="/" className="tool-switcher-logo">
          <span className="tool-switcher-logo-mark">
            <svg viewBox="0 0 28 28" width="24" height="24">
              <circle
                cx="14"
                cy="14"
                r="12"
                fill="none"
                stroke="var(--green)"
                strokeWidth="1.5"
                opacity="0.4"
              />
              <circle
                cx="14"
                cy="14"
                r="7"
                fill="none"
                stroke="var(--green)"
                strokeWidth="1.5"
                opacity="0.7"
              />
              <circle cx="14" cy="14" r="2.5" fill="var(--green)" />
            </svg>
          </span>
          <span className="tool-switcher-logo-text">
            Dalal<span className="tool-switcher-logo-em">Radar</span>
          </span>
        </Link>

        {/* ─── TOOL TABS (center) ─── */}
        <nav className="tool-switcher-tabs">
          {toolList.map((tool) => {
            const isActive = pathname?.startsWith(tool.href);
            const isLive = tool.status === "live" || tool.status === "beta";

            const tabContent = (
              <span className="tool-switcher-tab-content">
                <span className="tool-switcher-tab-name">{tool.name}</span>
                {!isLive && (
                  <span className="tool-switcher-tab-badge">SOON</span>
                )}
              </span>
            );

            return isLive ? (
              <Link
                key={tool.id}
                href={tool.href}
                className={`tool-switcher-tab ${isActive ? "active" : ""}`}
                style={isActive ? { borderBottomColor: tool.accent } : {}}
              >
                {tabContent}
              </Link>
            ) : (
              <span
                key={tool.id}
                className="tool-switcher-tab disabled"
                title={`${tool.name} coming soon`}
              >
                {tabContent}
              </span>
            );
          })}
        </nav>

        {/* ─── RIGHT SIDE (links to learn + status) ─── */}
        <div className="tool-switcher-right">
          <Link
            href="/learn"
            className={`tool-switcher-link ${
              pathname?.startsWith("/learn") ? "active" : ""
            }`}
          >
            Learn
          </Link>
          <div className="tool-switcher-status">
            <span className="tool-switcher-pulse"></span>
            <span>LIVE</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .tool-switcher {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(10, 10, 12, 0.92);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--line);
        }

        .tool-switcher-inner {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          gap: 32px;
          height: 56px;
        }

        /* ─── LOGO ─── */
        .tool-switcher-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          color: var(--text);
        }

        .tool-switcher-logo-mark {
          display: inline-flex;
          align-items: center;
        }

        .tool-switcher-logo-text {
          font-family: var(--font-display-app);
          font-size: 17px;
          font-weight: 600;
          letter-spacing: -0.3px;
        }

        .tool-switcher-logo-em {
          color: var(--green);
          font-style: italic;
        }

        /* ─── TABS ─── */
        .tool-switcher-tabs {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1;
          margin-left: 16px;
        }

        .tool-switcher-tab {
          display: flex;
          align-items: center;
          padding: 16px 14px;
          font-family: var(--font-app);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: var(--text-dim);
          text-decoration: none;
          border-bottom: 2px solid transparent;
          transition: all 0.2s ease;
          cursor: pointer;
          position: relative;
        }

        .tool-switcher-tab:hover:not(.disabled) {
          color: var(--text);
        }

        .tool-switcher-tab.active {
          color: var(--text);
          border-bottom-color: var(--green); /* overridden inline per tool */
        }

        .tool-switcher-tab.disabled {
          color: var(--text-mute);
          cursor: not-allowed;
          opacity: 0.6;
        }

        .tool-switcher-tab-content {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .tool-switcher-tab-badge {
          font-size: 9px;
          padding: 1px 5px;
          background: rgba(100, 116, 139, 0.2);
          color: var(--text-mute);
          letter-spacing: 1px;
          border-radius: 2px;
        }

        /* ─── RIGHT SIDE ─── */
        .tool-switcher-right {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .tool-switcher-link {
          font-family: var(--font-app);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: var(--text-dim);
          text-decoration: none;
          transition: color 0.2s;
        }

        .tool-switcher-link:hover,
        .tool-switcher-link.active {
          color: var(--text);
        }

        .tool-switcher-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-app);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 1.5px;
          color: var(--green);
        }

        .tool-switcher-pulse {
          width: 5px;
          height: 5px;
          background: var(--green);
          border-radius: 50%;
          box-shadow: 0 0 6px var(--green);
          animation: switcherPulse 2s ease-in-out infinite;
        }

        @keyframes switcherPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }

        /* ─── RESPONSIVE ─── */
        @media (max-width: 900px) {
          .tool-switcher-inner {
            padding: 0 16px;
            gap: 16px;
          }
          .tool-switcher-tabs {
            margin-left: 8px;
            overflow-x: auto;
            scrollbar-width: none;
          }
          .tool-switcher-tabs::-webkit-scrollbar {
            display: none;
          }
          .tool-switcher-tab {
            padding: 16px 10px;
            white-space: nowrap;
          }
          .tool-switcher-link {
            display: none;
          }
        }

        @media (max-width: 600px) {
          .tool-switcher-logo-text {
            font-size: 14px;
          }
          .tool-switcher-status {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}