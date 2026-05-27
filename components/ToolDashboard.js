"use client";

// components/ToolDashboard.js
//
// 🎛️ TOOL DASHBOARD — the main view at app.dalalradar.com root.
// 🎯 Uses --bg-header token for consistent header bg across all pages.

import { TOOLS } from "@/lib/tools";
import ToolCard from "./ToolCard";
import DashboardHeader from "@/app/components/DashboardHeader";
import SiteFooter from "@/components/SiteFooter";

export default function ToolDashboard() {
  const liveCount = TOOLS.filter((t) => t.status === "live").length;
  const soonCount = TOOLS.filter((t) => t.status === "soon").length;

  return (
    <div className="dashboard">
      {/* ─── HEADER ─── */}
      <nav className="nav">
        <div className="nav-inner">
          <DashboardHeader />
        </div>
      </nav>

      {/* ─── MAIN ─── */}
      <main className="dashboard-main">
        <div className="dashboard-inner">
          {/* WELCOME SECTION */}
          <div className="dashboard-welcome">
            <div className="dashboard-eyebrow">
              <span className="dashboard-eyebrow-dot"></span>
              Smart Money Toolkit · v1.0 beta
            </div>
            <h1 className="dashboard-headline">
              What's the <span className="dashboard-em">smart money</span> saying today?
            </h1>
            <p className="dashboard-subhead">
              {liveCount} {liveCount === 1 ? "tool" : "tools"} ready.{" "}
              {soonCount > 0 && (
                <>
                  <span style={{ color: "var(--gold)" }}>{soonCount}</span> in
                  the pipeline.
                </>
              )}{" "}
              Pick what you want to do with Dalal Street today.
            </p>
          </div>

          {/* TOOL GRID */}
          <div className="dashboard-grid">
            {TOOLS.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>

          {/* FOOTER NOTE */}
          <div className="dashboard-footer">
            <div className="dashboard-footer-line">
              <span className="dashboard-footer-label">METHODOLOGY</span>
              <span className="dashboard-footer-text">
                Money flow weights price × volume × delivery × OI. Patterns
                derived from cumulative behavior across 10-day windows.
              </span>
            </div>
            <div className="dashboard-footer-line">
              <span className="dashboard-footer-label">DATA</span>
              <span className="dashboard-footer-text">
                NSE F&O · 208 stocks · 21 sectors · refreshed end-of-day
              </span>
            </div>
            <div className="dashboard-footer-line">
              <span className="dashboard-footer-label">DISCLAIMER</span>
              <span className="dashboard-footer-text">
                For educational use. Not investment advice. Not SEBI-registered.
              </span>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
      <style jsx>{`
        .nav {
          position: sticky;
          top: 0;
          z-index: 99;
          background: rgba(11, 18, 32, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 2px solid var(--line);
        }
        .nav-inner {
          max-width: 1280px;
          margin: 0 auto;
          align-items: center;
          justify-content: space-between;
        }
        .dashboard {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
        }

        /* ─── HEADER ─── */
        .dashboard-header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: var(--bg-header, rgba(10, 10, 12, 0.85));
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--line);
        }

        .dashboard-header-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .dashboard-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-display-app);
          font-size: 22px;
          font-weight: 600;
          letter-spacing: -0.5px;
          color: var(--text);
          text-decoration: none;
        }

        .dashboard-logo-mark {
          display: inline-block;
          width: 28px;
          height: 28px;
          flex-shrink: 0;
        }

        .dashboard-logo-text {
          letter-spacing: 0.5px;
        }

        .dashboard-logo-em {
          color: var(--green);
          font-style: italic;
        }

        .dashboard-header-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-app);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1.5px;
          color: var(--gold);
        }

        .dashboard-pulse {
          width: 6px;
          height: 6px;
          background: var(--green);
          border-radius: 50%;
          box-shadow: 0 0 8px var(--green);
          animation: dashboardPulse 2s ease-in-out infinite;
        }

        @keyframes dashboardPulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.8);
          }
        }

        /* ─── MAIN ─── */
        .dashboard-main {
          padding: 80px 32px 60px;
        }

        .dashboard-inner {
          max-width: 1200px;
          margin: 0 auto;
        }

        /* ─── WELCOME ─── */
        .dashboard-welcome {
          margin-bottom: 60px;
        }

        .dashboard-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-app);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--green);
          margin-bottom: 24px;
          padding: 6px 12px;
          border: 1px solid rgba(0, 255, 162, 0.3);
          background: rgba(0, 255, 162, 0.05);
        }

        .dashboard-eyebrow-dot {
          width: 5px;
          height: 5px;
          background: var(--green);
          border-radius: 50%;
          box-shadow: 0 0 6px var(--green);
        }

        .dashboard-headline {
          font-family: var(--font-display-app);
          font-size: clamp(40px, 5vw, 64px);
          font-weight: 600;
          line-height: 1.05;
          letter-spacing: -2px;
          margin-bottom: 16px;
          color: var(--text);
        }

        .dashboard-em {
          font-style: italic;
          color: var(--green);
        }

        .dashboard-subhead {
          font-family: var(--font-app);
          font-size: 15px;
          line-height: 1.7;
          color: var(--text-dim);
          margin: 0;
        }

        /* ─── TOOL GRID ─── */
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 80px;
        }

        /* ─── FOOTER ─── */
        .dashboard-footer {
          padding-top: 32px;
          border-top: 1px solid var(--line);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .dashboard-footer-line {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          font-family: var(--font-app);
          font-size: 11px;
          line-height: 1.6;
          color: var(--text-mute);
        }

        .dashboard-footer-label {
          color: var(--green);
          font-weight: 600;
          letter-spacing: 1.5px;
          min-width: 110px;
        }

        .dashboard-footer-text {
          flex: 1;
        }

        /* ─── RESPONSIVE ─── */
        @media (max-width: 768px) {
          .dashboard-header-inner {
            padding: 14px 20px;
          }
          .dashboard-main {
            padding: 48px 20px 40px;
          }
          .dashboard-welcome {
            margin-bottom: 40px;
          }
          .dashboard-headline {
            font-size: 36px;
            letter-spacing: -1.2px;
          }
          .dashboard-grid {
            grid-template-columns: 1fr;
            gap: 12px;
            margin-bottom: 60px;
          }
          .dashboard-footer-line {
            flex-direction: column;
            gap: 4px;
          }
          .dashboard-footer-label {
            min-width: 0;
          }
        }
      `}</style>

      {/* ─── TOOL CARD STYLES (global so ToolCard can use them) ─── */}
      <style jsx global>{`
        .tool-card {
          display: block;
          background: var(--bg-2);
          border: 1px solid var(--line);
          padding: 28px 28px 24px;
          text-decoration: none;
          color: var(--text);
          transition: all 0.25s ease;
          position: relative;
          overflow: hidden;
        }

        .tool-card-live {
          cursor: pointer;
        }

        .tool-card-live:hover {
          background: var(--bg-3);
          border-color: var(--green);
          transform: translateY(-2px);
          box-shadow: 0 0 24px rgba(0, 255, 162, 0.12);
        }

        .tool-card-soon {
          opacity: 0.7;
          cursor: pointer;
        }

        .tool-card-soon:hover {
          opacity: 0.9;
          border-color: var(--line-2);
        }

        .tool-card-inner {
          display: flex;
          flex-direction: column;
          gap: 16px;
          height: 100%;
        }

        .tool-card-status {
          position: absolute;
          top: 16px;
          right: 16px;
        }

        .tool-card-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-family: var(--font-app);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 1.5px;
          padding: 3px 8px;
          border-radius: 2px;
        }

        .tool-card-icon {
          margin-bottom: 4px;
        }

        .tool-card-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .tool-card-title {
          font-family: var(--font-display-app);
          font-size: 28px;
          font-weight: 600;
          letter-spacing: -0.5px;
          line-height: 1.1;
          margin: 0;
          color: var(--text);
        }

        .tool-card-tagline {
          font-family: var(--font-app);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        .tool-card-desc {
          font-family: var(--font-app);
          font-size: 13px;
          line-height: 1.65;
          color: var(--text-dim);
          margin: 0;
        }

        .tool-card-features {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .tool-card-features li {
          font-family: var(--font-app);
          font-size: 12px;
          color: var(--text-mute);
          padding: 0;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          line-height: 1.5;
          list-style: none;
        }

        .tool-card-bullet {
          font-weight: 700;
          font-size: 14px;
          line-height: 1;
        }

        .tool-card-footer {
          margin-top: auto;
          padding-top: 16px;
          border-top: 1px solid var(--line);
        }

        .tool-card-cta {
          font-family: var(--font-app);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--green);
        }

        .tool-card-arrow {
          transition: transform 0.2s;
        }

        .tool-card-live:hover .tool-card-arrow {
          transform: translateX(4px);
        }

        .tool-card-cta-soon {
          font-family: var(--font-app);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--text-mute);
        }
      `}</style>
    </div>
  );
}
