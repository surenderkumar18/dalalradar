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
            <div style={{ fontSize: 13, fontWeight: 600, color: "#e5e7eb" }}>
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
            color: isStrict ? "#0a0a0a" : "#e5e7eb",
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
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>60-day structure</span>
          <b style={{ color: bigTrend.color }}>{bigTrend.text}</b>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>30-day trend</span>
          <b style={{ color: trend.color }}>{trend.text}</b>
        </div>

        {sig.obvTrend !== undefined && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#94a3b8" }}>OBV trend</span>
            <b
              style={{
                color:
                  sig.obvTrend > 0.1
                    ? "#22c55e"
                    : sig.obvTrend < -0.1
                      ? "#ef4444"
                      : "#94a3b8",
              }}
            >
              {sig.obvTrend > 0 ? "+" : ""}
              {sig.obvTrend.toFixed(2)}
            </b>
          </div>
        )}

        {sig.patternCount !== undefined && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#94a3b8" }}>Patterns matched</span>
            <b style={{ color: sig.confluence ? "#a78bfa" : "#cbd5f5" }}>
              {sig.patternCount}
              {sig.confluence && (
                <span style={{ marginLeft: 6, fontSize: 10 }}>
                  🎯 CONFLUENCE
                </span>
              )}
            </b>
          </div>
        )}

        {/* 🆕 v3.3: Prior damage indicator */}
        {sig.priorDamaged && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#94a3b8" }}>Prior damage</span>
            <b style={{ color: "#a78bfa" }}>⚠️ Yes (recovered)</b>
          </div>
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
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 3,
                background:
                  sig.type === "BUY"
                    ? "rgba(34,197,94,0.15)"
                    : "rgba(239,68,68,0.15)",
                color: sig.type === "BUY" ? "#22c55e" : "#ef4444",
                border: `1px solid ${
                  sig.type === "BUY"
                    ? "rgba(34,197,94,0.3)"
                    : "rgba(239,68,68,0.3)"
                }`,
              }}
            >
              ✅ TREND ALIGNED
            </span>
          )}
          {sig.trendConflict && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 3,
                background: "rgba(239,68,68,0.15)",
                color: "#ef4444",
                border: "1px solid rgba(239,68,68,0.3)",
              }}
            >
              ⚠️ TREND CONFLICT
            </span>
          )}
          {sig.obvWarning && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 3,
                background: "rgba(234,179,8,0.15)",
                color: "#eab308",
                border: "1px solid rgba(234,179,8,0.3)",
              }}
              title={sig.obvWarning}
            >
              📊 OBV DIVERGED
            </span>
          )}
          {sig.upgradeReason === "confluence" && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 3,
                background: "rgba(167,139,250,0.15)",
                color: "#a78bfa",
                border: "1px solid rgba(167,139,250,0.3)",
              }}
            >
              ⬆ UPGRADED (CONFLUENCE)
            </span>
          )}
          {sig.upgradeReason === "recovery_continuation" && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 3,
                background: "rgba(167,139,250,0.15)",
                color: "#a78bfa",
                border: "1px solid rgba(167,139,250,0.3)",
              }}
            >
              ⬆ UPGRADED (RECOVERY)
            </span>
          )}
          {/* 🆕 v3.3: Recovery mode flag */}
          {sig.recoveryMode && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 3,
                background: "rgba(34,197,94,0.15)",
                color: "#22c55e",
                border: "1px solid rgba(34,197,94,0.3)",
              }}
              title="Stock recovered from prior damage"
            >
              🚀 RECOVERY MODE
            </span>
          )}
          {sig.damagedStructure === "severe" && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 3,
                background: "rgba(239,68,68,0.2)",
                color: "#fca5a5",
                border: "1px solid rgba(239,68,68,0.5)",
              }}
              title="Stock is severely damaged (60d structure)"
            >
              🚨 DAMAGED STRUCTURE
            </span>
          )}
          {sig.damagedStructure === "moderate" && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 3,
                background: "rgba(245,158,11,0.15)",
                color: "#f59e0b",
                border: "1px solid rgba(245,158,11,0.3)",
              }}
              title="Stock structure is damaged (60d weakness)"
            >
              🩹 RECOVERY MODE
            </span>
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
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            {sig.reasons.map((reason, i) => (
              <li
                key={i}
                style={{
                  paddingLeft: 12,
                  position: "relative",
                  color: "#cbd5f5",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    color: cfg.primary,
                  }}
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
// 🔥 SECTOR ROTATION PANEL (unchanged)
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
          color: "#facc15",
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
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: rotation.color,
            }}
          >
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
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: relStrength.color,
            }}
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
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>Breadth</span>
          <span style={{ fontSize: 18, fontWeight: 600 }}>
            <b style={{ color: breadthLabel.color }}>{breadthLabel.text}</b>{" "}
            <span style={{ color: "#94a3b8" }}>(</span>
            <span style={{ color: "#ffffff" }}>{upCount}</span>
            <span style={{ color: "#94a3b8" }}>/{stockCount})</span>
            <span style={{ color: "#1bbbd7" }}> UP</span>
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>Money flow</span>
          <b
            style={{
              color:
                (d.moneyFlowScore ?? 0) > 0.3
                  ? "#22c55e"
                  : (d.moneyFlowScore ?? 0) < -0.3
                    ? "#ef4444"
                    : "#94a3b8",
            }}
          >
            {(d.moneyFlowScore ?? 0) >= 0 ? "+" : ""}
            {(d.moneyFlowScore ?? 0).toFixed(2)}
          </b>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>Sector price</span>
          <b
            style={{
              color: (d.price ?? 0) > 0 ? "#22c55e" : "#ef4444",
            }}
          >
            {(d.price ?? 0) >= 0 ? "+" : ""}
            {(d.price ?? 0).toFixed(2)}%
          </b>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>Market avg</span>
          <span style={{ color: "#cbd5f5" }}>
            {(d.marketAvgPrice ?? 0) >= 0 ? "+" : ""}
            {(d.marketAvgPrice ?? 0).toFixed(2)}%
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>Dispersion</span>
          <span style={{ color: "#cbd5f5" }}>
            {(d.dispersion ?? 0).toFixed(2)}
            {(d.dispersion ?? 0) > 2.5 && (
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 11,
                  color: "#facc15",
                  fontWeight: 600,
                }}
              >
                ⚠ internal split
              </span>
            )}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>Delivery</span>
          <b style={{ color: "#facc15" }}>{(d.delivery ?? 0).toFixed(2)}%</b>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>OI change (avg)</span>
          <b
            style={{
              color: (d.oiChangePct ?? 0) > 0 ? "#22c55e" : "#ef4444",
            }}
          >
            {(d.oiChangePct ?? 0) >= 0 ? "+" : ""}
            {(d.oiChangePct ?? 0).toFixed(2)}%
          </b>
        </div>
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

  const id = d.stock ?? d.sector;
  const key = id + "-" + d.x;

  const isSectorBubble =
    !isStock &&
    (d.moneyFlowScore !== undefined ||
      d.breadth !== undefined ||
      d.rotationScore !== undefined);

  const hasSignal = !!d.bubbleSignal;

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
        color: "#e5e7eb",
        fontFamily: "system-ui",
        boxShadow: `
                          0 0 0 1px rgba(255,255,255,0.04),
                          0 0 12px rgba(56,189,248,0.25),
                          0 0 30px rgba(56,189,248,0.18),
                          inset 0 0 10px rgba(0,0,0,0.6)
                        `,
      }}
    >
      {!isStock && (
        <div
          style={{
            fontSize: 24,
            color: "#c084fc",
            fontWeight: 600,
            height: 50,
          }}
        >
          {mode === "all" || mode === "stock" ? d.stock : d.sector}
        </div>
      )}
      {!isStock && (
        <div
          style={{
            fontSize: 24,
            color: "#1bbbd7",
            fontWeight: 600,
            height: 50,
          }}
        >
          {new Date(d.x).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </div>
      )}

      {!isStock && (
        <div style={{ fontSize: 16 }}>
          Turnover:{" "}
          <b style={{ color: "#60a5fa" }}>{formatTurnoverCr(d.turnover)}</b>
        </div>
      )}

      {isSectorBubble && <SectorRotationPanel d={d} />}

      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ flex: 1 }}>
          {isStock && (
            <div
              style={{
                fontSize: 24,
                color: "#c084fc",
                fontWeight: 600,
                height: 50,
              }}
            >
              {mode === "all" || mode === "stock" ? d.stock : d.sector}
            </div>
          )}
          {isStock && (
            <div style={{ fontSize: 16 }}>
              Fut Price:{" "}
              <b
                style={{
                  color: d.futPriceChange > 0 ? "#22c55e" : "#ef4444",
                }}
              >
                {d.futPrice?.toFixed(2)}
              </b>
            </div>
          )}
          {isStock && (
            <div style={{ fontSize: 16 }}>
              Fut Price %:{" "}
              <b
                style={{
                  color: d.futPriceChange > 0 ? "#22c55e" : "#ef4444",
                }}
              >
                {d.futPriceChange?.toFixed(2)}%
              </b>
            </div>
          )}

          {isStock && (
            <div style={{ fontSize: 16 }}>
              Turnover:{" "}
              <b style={{ color: "#60a5fa" }}>{formatMoney(d.fnoTurnover)}</b>
            </div>
          )}
          {isStock && (
            <div style={{ fontSize: 16 }}>
              OI:{" "}
              <b style={{ color: "#facc15" }}>
                {d.openInterest?.toLocaleString("en-IN")}
              </b>
            </div>
          )}
          {isStock && (
            <div style={{ fontSize: 16 }}>
              OI %:{" "}
              <b
                style={{
                  color: d.oiChangePct > 0 ? "#22c55e" : "#ef4444",
                }}
              >
                {d.oiChangePct?.toFixed(2)}%
              </b>
            </div>
          )}
          {isStock && (
            <div style={{ fontSize: 16, fontWeight: 500 }}>
              Shares:{" "}
              <span style={{ color: "#69696b" }}>
                {d.shares?.toLocaleString("en-IN")}
              </span>
            </div>
          )}
          {isStock && (
            <div style={{ fontSize: 16 }}>
              Lots:{" "}
              <span style={{ color: "#69696b" }}>
                {d.lots?.toLocaleString("en-IN")}
              </span>
            </div>
          )}
          {isStock && (
            <div style={{ fontSize: 16 }}>
              Volume:{" "}
              <span style={{ color: "#69696b" }}>
                {d.fnoVolume?.toLocaleString("en-IN")}
              </span>
            </div>
          )}
          {isStock && (
            <div style={{ fontSize: 16 }}>
              Total Trades:{" "}
              <span style={{ color: "#69696b" }}>
                {d.totalTrades?.toLocaleString("en-IN")}
              </span>
            </div>
          )}
          {isStock && (
            <div style={{ fontSize: 16 }}>
              Contracts:{" "}
              <span style={{ color: "#69696b" }}>
                {d.contracts?.toLocaleString("en-IN")}
              </span>
            </div>
          )}
          {isStock && (
            <div style={{ fontSize: 16 }}>
              Avg. Trade Size:{" "}
              <span style={{ color: "#69696b" }}>
                {d.avgTradeSize?.toLocaleString("en-IN")}
              </span>
            </div>
          )}
        </div>
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

        <div style={{ flex: 1 }}>
          {isStock && (
            <div
              style={{
                fontSize: 24,
                color: "#1bbbd7",
                fontWeight: 600,
                height: 50,
              }}
            >
              {new Date(d.x).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
          )}
          {isStock && (
            <div style={{ fontSize: 16 }}>
              Price:{" "}
              <b
                style={{
                  color: d.price > 0 ? "#22c55e" : "#ef4444",
                }}
              >
                {d.close ?? "_"}
              </b>
            </div>
          )}
          {isStock && (
            <div style={{ fontSize: 16 }}>
              Price % :{" "}
              <b
                style={{
                  color: d.price > 0 ? "#22c55e" : "#ef4444",
                }}
              >
                {d.price?.toFixed(2)}%
              </b>
            </div>
          )}
          {isStock && (
            <div style={{ fontSize: 16 }}>
              Turnover:{" "}
              <b style={{ color: "#60a5fa" }}>{formatTurnoverCr(d.turnover)}</b>
            </div>
          )}
          {isStock && (
            <div style={{ fontSize: 16 }}>
              Change:{" "}
              <b style={{ color: fill }}>{d.turnoverChange?.toFixed(2)}%</b>
            </div>
          )}
          {isStock && (
            <div style={{ fontSize: 16 }}>
              Delivery:{" "}
              <b style={{ color: "#facc15" }}>{d.delivery?.toFixed(2)}%</b>
            </div>
          )}

          {isStock && (
            <div style={{ fontSize: 16 }}>
              Expiry:{" "}
              <span style={{ color: "#69696b" }}>{d.expiry || "-"}</span>
            </div>
          )}

          {isStock && (
            <div style={{ fontSize: 16 }}>
              Lot Size:{" "}
              <span style={{ color: "#69696b" }}>
                {d.lotSize?.toLocaleString("en-IN")}
              </span>
            </div>
          )}
          {/**
          {isStock && (
            <div style={{ fontSize: 16 }}>
              OI Signal: <b style={{ color: "#a78bfa" }}>{d.oiAnalysis}</b>
            </div>
          )} */}
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
