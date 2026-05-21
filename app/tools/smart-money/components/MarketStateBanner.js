"use client";

import React, { useMemo } from "react";
import { computeMarketState } from "../utils/computeMarketState";

// =====================================================================
// 📊 MARKET STATE BANNER — Universal component for ALL views
//
// Shows:
//   - Current view context (Sector Radar / Pharma stocks / etc.)
//   - Market regime (Risk-on / Risk-off / Neutral)
//   - VIX proxy + status
//   - Breadth % up
//   - Rotation counts (in/out)
//   - Top hot sector + Top cold sector
//   - Whale of the day
//
// Drop this into: tools/bubbleChart/components/MarketStateBanner.js
// =====================================================================

const REGIME_CONFIG = {
  risk_on: {
    label: "Risk-on",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.15)",
    border: "rgba(34,197,94,0.3)",
    icon: "↑",
  },
  risk_off: {
    label: "Risk-off",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.15)",
    border: "rgba(239,68,68,0.3)",
    icon: "↓",
  },
  neutral: {
    label: "Neutral",
    color: "#facc15",
    bg: "rgba(250,204,21,0.15)",
    border: "rgba(250,204,21,0.3)",
    icon: "→",
  },
  unknown: {
    label: "Loading…",
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.1)",
    border: "rgba(148,163,184,0.2)",
    icon: "?",
  },
};

const VIX_CONFIG = {
  calm:     { color: "#22c55e", label: "calm" },
  safe:     { color: "#86efac", label: "safe" },
  elevated: { color: "#facc15", label: "elevated" },
  panic:    { color: "#ef4444", label: "panic" },
  unknown:  { color: "#94a3b8", label: "—" },
};

const MarketStateBanner = React.memo(function MarketStateBanner({
  sectorBubbleData = [],
  stockBubbleData = [],
  latestDate,
  mode,
  selectedSector,
  selectedSectorRank,
  selectedSectorChange,
  totalSectors,
  collapsed = false,
  onToggle,
}) {
  // Compute market state from latest data
  const marketState = useMemo(
    () =>
      computeMarketState({
        sectorBubbleData,
        stockBubbleData,
        latestDate,
      }),
    [sectorBubbleData, stockBubbleData, latestDate],
  );

  const regime = REGIME_CONFIG[marketState.regime];
  const vix = VIX_CONFIG[marketState.vixStatus];

  // Title/breadcrumb varies by mode
  const title = useMemo(() => {
    if (mode === "sector") return "Sector Radar";
    if (mode === "stock" && selectedSector) {
      const rank = selectedSectorRank ? `#${selectedSectorRank}` : "";
      const change =
        selectedSectorChange != null
          ? `${selectedSectorChange >= 0 ? "+" : ""}${selectedSectorChange.toFixed(1)}%`
          : "";
      return (
        <span>
          <span style={{ color: "#a78bfa" }}>Sector Radar</span>
          <span style={{ color: "#64748b" }}> · </span>
          <span style={{ color: "#e5e7eb" }}>{selectedSector}</span>
          {rank && (
            <span style={{ color: "#facc15", marginLeft: 8, fontSize: 11 }}>
              {rank}/{totalSectors || "—"}
            </span>
          )}
          {change && (
            <span
              style={{
                color: selectedSectorChange >= 0 ? "#22c55e" : "#ef4444",
                marginLeft: 8,
                fontSize: 13,
              }}
            >
              {change}
            </span>
          )}
        </span>
      );
    }
    if (mode === "all") return "All Stocks · Market Overview";
    if (mode === "favorites") return "Favorites Watchlist";
    return "Sector Radar";
  }, [
    mode,
    selectedSector,
    selectedSectorRank,
    selectedSectorChange,
    totalSectors,
  ]);

  const dateLabel = useMemo(() => {
    if (!latestDate) return "—";
    return new Date(latestDate).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, [latestDate]);

  if (collapsed) {
    return (
      <div
        onClick={onToggle}
        style={{
          padding: "6px 12px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 11,
          color: "#94a3b8",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ color: regime.color, fontWeight: 500 }}>
          {regime.icon} {regime.label}
        </span>
        <span>VIX {marketState.vixProxy}</span>
        <span>Breadth {marketState.breadth.pct}%</span>
        <span>
          <span style={{ color: "#22c55e" }}>{marketState.rotation.in}</span>
          {" in · "}
          <span style={{ color: "#ef4444" }}>{marketState.rotation.out}</span>
          {" out"}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 10 }}>▼ Expand</span>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "linear-gradient(180deg, #111114, #0a0a0c)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 8,
        padding: "10px 16px",
        marginBottom: 8,
        fontFamily: "system-ui",
      }}
    >
      {/* TOP ROW: Title + Regime + Date */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              fontSize: 18,
              color: "#22c55e",
              fontWeight: 500,
            }}
          >
            📊
          </span>
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: "#e5e7eb",
                lineHeight: 1.2,
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#94a3b8",
                marginTop: 2,
              }}
            >
              {dateLabel} · 3:30 PM IST
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 500,
              background: regime.bg,
              color: regime.color,
              border: `1px solid ${regime.border}`,
            }}
          >
            {regime.icon} {regime.label} regime
          </span>
          {onToggle && (
            <button
              onClick={onToggle}
              style={{
                fontSize: 11,
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 4,
                color: "#94a3b8",
                cursor: "pointer",
                padding: "3px 8px",
              }}
              title="Collapse banner"
            >
              ▲
            </button>
          )}
        </div>
      </div>

      {/* DIVIDER */}
      <div
        style={{
          height: 1,
          background: "rgba(255,255,255,0.05)",
          margin: "10px 0",
        }}
      />

      {/* STATS ROW */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 16,
        }}
      >
        {/* Rotation In */}
        <StatBlock
          label="Rotating in"
          value={
            <span style={{ color: "#22c55e" }}>
              {marketState.rotation.in} sectors
            </span>
          }
          detail={
            marketState.topHot
              .slice(0, 3)
              .map((s) => s.name)
              .join(", ") || "—"
          }
        />

        {/* Rotation Out */}
        <StatBlock
          label="Rotating out"
          value={
            <span style={{ color: "#ef4444" }}>
              {marketState.rotation.out} sectors
            </span>
          }
          detail={
            marketState.topCold
              .slice(0, 3)
              .map((s) => s.name)
              .join(", ") || "—"
          }
        />

        {/* VIX */}
        <StatBlock
          label="VIX (proxy)"
          value={
            <span style={{ color: vix.color }}>
              {marketState.vixProxy ?? "—"}
            </span>
          }
          detail={vix.label}
        />

        {/* Breadth */}
        <StatBlock
          label="Breadth"
          value={
            <span
              style={{
                color:
                  marketState.breadth.pct >= 55
                    ? "#22c55e"
                    : marketState.breadth.pct >= 45
                      ? "#facc15"
                      : "#ef4444",
              }}
            >
              {marketState.breadth.pct}% up
            </span>
          }
          detail={marketState.breadth.label}
        />

        {/* Whale of day */}
        {marketState.whaleOfDay && (
          <StatBlock
            label="Whale of day"
            value={
              <span style={{ color: "#e5e7eb" }}>
                {marketState.whaleOfDay.symbol}
              </span>
            }
            detail={
              <span
                style={{
                  color:
                    marketState.whaleOfDay.priceChange >= 0
                      ? "#22c55e"
                      : "#ef4444",
                }}
              >
                {marketState.whaleOfDay.priceChange >= 0 ? "+" : ""}
                {marketState.whaleOfDay.priceChange.toFixed(1)}% ·{" "}
                {marketState.whaleOfDay.delivery.toFixed(0)}% deliv
              </span>
            }
          />
        )}
      </div>
    </div>
  );
});

// Small stat block component
function StatBlock({ label, value, detail }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div
        style={{
          fontSize: 10,
          color: "#64748b",
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: "#e5e7eb" }}>
        {value}
      </div>
      {detail && (
        <div
          style={{
            fontSize: 10,
            color: "#94a3b8",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {detail}
        </div>
      )}
    </div>
  );
}

export default MarketStateBanner;