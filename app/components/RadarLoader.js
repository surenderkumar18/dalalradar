// app/components/RadarLoader.js
// ════════════════════════════════════════════════════════════
//  RADAR LOADER — Brand-themed loading indicator
//
//  Concentric mint rings + center dot + rotating sweep arc,
//  matching the DalalRadar logo mark. Used as both:
//    - Page-level loader (size="lg" → 96px)
//    - Inline / sector-row loader (size="sm" → 44px)
//
//  All animations are inline so this works correctly even
//  during initial render before global stylesheets mount.
//
//  Usage:
//    <RadarLoader />                          // default lg, 96px
//    <RadarLoader size="sm" />                // 44px (inline)
//    <RadarLoader label="Loading data…" />    // custom label
//    <RadarLoader label="" />                 // no label
// ════════════════════════════════════════════════════════════

"use client";

import React from "react";

const SIZES = {
  sm: 44,
  md: 64,
  lg: 96,
};

export default function RadarLoader({
  size = "lg",
  label = "Scanning Dalal Street",
  sublabel = null,
  className = "",
}) {
  const px = SIZES[size] || SIZES.lg;
  // Unique gradient id per render avoids collision when multiple loaders mount
  const gradId = React.useId();

  return (
    <div
      className={`radar-loader-wrapper ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: size === "sm" ? 10 : 18,
      }}
    >
      {/* Inline keyframes — guaranteed available even before global CSS mounts */}
      <style>{`
        @keyframes dr-radar-pulse-outer {
          0%, 100% { opacity: 0.35; transform: scale(0.92); }
          50%      { opacity: 0.85; transform: scale(1.0); }
        }
        @keyframes dr-radar-pulse-inner {
          0%, 100% { opacity: 0.55; transform: scale(0.95); }
          50%      { opacity: 1;    transform: scale(1.05); }
        }
        @keyframes dr-radar-dot-pulse {
          0%, 100% { transform: scale(1);   opacity: 1; }
          50%      { transform: scale(0.7); opacity: 0.7; }
        }
        @keyframes dr-radar-sweep-rot {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .dr-radar-ring-outer { transform-origin: 32px 32px; animation: dr-radar-pulse-outer 2.2s ease-in-out infinite; }
        .dr-radar-ring-inner { transform-origin: 32px 32px; animation: dr-radar-pulse-inner 2.2s ease-in-out infinite; animation-delay: 0.4s; }
        .dr-radar-dot        { transform-origin: 32px 32px; animation: dr-radar-dot-pulse 1.4s ease-in-out infinite; }
        .dr-radar-sweep      { transform-origin: 32px 32px; animation: dr-radar-sweep-rot 2.4s linear infinite; }
      `}</style>

      <svg
        viewBox="0 0 64 64"
        width={px}
        height={px}
        aria-hidden="true"
        style={{ display: "block" }}
      >
        <defs>
          <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00ffa2" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#00ffa2" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Soft outer glow */}
        <circle cx="32" cy="32" r="30" fill={`url(#${gradId})`} />
        {/* Outer ring — slow pulse */}
        <circle
          cx="32" cy="32" r="22"
          fill="none" stroke="#00ffa2" strokeWidth="2"
          className="dr-radar-ring-outer"
        />
        {/* Inner ring — staggered pulse */}
        <circle
          cx="32" cy="32" r="13"
          fill="none" stroke="#00ffa2" strokeWidth="2"
          className="dr-radar-ring-inner"
        />
        {/* Center dot */}
        <circle cx="32" cy="32" r="4.5" fill="#00ffa2" className="dr-radar-dot" />
        {/* Crosshair ticks */}
        <line x1="32" y1="4"  x2="32" y2="11" stroke="#00ffa2" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="32" y1="53" x2="32" y2="60" stroke="#00ffa2" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="4"  y1="32" x2="11" y2="32" stroke="#00ffa2" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="53" y1="32" x2="60" y2="32" stroke="#00ffa2" strokeWidth="1.5" strokeLinecap="round" />
        {/* Sweep arc — rotates */}
        <g className="dr-radar-sweep">
          <path
            d="M 32 32 L 32 10 A 22 22 0 0 1 53 28 Z"
            fill="#00ffa2"
            fillOpacity="0.15"
          />
        </g>
      </svg>

      {label && (
        <div
          style={{
            fontFamily:
              "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: size === "sm" ? 10 : 12,
            letterSpacing: size === "sm" ? "0.15em" : "0.2em",
            textTransform: "uppercase",
            color: "#34d399",
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          {label}
        </div>
      )}

      {sublabel && (
        <div
          style={{
            fontFamily:
              "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 11,
            color: "#64748b",
            textAlign: "center",
          }}
        >
          {sublabel}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  RadarLoaderScreen — full-viewport wrapper for page loads
//
//  Usage:
//    <RadarLoaderScreen label="Loading market data…" />
// ════════════════════════════════════════════════════════════

export function RadarLoaderScreen({
  label = "Scanning Dalal Street",
  sublabel = null,
  size = "lg",
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#020617", // slate-950
        color: "#e2e8f0",
      }}
    >
      <RadarLoader size={size} label={label} sublabel={sublabel} />
    </div>
  );
}