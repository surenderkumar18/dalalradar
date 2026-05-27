// app/tools/smart-money/components/SmartMoneyTour.js
// ════════════════════════════════════════════════════════════
//  SMART MONEY TOUR v2 — 6-step walkthrough with visual legends
//
//  v2 changes from v1:
//    - Step 2 now shows actual bubble visuals (size + color legend)
//    - New step explains rings + signals with side-by-side examples
//    - New step explains bubble clusters (sustained institutional activity)
//    - Tour version bumped to 2 → all users re-see the tour once
//
//  PREREQUISITE: data-tour attributes on these elements:
//    brand, bubble, sector, period, search
// ════════════════════════════════════════════════════════════

"use client";

import React, { forwardRef } from "react";
import Coachmarks from "@/app/components/Coachmarks";

// 🔥 BUMPED to 2 — new tour content, all users replay once
const TOUR_VERSION = 2;

/* ──────────────────────────────────────────────────────────────
   COLOR PALETTE — matches the actual bubble engine
   Update if bubbleEngineSub.js colors change.
─────────────────────────────────────────────────────────────── */
const C = {
  accum: "#22c55e",       // green — accumulation
  distrib: "#ef4444",     // red — distribution
  signalGold: "#FBB724",  // gold — strict signal
  momentum: "#a78bfa",    // purple — momentum buying
  weak: "#64748b",        // gray — weak/noise
  ring: "#FBB724",        // ring color (matches gold signal)
  text: "#cbd5e1",
  textDim: "#94a3b8",
};

/* ──────────────────────────────────────────────────────────────
   REUSABLE INLINE SVG VISUALS
─────────────────────────────────────────────────────────────── */

// Single bubble swatch with optional ring + glow
function BubbleSwatch({ color, r = 12, ring = false, glow = false, icon = null }) {
  return (
    <svg viewBox="-25 -25 50 50" width="44" height="44" style={{ flexShrink: 0 }}>
      {glow && (
        <circle cx="0" cy="0" r={r * 1.55} fill={color} opacity="0.22" />
      )}
      {ring && (
        <circle cx="0" cy="0" r={r + 4} fill="none" stroke={color} strokeWidth="2" opacity="0.85" />
      )}
      <circle cx="0" cy="0" r={r} fill={color} opacity="0.95" />
      {icon && (
        <text
          x="0"
          y="0"
          fontSize={r * 0.95}
          fontWeight="900"
          fill="#fff"
          textAnchor="middle"
          dominantBaseline="central"
          style={{ textShadow: "0 0 3px rgba(0,0,0,0.9)" }}
        >
          {icon}
        </text>
      )}
    </svg>
  );
}

// A single legend row: swatch + label + sub
function LegendRow({ children, label, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
      {children}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#f1f5f9", lineHeight: 1.3 }}>
          {label}
        </div>
        {sub && (
          <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.4, marginTop: 1 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   STEP-SPECIFIC VISUAL BLOCKS
─────────────────────────────────────────────────────────────── */

// Step 3: Size meaning — three bubbles small → large
function SizeLegend() {
  return (
    <div
      style={{
        margin: "10px 0 12px",
        padding: "12px 10px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", marginBottom: 8 }}>
        <div style={{ textAlign: "center" }}>
          <BubbleSwatch color={C.accum} r={5} />
          <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>small</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <BubbleSwatch color={C.accum} r={10} />
          <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>medium</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <BubbleSwatch color={C.accum} r={16} />
          <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>large</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: C.text, textAlign: "center", fontStyle: "italic" }}>
        Bigger = more money moved that day
      </div>
    </div>
  );
}

// Step 4: Color legend — 5 swatches with meaning
function ColorLegend() {
  return (
    <div
      style={{
        margin: "10px 0 12px",
        padding: "10px 12px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 6,
      }}
    >
      <LegendRow
        label="Accumulation"
        sub="Buying pressure building"
      >
        <BubbleSwatch color={C.accum} r={11} />
      </LegendRow>
      <LegendRow
        label="Distribution"
        sub="Sellers exiting positions"
      >
        <BubbleSwatch color={C.distrib} r={11} />
      </LegendRow>
      <LegendRow
        label="Momentum"
        sub="Aggressive directional flow"
      >
        <BubbleSwatch color={C.momentum} r={11} />
      </LegendRow>
      <LegendRow
        label="Smart entry"
        sub="Strict institutional pattern"
      >
        <BubbleSwatch color={C.signalGold} r={11} />
      </LegendRow>
      <LegendRow
        label="Weak / noise"
        sub="Low conviction day"
      >
        <BubbleSwatch color={C.weak} r={9} />
      </LegendRow>
    </div>
  );
}

// Step 5: Rings + signals — comparison
function RingLegend() {
  return (
    <div
      style={{
        margin: "10px 0 12px",
        padding: "12px 10px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", marginBottom: 10 }}>
        <div style={{ textAlign: "center" }}>
          <BubbleSwatch color={C.accum} r={13} />
          <div style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>regular</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <BubbleSwatch color={C.accum} r={13} ring />
          <div style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>+ ring</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <BubbleSwatch color={C.signalGold} r={13} ring glow icon="▲" />
          <div style={{ fontSize: 10, color: "#facc15", marginTop: 4, fontWeight: 700 }}>confirmed</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: C.text, lineHeight: 1.5 }}>
        <div><strong>Ring</strong> = today the engine flagged a strict pattern</div>
        <div><strong>Glow + icon</strong> = signal also confirmed by price follow-through</div>
      </div>
    </div>
  );
}

// Step 6: Cluster — multiple large bubbles stacked
function ClusterLegend() {
  // Three columns side-by-side representing 3 consecutive days
  return (
    <div
      style={{
        margin: "10px 0 12px",
        padding: "12px 10px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 6,
      }}
    >
      <svg viewBox="0 0 220 80" width="100%" height="80" style={{ display: "block" }}>
        {/* faint gridline */}
        <line x1="10" y1="55" x2="210" y2="55" stroke="rgba(148,163,184,0.2)" strokeDasharray="3 3" />

        {/* Day 1 — medium accumulation */}
        <circle cx="35" cy="42" r="9" fill={C.accum} opacity="0.95" />
        <text x="35" y="74" fontSize="9" fill={C.textDim} textAnchor="middle">Day 1</text>

        {/* Day 2 — larger accumulation + ring */}
        <circle cx="80" cy="40" r="13" fill={C.accum} opacity="0.95" />
        <circle cx="80" cy="40" r="17" fill="none" stroke={C.signalGold} strokeWidth="1.5" opacity="0.75" />
        <text x="80" y="74" fontSize="9" fill={C.textDim} textAnchor="middle">Day 2</text>

        {/* Day 3 — even bigger, gold confirmed */}
        <circle cx="135" cy="38" r="14" fill={C.signalGold} opacity="0.22" />
        <circle cx="135" cy="38" r="11" fill={C.signalGold} opacity="0.95" />
        <circle cx="135" cy="38" r="15" fill="none" stroke={C.signalGold} strokeWidth="2" opacity="0.85" />
        <text x="135" y="38" fontSize="10" fontWeight="900" fill="#fff" textAnchor="middle" dominantBaseline="central">▲</text>
        <text x="135" y="74" fontSize="9" fill={C.textDim} textAnchor="middle">Day 3</text>

        {/* Day 4 — momentum follow */}
        <circle cx="185" cy="36" r="13" fill={C.momentum} opacity="0.95" />
        <text x="185" y="74" fontSize="9" fill={C.textDim} textAnchor="middle">Day 4</text>

        {/* arrow showing buildup */}
        <path d="M 20 64 Q 110 64 200 60" stroke={C.signalGold} strokeWidth="1" fill="none" strokeDasharray="2 3" opacity="0.5" />
      </svg>
      <div style={{ fontSize: 11, color: C.text, lineHeight: 1.5, marginTop: 4 }}>
        A <strong>cluster</strong> = consecutive days of large bubbles in the same row.
        That&apos;s sustained institutional activity, not a one-day blip. The most
        actionable patterns.
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   TOUR STEPS
─────────────────────────────────────────────────────────────── */

const STEPS = [
  {
    target: "brand",
    placement: "bottom",
    title: "Welcome to the radar.",
    body: (
      <>
        This is the <strong>Smart Money Radar</strong> — every bubble below is
        one F&amp;O stock on one day. We&apos;ll spend 45 seconds showing you
        what they mean.
      </>
    ),
  },
  {
    target: "bubble",
    placement: "right",
    width: 420,
    title: "Size = money flow.",
    body: (
      <>
        <div>Each bubble&apos;s diameter shows how much money moved in that stock that day.</div>
        <SizeLegend />
        <div style={{ fontSize: 11, color: C.textDim, fontStyle: "italic" }}>
          Bigger bubbles = institutions were active. Tiny bubbles = quiet day.
        </div>
      </>
    ),
  },
  {
    target: "bubble",
    placement: "right",
    width: 420,
    title: "Color = pattern type.",
    body: (
      <>
        <div>The color encodes what the engine detected about the flow:</div>
        <ColorLegend />
        <div style={{ fontSize: 11, color: C.textDim, fontStyle: "italic" }}>
          Faded bubbles are older days. Recent days render at full opacity.
        </div>
      </>
    ),
  },
  {
    target: "bubble",
    placement: "right",
    width: 420,
    title: "Rings = today's signals.",
    body: (
      <>
        <div>Some bubbles get extra decoration when the engine fires a signal:</div>
        <RingLegend />
        <div style={{ fontSize: 11, color: C.textDim, fontStyle: "italic" }}>
          A ring alone = pattern matched. Glow + icon = pattern confirmed by price.
        </div>
      </>
    ),
  },
  {
    target: "bubble",
    placement: "right",
    width: 420,
    title: "Clusters tell the real story.",
    body: (
      <>
        <div>One big bubble could be a fluke. A <strong>cluster</strong> across multiple days is what to look for:</div>
        <ClusterLegend />
      </>
    ),
  },
  {
    target: "sector",
    placement: "right",
    title: "Click a sector to drill in.",
    body: (
      <>
        Click any sector label on the chart to see only its stocks. The
        <strong> Past Days</strong> dropdown changes the window — try 30 vs 90
        days, signals look different at each.
        <br />
        <br />
        Need a specific stock? Use the search at the top.
        <br />
        <br />
        That&apos;s it. Remember:{" "}
        <strong>this isn&apos;t advice, it&apos;s a footprint</strong>.
      </>
    ),
  },
];

const SmartMoneyTour = forwardRef(function SmartMoneyTour(_, ref) {
  return (
    <Coachmarks
      ref={ref}
      tourId="smart_money"
      version={TOUR_VERSION}
      steps={STEPS}
      startDelayMs={800}
    />
  );
});

export default SmartMoneyTour;