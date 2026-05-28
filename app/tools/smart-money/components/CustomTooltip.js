"use client";

import React, { useState } from "react";
import {
  resolveBubbleColor,
  formatTurnoverCr,
  formatMoney,
} from "@/app/tools/smart-money/utils/bubbleEngineSub";

import PremiumFeature from "@/components/PremiumFeature";

import MiniRolloverBars from "./MiniRolloverBars";
import OIPriceChart from "@/app/components/OIPriceChart";

const MemoMiniRolloverBars = React.memo(MiniRolloverBars);
const MemoOIPriceChart = React.memo(OIPriceChart);

// =====================================================================
// 🎨 SHARED STYLE TOKENS — edit ONCE, applies everywhere
// =====================================================================
const SIZE = {
  row: 12, // data rows (was inline `{ fontSize: 16 }` ~24×)
  header: 18, // stock/sector name + date
  headerHeight: 50,
};

const COL = {
  up: "#22c55e",
  down: "#ef4444",
  blue: "#60a5fa",
  gold: "#facc15",
  purple: "#c084fc",
  cyan: "#1bbbd7",
  muted: "#69696b",
  text: "#e5e7eb",
  violet: "#a78bfa",
};

// Pre-built style objects (allocated once, not per render)
const ROW = { fontSize: SIZE.row };
const ROW_MUTED = { fontSize: SIZE.row, fontWeight: 500 };
const HEADER_BASE = {
  fontSize: SIZE.header,
  fontWeight: 600,
  height: SIZE.headerHeight,
};
const HEADER_STOCK = { ...HEADER_BASE, color: COL.purple };
const HEADER_DATE = { ...HEADER_BASE, color: COL.cyan };

function fmtDate(x) {
  return new Date(x).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const upDown = (v) => (v > 0 ? COL.up : COL.down);

// =====================================================================
// 🧩 Row — one "Label: value" line. Controls font + layout of EVERY
// data row from a single place.
//
//   <Row label="Price" value={d.close} color={COL.up} />     → bold colored
//   <Row label="Lots" value={...} muted />                   → gray, not bold
//   <Row label="Change" value="…" color={fill} style={ROW_MUTED} />
// =====================================================================
function Row({ label, value, color, muted = false, bold = true, style }) {
  const valueColor = muted ? COL.muted : color || COL.text;
  const ValueTag = bold && !muted ? "b" : "span";
  return (
    <div style={style ? { ...ROW, ...style } : ROW}>
      {label}: <ValueTag style={{ color: valueColor }}>{value}</ValueTag>
    </div>
  );
}

// =====================================================================
// 🎯 SIGNAL ENGINE PANEL (v3.3 — full BUY/SELL symmetry)
// =====================================================================

const SIGNAL_TYPE_CONFIG = {
  BUY: {
    label: "BUY SIGNAL",
    icon: "▲",
    primary: "#22c55e",
    border: "rgba(34,197,94,0.4)",
    bg: "rgba(34,197,94,0.06)",
  },
  SELL: {
    label: "SELL SIGNAL",
    icon: "▼",
    primary: "#ef4444",
    border: "rgba(239,68,68,0.4)",
    bg: "rgba(239,68,68,0.06)",
  },
  WARN: {
    label: "WARNING",
    icon: "!",
    primary: "#eab308",
    border: "rgba(234,179,8,0.4)",
    bg: "rgba(234,179,8,0.06)",
  },
};

const VALIDATION_CONFIG = {
  confirmed: { text: "✓ CONFIRMED", color: "#22c55e" },
  tentative: { text: "⏳ TENTATIVE", color: "#94a3b8" },
  failed: { text: "✗ FAILED", color: "#ef4444" },
};

const TREND_CONFIG = {
  accelerating_up: { text: "🚀 Accelerating Up", color: "#a78bfa" },
  strong_uptrend: { text: "📈 Strong Uptrend", color: "#22c55e" },
  mild_uptrend: { text: "↗ Mild Uptrend", color: "#86efac" },
  range: { text: "➡ Range / Sideways", color: "#94a3b8" },
  mild_downtrend: { text: "↘ Mild Downtrend", color: "#fca5a5" },
  strong_downtrend: { text: "📉 Strong Downtrend", color: "#ef4444" },
  unknown: { text: "? Unknown", color: "#64748b" },
};

const BIG_TREND_CONFIG = {
  healthy: { text: "💚 Healthy", color: "#22c55e" },
  damaged: { text: "🩹 Damaged", color: "#f59e0b" },
  severely_damaged: { text: "🚨 Severely Damaged", color: "#ef4444" },
  unknown: { text: "? Unknown", color: "#64748b" },
};

// 🆕 v3.3: Pattern descriptions for all 18 patterns
const PATTERN_DESCRIPTIONS = {
  // BUY patterns
  CUMULATIVE_ACCUMULATION: "Sustained 10-day buying pressure",
  SUPPORT_RECLAIM: "Failed breakdown → bullish reversal",
  ACCUMULATION_EXIT: "Quiet phase breakout",
  PULLBACK_REVERSAL: "Healthy pullback bounce",
  BREAKOUT_CONFIRM: "Range breakout with volume",
  TREND_CONTINUATION_BUY: "🆕 Healthy stock in sustained uptrend",
  NEW_HIGH_BREAKOUT: "🆕 Breaking 30-day high with volume",
  RECOVERY_CONTINUATION: "🆕 Recovered from damage, now flying",

  // SELL patterns
  CUMULATIVE_DISTRIBUTION: "Sustained 10-day selling pressure",
  RESISTANCE_REJECTION: "Failed breakout → bearish reversal",
  TREND_CONTINUATION_SELL: "Damaged structure still bleeding",
  LOWER_HIGH_REJECTION: "Dead-cat bounce ending",
  DISTRIBUTION_TOP: "High delivery + falling price",
  BEARISH_DIVERGENCE: "Price up but flow down",
  EXHAUSTION_TOP: "Parabolic + climax + reversal",
  BREAKDOWN: "Sharp drop with short buildup",

  // WARN patterns
  DAMAGED_STRUCTURE: "Risk zone — avoid new longs",
  EARLY_WARNING: "Subtle weakening detected",
};

function formatPatternName(pattern) {
  if (!pattern) return "—";
  return pattern
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

// space-between label/value line used by signal + sector panels
function SpaceRow({ label, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "#94a3b8" }}>{label}</span>
      {children}
    </div>
  );
}

// reusable flag chip
function Flag({ children, bg, color, border, title }) {
  return (
    <span
      title={title}
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 6px",
        borderRadius: 3,
        background: bg,
        color,
        border: `1px solid ${border}`,
      }}
    >
      {children}
    </span>
  );
}

function SignalEnginePanel({ d }) {
  const sig = d.bubbleSignal;
  if (!sig) return null;

  const cfg = SIGNAL_TYPE_CONFIG[sig.type] || SIGNAL_TYPE_CONFIG.WARN;
  const validation = VALIDATION_CONFIG[d.signalValidation || "tentative"];
  const trend = TREND_CONFIG[sig.trendContext] || TREND_CONFIG.unknown;
  const bigTrend =
    BIG_TREND_CONFIG[sig.bigTrendContext] || BIG_TREND_CONFIG.unknown;
  const patternDesc = PATTERN_DESCRIPTIONS[sig.pattern] || "";

  const strengthPct = Math.round((sig.strength || 0) * 100);
  const isStrict = sig.tier === "strict";
  const isBuy = sig.type === "BUY";

  return (
    <div
      style={{
        marginTop: 14,
        paddingTop: 12,
        borderTop: `1px solid ${cfg.border}`,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 18,
              fontWeight: 900,
              color: cfg.primary,
              textShadow: `0 0 8px ${cfg.primary}`,
            }}
          >
            {cfg.icon}
          </span>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.8,
                color: cfg.primary,
              }}
            >
              {cfg.label}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: COL.text }}>
              {formatPatternName(sig.pattern)}
            </div>
            {patternDesc && (
              <div
                style={{
                  fontSize: 10,
                  color: "#94a3b8",
                  marginTop: 1,
                  fontStyle: "italic",
                }}
              >
                {patternDesc}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            padding: "3px 8px",
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 0.6,
            color: isStrict ? "#0a0a0a" : COL.text,
            background: isStrict ? cfg.primary : "rgba(255,255,255,0.08)",
            border: isStrict ? "none" : "1px solid rgba(255,255,255,0.15)",
          }}
        >
          {sig.tier?.toUpperCase()}
        </div>
      </div>

      {/* METRIC GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            borderRadius: 5,
            padding: "6px 9px",
          }}
        >
          <div style={{ fontSize: 9, color: "#94a3b8", marginBottom: 2 }}>
            STRENGTH
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: cfg.primary }}>
            {strengthPct}%
          </div>
          <div
            style={{
              marginTop: 4,
              height: 3,
              background: "rgba(255,255,255,0.08)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${strengthPct}%`,
                height: "100%",
                background: cfg.primary,
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 5,
            padding: "6px 9px",
          }}
        >
          <div style={{ fontSize: 9, color: "#94a3b8", marginBottom: 2 }}>
            VALIDATION
          </div>
          <div
            style={{ fontSize: 13, fontWeight: 700, color: validation.color }}
          >
            {validation.text}
          </div>
        </div>
      </div>

      {/* CONTEXT */}
      <div
        style={{
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 5,
          padding: "8px 10px",
          marginBottom: 10,
          fontSize: 12,
          lineHeight: 1.7,
        }}
      >
        <SpaceRow label="60-day structure">
          <b style={{ color: bigTrend.color }}>{bigTrend.text}</b>
        </SpaceRow>

        <SpaceRow label="30-day trend">
          <b style={{ color: trend.color }}>{trend.text}</b>
        </SpaceRow>

        {sig.obvTrend !== undefined && (
          <SpaceRow label="OBV trend">
            <b
              style={{
                color:
                  sig.obvTrend > 0.1
                    ? COL.up
                    : sig.obvTrend < -0.1
                      ? COL.down
                      : "#94a3b8",
              }}
            >
              {sig.obvTrend > 0 ? "+" : ""}
              {sig.obvTrend.toFixed(2)}
            </b>
          </SpaceRow>
        )}

        {sig.patternCount !== undefined && (
          <SpaceRow label="Patterns matched">
            <b style={{ color: sig.confluence ? COL.violet : "#cbd5f5" }}>
              {sig.patternCount}
              {sig.confluence && (
                <span style={{ marginLeft: 6, fontSize: 10 }}>
                  🎯 CONFLUENCE
                </span>
              )}
            </b>
          </SpaceRow>
        )}

        {/* 🆕 v3.3: Prior damage indicator */}
        {sig.priorDamaged && (
          <SpaceRow label="Prior damage">
            <b style={{ color: COL.violet }}>⚠️ Yes (recovered)</b>
          </SpaceRow>
        )}
      </div>

      {/* FLAGS */}
      {(sig.trendAligned ||
        sig.trendConflict ||
        sig.obvWarning ||
        sig.upgradeReason ||
        sig.damagedStructure ||
        sig.recoveryMode) && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 5,
            marginBottom: 10,
          }}
        >
          {sig.trendAligned && (
            <Flag
              bg={isBuy ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}
              color={isBuy ? "#22c55e" : "#ef4444"}
              border={isBuy ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}
            >
              ✅ TREND ALIGNED
            </Flag>
          )}
          {sig.trendConflict && (
            <Flag
              bg="rgba(239,68,68,0.15)"
              color="#ef4444"
              border="rgba(239,68,68,0.3)"
            >
              ⚠️ TREND CONFLICT
            </Flag>
          )}
          {sig.obvWarning && (
            <Flag
              bg="rgba(234,179,8,0.15)"
              color="#eab308"
              border="rgba(234,179,8,0.3)"
              title={sig.obvWarning}
            >
              📊 OBV DIVERGED
            </Flag>
          )}
          {sig.upgradeReason === "confluence" && (
            <Flag
              bg="rgba(167,139,250,0.15)"
              color="#a78bfa"
              border="rgba(167,139,250,0.3)"
            >
              ⬆ UPGRADED (CONFLUENCE)
            </Flag>
          )}
          {sig.upgradeReason === "recovery_continuation" && (
            <Flag
              bg="rgba(167,139,250,0.15)"
              color="#a78bfa"
              border="rgba(167,139,250,0.3)"
            >
              ⬆ UPGRADED (RECOVERY)
            </Flag>
          )}
          {/* 🆕 v3.3: Recovery mode flag */}
          {sig.recoveryMode && (
            <Flag
              bg="rgba(34,197,94,0.15)"
              color="#22c55e"
              border="rgba(34,197,94,0.3)"
              title="Stock recovered from prior damage"
            >
              🚀 RECOVERY MODE
            </Flag>
          )}
          {sig.damagedStructure === "severe" && (
            <Flag
              bg="rgba(239,68,68,0.2)"
              color="#fca5a5"
              border="rgba(239,68,68,0.5)"
              title="Stock is severely damaged (60d structure)"
            >
              🚨 DAMAGED STRUCTURE
            </Flag>
          )}
          {sig.damagedStructure === "moderate" && (
            <Flag
              bg="rgba(245,158,11,0.15)"
              color="#f59e0b"
              border="rgba(245,158,11,0.3)"
              title="Stock structure is damaged (60d weakness)"
            >
              🩹 RECOVERY MODE
            </Flag>
          )}
        </div>
      )}

      {/* REASONS */}
      {sig.reasons && sig.reasons.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.6,
              color: "#94a3b8",
              marginBottom: 6,
            }}
          >
            WHY IT FIRED
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {sig.reasons.map((reason, i) => (
              <li
                key={i}
                style={{
                  position: "relative",
                  color: "#cbd5f5",
                  fontSize: 12,
                  margin: 0,
                  padding: 0,
                  paddingLeft: 12,
                  lineHeight: 1.4,
                }}
              >
                <span
                  style={{ position: "absolute", left: 0, color: cfg.primary }}
                >
                  ›
                </span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// 🔥 SECTOR ROTATION PANEL (unchanged logic)
// =====================================================================

function getRotationLabel(score) {
  if (score >= 0.15) return { text: "Rotating IN", color: "#22c55e" };
  if (score >= 0.05) return { text: "Building", color: "#86efac" };
  if (score <= -0.15) return { text: "Rotating OUT", color: "#ef4444" };
  if (score <= -0.05) return { text: "Cooling", color: "#fca5a5" };
  return { text: "Stable", color: "#94a3b8" };
}

function getBreadthLabel(breadth) {
  if (breadth >= 0.75) return { text: "Broad", color: "#22c55e" };
  if (breadth >= 0.5) return { text: "Mixed-up", color: "#86efac" };
  if (breadth >= 0.4) return { text: "Mixed", color: "#facc15" };
  if (breadth >= 0.25) return { text: "Mixed-down", color: "#fca5a5" };
  return { text: "Narrow", color: "#ef4444" };
}

function getRelativeStrengthLabel(relativePrice) {
  if (relativePrice >= 1.0) return { text: "Strong leader", color: "#a78bfa" };
  if (relativePrice >= 0.3) return { text: "Outperforming", color: "#22c55e" };
  if (relativePrice >= -0.3) return { text: "In-line", color: "#94a3b8" };
  if (relativePrice >= -1.0)
    return { text: "Underperforming", color: "#fca5a5" };
  return { text: "Strong laggard", color: "#ef4444" };
}

function SectorRotationPanel({ d }) {
  if (
    d.moneyFlowScore === undefined &&
    d.breadth === undefined &&
    d.rotationScore === undefined
  ) {
    return null;
  }

  const breadth = d.breadth ?? 0;
  const stockCount = d.stockCount ?? 0;
  const upCount = Math.round(breadth * stockCount);

  const rotation = getRotationLabel(d.rotationScore ?? 0);
  const breadthLabel = getBreadthLabel(breadth);
  const relStrength = getRelativeStrengthLabel(d.relativePrice ?? 0);

  const mf = d.moneyFlowScore ?? 0;
  const mfColor = mf > 0.3 ? COL.up : mf < -0.3 ? COL.down : "#94a3b8";

  return (
    <div
      style={{
        marginTop: 14,
        paddingTop: 12,
        borderTop: "1px solid rgba(250,204,21,0.18)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.8,
          color: COL.gold,
          marginBottom: 10,
        }}
      >
        SECTOR ROTATION
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 5,
            padding: "8px 10px",
          }}
        >
          <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 4 }}>
            ROTATION
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: rotation.color }}>
            {rotation.text}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            {(d.rotationScore ?? 0) >= 0 ? "+" : ""}
            {(d.rotationScore ?? 0).toFixed(2)} (5d Δ)
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 5,
            padding: "8px 10px",
          }}
        >
          <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 4 }}>
            VS MARKET
          </div>
          <div
            style={{ fontSize: 14, fontWeight: 700, color: relStrength.color }}
          >
            {relStrength.text}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            {(d.relativePrice ?? 0) >= 0 ? "+" : ""}
            {(d.relativePrice ?? 0).toFixed(2)}%
          </div>
        </div>
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.7 }}>
        <SpaceRow label="Breadth">
          <span style={{ fontSize: 18, fontWeight: 600 }}>
            <b style={{ color: breadthLabel.color }}>{breadthLabel.text}</b>{" "}
            <span style={{ color: "#94a3b8" }}>(</span>
            <span style={{ color: "#ffffff" }}>{upCount}</span>
            <span style={{ color: "#94a3b8" }}>/{stockCount})</span>
            <span style={{ color: COL.cyan }}> UP</span>
          </span>
        </SpaceRow>

        <SpaceRow label="Money flow">
          <b style={{ color: mfColor }}>
            {mf >= 0 ? "+" : ""}
            {mf.toFixed(2)}
          </b>
        </SpaceRow>

        <SpaceRow label="Sector price">
          <b style={{ color: (d.price ?? 0) > 0 ? COL.up : COL.down }}>
            {(d.price ?? 0) >= 0 ? "+" : ""}
            {(d.price ?? 0).toFixed(2)}%
          </b>
        </SpaceRow>

        <SpaceRow label="Market avg">
          <span style={{ color: "#cbd5f5" }}>
            {(d.marketAvgPrice ?? 0) >= 0 ? "+" : ""}
            {(d.marketAvgPrice ?? 0).toFixed(2)}%
          </span>
        </SpaceRow>

        <SpaceRow label="Dispersion">
          <span style={{ color: "#cbd5f5" }}>
            {(d.dispersion ?? 0).toFixed(2)}
            {(d.dispersion ?? 0) > 2.5 && (
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 11,
                  color: COL.gold,
                  fontWeight: 600,
                }}
              >
                ⚠ internal split
              </span>
            )}
          </span>
        </SpaceRow>

        <SpaceRow label="Delivery">
          <b style={{ color: COL.gold }}>{(d.delivery ?? 0).toFixed(2)}%</b>
        </SpaceRow>

        <SpaceRow label="OI change (avg)">
          <b style={{ color: (d.oiChangePct ?? 0) > 0 ? COL.up : COL.down }}>
            {(d.oiChangePct ?? 0) >= 0 ? "+" : ""}
            {(d.oiChangePct ?? 0).toFixed(2)}%
          </b>
        </SpaceRow>
      </div>
    </div>
  );
}

// =====================================================================
// 🎯 MAIN CUSTOM TOOLTIP
// =====================================================================

const CustomTooltip = React.memo(function CustomTooltip({
  payload,
  latestDate,
  hoveredKeyRef,
  mode,
  bubbleRefs,
}) {
  const [showHeavy, setShowHeavy] = useState(false);

  const d = payload?.[0]?.payload;

  if (!d) {
    const prevKey = hoveredKeyRef.current;

    if (prevKey && bubbleRefs.current.has(prevKey)) {
      const el = bubbleRefs.current.get(prevKey);

      if (el) {
        const isWeak = el.getAttribute("data-weak") === "1";

        el.setAttribute("stroke", isWeak ? el.getAttribute("fill") : "none");
        el.setAttribute("stroke-width", isWeak ? "1.2" : "0");

        el.style.transform = "scale(1)";
        el.style.opacity = isWeak ? "0.45" : "";
      }
    }

    hoveredKeyRef.current = null;
    return null;
  }

  const isStock = d.stock !== undefined;
  const fill = resolveBubbleColor(d);

  const isSectorBubble =
    !isStock &&
    (d.moneyFlowScore !== undefined ||
      d.breadth !== undefined ||
      d.rotationScore !== undefined);

  const hasSignal = !!d.bubbleSignal;

  const nameLabel = mode === "all" || mode === "stock" ? d.stock : d.sector;
  const futColor = upDown(d.futPriceChange);
  const priceColor = upDown(d.price);
  const num = (v) => v?.toLocaleString("en-IN");

  return (
    <div
      style={{
        position: "relative",
        zIndex: 9999,
        pointerEvents: "auto",
        background: "linear-gradient(180deg,#0b0b0c,#111)",
        border: "1px solid #333",
        borderRadius: 6,
        padding: "12px 14px",
        minWidth: 240,
        backdropFilter: "blur(6px)",
        color: COL.text,
        fontFamily: "system-ui",
        boxShadow: `
          0 0 0 1px rgba(255,255,255,0.04),
          0 0 12px rgba(56,189,248,0.25),
          0 0 30px rgba(56,189,248,0.18),
          inset 0 0 10px rgba(0,0,0,0.6)
        `,
      }}
    >
      {/* ── SECTOR header (when not a stock) ── */}
      {!isStock && <div style={HEADER_STOCK}>{nameLabel}</div>}
      {!isStock && <div style={{...HEADER_DATE, fontSize: 12}}>{fmtDate(d.x)}</div>}
      {!isStock && (
        <Row
          label="Turnover"
          value={formatTurnoverCr(d.turnover)}
          color={COL.blue}
        />
      )}

      {isSectorBubble && <SectorRotationPanel d={d} />}

      {/* ── STOCK two-column body ── */}
      <div style={{ display: "flex", gap: 20 }}>
        {/* LEFT column */}
        <div style={{ flex: 1 }}>
          {isStock && <div style={HEADER_STOCK}>{nameLabel}</div>}
          {isStock && (
            <Row
              label="Fut Price"
              value={d.futPrice?.toFixed(2)}
              color={futColor}
            />
          )}
          {isStock && (
            <Row
              label="Fut Price %"
              value={`${d.futPriceChange?.toFixed(2)}%`}
              color={futColor}
            />
          )}
          {isStock && (
            <Row
              label="Turnover"
              value={formatMoney(d.fnoTurnover)}
              color={COL.blue}
            />
          )}
          {isStock && (
            <Row label="OI" value={num(d.openInterest)} color={COL.gold} />
          )}
          {isStock && (
            <Row
              label="OI %"
              value={`${d.oiChangePct?.toFixed(2)}%`}
              color={upDown(d.oiChangePct)}
            />
          )}
          {isStock && (
            <Row label="Shares" value={num(d.shares)} muted style={ROW_MUTED} />
          )}
          {/**
            {isStock && <Row label="Lots" value={num(d.lots)} muted />}
            {isStock && <Row label="Volume" value={num(d.fnoVolume)} muted />}
            {isStock && (
              <Row label="Total Trades" value={num(d.totalTrades)} muted />
            )}
            {isStock && <Row label="Contracts" value={num(d.contracts)} muted />}
            {isStock && (
              <Row label="Avg. Trade Size" value={num(d.avgTradeSize)} muted />
            )}
          */}  
        </div>

        {/* DIVIDER */}
        {isStock && (
          <div
            style={{
              width: 1,
              background:
                "linear-gradient(to bottom, transparent, #facc15, transparent)",
              opacity: 0.6,
              marginTop: 40,
            }}
          />
        )}

        {/* RIGHT column */}
        <div style={{ flex: 1 }}>
          {isStock && <div style={{...HEADER_DATE, fontSize: 12}}>{fmtDate(d.x)}</div>}
          {isStock && (
            <Row label="Price" value={d.close ?? "_"} color={priceColor} />
          )}
          {isStock && (
            <Row
              label="Price %"
              value={`${d.price?.toFixed(2)}%`}
              color={priceColor}
            />
          )}
          {isStock && (
            <Row
              label="Turnover"
              value={formatTurnoverCr(d.turnover)}
              color={COL.blue}
            />
          )}
          {/**
            {isStock && (
              <Row
                label="Change"
                value={`${d.turnoverChange?.toFixed(2)}%`}
                color={fill}
              />
            )}
          */}
          {isStock && (
            <Row
              label="Delivery"
              value={`${d.delivery?.toFixed(2)}%`}
              color={COL.gold}
            />
          )}
         {isStock && <Row label="Expiry" value={d.expiry || "-"} muted />}
          {/** 
            {isStock && <Row label="Lot Size" value={num(d.lotSize)} muted />}
            {isStock && (
              <Row label="OI Signal" value={d.oiAnalysis} color={COL.violet} />
            )}
          */}
        </div>
      </div>

      {hasSignal && <SignalEnginePanel d={d} />}

      {mode !== "all" && mode !== "sector" && (
        <>
          <MemoMiniRolloverBars
            key={d.stock + "-" + d.x}
            symbol={d.stock}
            data={d.rolloverData}
            currentDate={d.x}
            latestDate={latestDate}
          />
           <PremiumFeature feature="OI_PRICE_CHART">
            <div style={{ marginTop: 12 }}>
              <MemoOIPriceChart
                key={d.stock + "-" + d.x}
                symbol={d.stock}
                currentDate={d.x}
                onClose={() => {}}
                canvasHeight={180}
                days={30}
              />
            </div>
           </PremiumFeature> 
        </>
      )}
    </div>
  );
});

export default CustomTooltip;
