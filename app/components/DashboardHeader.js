// app/components/DashboardHeader.js
//
// 🎯 Uses CSS variables from globals.css:
//    --green:        #00ffa2 (mint brand)
//    --font-display: Fraunces
//    --font-mono:    JetBrains Mono

"use client";

export default function DashboardHeader({ children }) {
  return (
    <div className="dr-nav">
      {/* LEFT: Logo */}
      <a href="https://dalalradar.com" className="dashboard-logo">
        <span className="dashboard-logo-mark">
          <svg viewBox="0 0 28 28" width="100%" height="100%">
            <circle cx="14" cy="14" r="12" fill="none" stroke="var(--green)" strokeWidth="1.5" opacity="0.4" />
            <circle cx="14" cy="14" r="7" fill="none" stroke="var(--green)" strokeWidth="1.5" opacity="0.7" />
            <circle cx="14" cy="14" r="2.5" fill="var(--green)" />
            <line x1="14" y1="2" x2="14" y2="6" stroke="var(--green)" strokeWidth="1" />
            <line x1="14" y1="22" x2="14" y2="26" stroke="var(--green)" strokeWidth="1" />
            <line x1="2" y1="14" x2="6" y2="14" stroke="var(--green)" strokeWidth="1" />
            <line x1="22" y1="14" x2="26" y2="14" stroke="var(--green)" strokeWidth="1" />
          </svg>
        </span>
        <span className="dashboard-logo-text">
          Dalal<span className="dashboard-logo-em">Radar</span>
        </span>
      </a>

      {/* MIDDLE: Tool-specific controls */}
      <div className="dr-tool-controls">{children}</div>

      {/* RIGHT: Nav links + Launch button */}
      <div className="dr-nav-links">
        <a href="https://dalalradar.com/#features" className="dr-nav-link">Features</a>
        <a href="https://dalalradar.com/#how" className="dr-nav-link">Method</a>
        <a href="https://dalalradar.com/#proof" className="dr-nav-link">Proof</a>
        <a href="https://app.dalalradar.com/" className="dr-btn-primary">
          Launch App <span className="dr-arrow">→</span>
        </a>
      </div>

      <style jsx>{`
        .dr-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          background: rgba(11, 18, 32, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 14px 24px;
        }

        /* ─── LOGO ─── */
        .dashboard-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-display-app);
          font-size: 24px;
          font-weight: 600;
          letter-spacing: -0.5px;
          color: #e8e8ed;
          text-decoration: none;
          flex-shrink: 0;
        }

        .dashboard-logo-mark {
          display: inline-block;
          width: 32px;
          height: 32px;
          flex-shrink: 0;
        }

        .dashboard-logo-text {
          letter-spacing: 0.5px;
        }

        .dashboard-logo-em {
          color: var(--green);
          font-style: italic;
        }

        /* ─── TOOL CONTROLS SLOT ─── */
        .dr-tool-controls {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          flex: 1;
          justify-content: center;
          margin-right: 16px;
        }

        /* ─── NAV LINKS ─── */
        .dr-nav-links {
          display: flex;
          align-items: center;
          gap: 28px;
          font-family: var(--font-app);
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          flex-shrink: 0;
        }

        .dr-nav-link {
          color: #94a3b8;
          transition: color 0.2s;
          text-decoration: none;
          position: relative;
        }

        .dr-nav-link:hover {
          color: #e8e8ed;
        }

        .dr-nav-link::after {
          content: "";
          position: absolute;
          bottom: -4px;
          left: 0;
          right: 0;
          height: 1px;
          background: var(--green);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s ease;
        }

        .dr-nav-link:hover::after {
          transform: scaleX(1);
        }

        /* ─── PRIMARY BUTTON ─── */
        .dr-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          font-family: var(--font-app);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          background: var(--green);
          color: #0a0a0c;
          border: 1px solid var(--green);
          text-decoration: none;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .dr-btn-primary:hover {
          background: var(--green-bright);
          box-shadow: 0 0 24px var(--green-glow);
          transform: translateY(-1px);
        }

        .dr-arrow {
          transition: transform 0.2s;
        }

        .dr-btn-primary:hover .dr-arrow {
          transform: translateX(3px);
        }

        /* ─── RESPONSIVE ─── */
        @media (max-width: 900px) {
          .dr-nav-links {
            gap: 16px;
          }
          .dr-nav-link {
            display: none;
          }
          .dr-tool-controls {
            margin-right: 8px;
          }
        }
      `}</style>
    </div>
  );
}
