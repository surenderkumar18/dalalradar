// app\tools\bubbleChart\components\SignalPanel.js

"use client";

import React, { useMemo } from "react";
import { computeTopSignals, computeSectorWhales } from "../utils/computeMarketState";

// =====================================================================
// 🎯 SIGNAL PANEL — Universal sidebar for all views
//
// Shows today's actionable signals:
//   - BUY signals (ranked by tier + strength)
//   - SELL signals (ranked by tier + strength)
//   - WARN signals
//   - Whales (top stocks by turnover + price move)
//
// Works on ALL views:
//   - Sectors view: shows sector-level signals
//   - Stock view: shows stocks-within-sector signals
//   - All Stocks view: shows top market-wide signals
//   - Favorites view: shows signals on favorite stocks
//
// Drop this into: tools/bubbleChart/components/SignalPanel.js
// =====================================================================

const SignalPanel = React.memo(function SignalPanel({
  bubbleData = [],
  latestDate,
  mode,
  selectedSector,
  onSignalClick,
  collapsed = false,
  onToggle,
  maxSignalsPerType = 4,
}) {
  const signals = useMemo(
    () => computeTopSignals(bubbleData, latestDate),
    [bubbleData, latestDate],
  );

  const whales = useMemo(
    () => computeSectorWhales(bubbleData, latestDate, 3),
    [bubbleData, latestDate],
  );

  const isSectorView = mode === "sector";

  // For sector view, signals are on sectors. For stock views, signals are on stocks.
  const getSignalName = (b) => (isSectorView ? b.sector : b.stock);

  if (collapsed) {
    return (
      <div
        onClick={onToggle}
        style={{
          width: 40,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 6,
          padding: "12px 8px",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
        title="Expand signal panel"
      >
        <span
          style={{
            fontSize: 9,
            color: "#94a3b8",
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            letterSpacing: 1,
          }}
        >
          SIGNALS
        </span>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            fontSize: 10,
          }}
        >
          <span style={{ color: "#22c55e" }}>▲{signals.buys.length}</span>
          <span style={{ color: "#ef4444" }}>▼{signals.sells.length}</span>
          <span style={{ color: "#facc15" }}>!{signals.warns.length}</span>
        </div>
      </div>
    );
  }

  const totalSignals =
    signals.buys.length + signals.sells.length + signals.warns.length;

  return (
    <div
      style={{
        width: 200,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 6,
        padding: "10px 12px",
        height: "100%",
        overflowY: "auto",
        fontFamily: "system-ui",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "#94a3b8",
            letterSpacing: 0.8,
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          Today's Signals
        </div>
        {onToggle && (
          <button
            onClick={onToggle}
            style={{
              fontSize: 10,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 3,
              color: "#94a3b8",
              cursor: "pointer",
              padding: "2px 6px",
            }}
            title="Collapse panel"
          >
            ▶
          </button>
        )}
      </div>

      {totalSignals === 0 && (
        <div
          style={{
            fontSize: 11,
            color: "#64748b",
            textAlign: "center",
            padding: "20px 0",
            fontStyle: "italic",
          }}
        >
          No signals today
        </div>
      )}

      {/* BUY SECTION */}
      {signals.buys.length > 0 && (
        <SignalSection
          label="BUY"
          color="#22c55e"
          icon="▲"
          items={signals.buys.slice(0, maxSignalsPerType)}
          getName={getSignalName}
          onItemClick={onSignalClick}
          accentColor="rgba(34,197,94,0.3)"
        />
      )}

      {/* SELL SECTION */}
      {signals.sells.length > 0 && (
        <SignalSection
          label="SELL"
          color="#ef4444"
          icon="▼"
          items={signals.sells.slice(0, maxSignalsPerType)}
          getName={getSignalName}
          onItemClick={onSignalClick}
          accentColor="rgba(239,68,68,0.3)"
        />
      )}

      {/* WARN SECTION */}
      {signals.warns.length > 0 && (
        <SignalSection
          label="WATCH"
          color="#facc15"
          icon="!"
          items={signals.warns.slice(0, maxSignalsPerType)}
          getName={getSignalName}
          onItemClick={onSignalClick}
          accentColor="rgba(250,204,21,0.3)"
        />
      )}

      {/* WHALES SECTION */}
      {whales.length > 0 && !isSectorView && (
        <>
          <div
            style={{
              height: 1,
              background: "rgba(255,255,255,0.06)",
              margin: "12px 0 10px",
            }}
          />
          <div
            style={{
              fontSize: 9,
              color: "#a78bfa",
              letterSpacing: 0.8,
              textTransform: "uppercase",
              fontWeight: 500,
              marginBottom: 6,
            }}
          >
            🐋 Top whales
          </div>
          {whales.map((w) => (
            <div
              key={w.symbol}
              onClick={() => onSignalClick?.(w.symbol)}
              style={{
                fontSize: 11,
                padding: "4px 6px",
                marginBottom: 3,
                cursor: onSignalClick ? "pointer" : "default",
                borderRadius: 4,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(167,139,250,0.05)",
                border: "1px solid rgba(167,139,250,0.15)",
              }}
            >
              <span style={{ color: "#e5e7eb", fontWeight: 500 }}>
                {w.symbol}
              </span>
              <span
                style={{
                  color: w.priceChange >= 0 ? "#22c55e" : "#ef4444",
                  fontSize: 10,
                }}
              >
                {w.priceChange >= 0 ? "+" : ""}
                {w.priceChange.toFixed(1)}%
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
});

// =====================================================================
// Signal section sub-component
// =====================================================================
function SignalSection({
  label,
  color,
  icon,
  items,
  getName,
  onItemClick,
  accentColor,
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 9,
          color,
          letterSpacing: 0.8,
          textTransform: "uppercase",
          fontWeight: 500,
          marginBottom: 4,
        }}
      >
        {label} ({items.length})
      </div>

      {items.map((b, i) => {
        const sig = b.bubbleSignal;
        const isStrict = sig.tier === "strict";
        const validation = b.signalValidation || "tentative";
        const validationIcon =
          validation === "confirmed"
            ? "✓"
            : validation === "failed"
              ? "✗"
              : "⏳";

        return (
          <div
            key={`${getName(b)}-${i}`}
            onClick={() => onItemClick?.(getName(b))}
            style={{
              padding: "6px 8px",
              marginBottom: 4,
              borderRadius: 4,
              background: "rgba(255,255,255,0.03)",
              borderLeft: `2px solid ${color}`,
              cursor: onItemClick ? "pointer" : "default",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.03)";
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ color, fontSize: 12, fontWeight: 500 }}>
                  {icon}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "#e5e7eb",
                  }}
                >
                  {getName(b)}
                </span>
              </div>

              {isStrict && (
                <span
                  style={{
                    fontSize: 8,
                    padding: "1px 4px",
                    borderRadius: 2,
                    background: color,
                    color: "#0a0a0a",
                    fontWeight: 500,
                    letterSpacing: 0.3,
                  }}
                >
                  STRICT
                </span>
              )}
            </div>

            <div
              style={{
                fontSize: 9,
                color: "#94a3b8",
                marginTop: 2,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>{formatPatternName(sig.pattern)}</span>
              <span style={{ color: getValidationColor(validation) }}>
                {validationIcon} {validation}
              </span>
            </div>

            {sig.confluence && (
              <div
                style={{
                  fontSize: 8,
                  color: "#a78bfa",
                  marginTop: 2,
                  fontWeight: 500,
                }}
              >
                🎯 {sig.patternCount} patterns matched
              </div>
            )}

            {sig.recoveryMode && (
              <div
                style={{
                  fontSize: 8,
                  color: "#22c55e",
                  marginTop: 2,
                  fontWeight: 500,
                }}
              >
                🚀 Recovery mode
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatPatternName(pattern) {
  if (!pattern) return "—";
  // Convert CUMULATIVE_ACCUMULATION → Cumulative accumulation
  return pattern
    .split("_")
    .map((w, i) =>
      i === 0
        ? w.charAt(0) + w.slice(1).toLowerCase()
        : w.toLowerCase(),
    )
    .join(" ");
}

function getValidationColor(validation) {
  if (validation === "confirmed") return "#22c55e";
  if (validation === "failed") return "#ef4444";
  return "#94a3b8";
}

export default SignalPanel;