import React, { useRef } from "react";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import MiniRolloverBars from "./MiniRolloverBars";
import OIPriceChart from "@/app/components/OIPriceChart";

// ✅ OPTIONAL: memo (recommended)
const MemoMiniRolloverBars = React.memo(MiniRolloverBars);
const MemoOIPriceChart = React.memo(OIPriceChart);

function formatMoney(val) {
  if (!val) return "";

  if (val >= 1_00_00_000) {
    return (val / 1_00_00_000).toFixed(0) + " Cr";
  } else if (val >= 1_00_000) {
    return (val / 1_00_000).toFixed(0) + " L";
  } else {
    return val.toLocaleString("en-IN");
  }
}

function formatTurnover(val) {
  if (!val) return "";
  return (val / 100).toFixed(1) + " Cr";
}

function formatTurnoverCr(val) {
  if (!val) return "";

  const cr = val / 100; // 🔥 convert Lakhs → Cr
  return Math.round(cr).toLocaleString("en-IN") + " Cr";
}
export default function FloatingTooltip({
  tooltipRef,
  latestDate,
  mode,
  fixTooltip,
}) {
  const [, forceUpdate] = useState(0);
  const tooltipBoxRef = useRef(null);
  const [dragPos, setDragPos] = useState({ x: null, y: null });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // 🔥 RAF instead of setInterval
  useEffect(() => {
    let raf;
    const loop = () => {
      if (tooltipRef.current.visible) {
        forceUpdate((n) => n + 1);
        raf = requestAnimationFrame(loop);
      }
    };

    if (tooltipRef.current.visible) {
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!dragging) return;

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging]);

  const handleMouseDown = (e) => {
    if (!fixTooltip) return;

    setDragging(true);

    const rect = tooltipBoxRef.current?.getBoundingClientRect();

    dragOffset.current = {
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0),
    };
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;

    setDragPos({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y,
    });
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  const t = tooltipRef.current;
  if (!t.visible || !t.data) return null;

  const d = t.data;

  // 🎯 SMART POSITIONING
const tooltipWidth = 340;

// 🔥 REAL dynamic height (no guess)
let tooltipHeight = 600;

if (tooltipBoxRef.current) {
  const rect = tooltipBoxRef.current.getBoundingClientRect();
  if (rect.height) tooltipHeight = rect.height;
}

const GAP = 16;
const SAFE_ZONE = 100; // distance from cursor

// 🔥 ALWAYS use cursor (not bubble)
const cursorX = t.mouseX ?? t.x;
const cursorY = t.mouseY ?? t.y;

let x = 0;
let y = 0;

// ==========================
// 🔒 FIXED MODE (DRAG MODE)
// ==========================
if (fixTooltip) {
  x = dragPos.x ?? window.innerWidth - tooltipWidth - 40;
  y = dragPos.y ?? 80;
} else {
  // ==========================
  // 🎯 HORIZONTAL (SMART FLIP)
  // ==========================

  const spaceRight = window.innerWidth - cursorX;
  const spaceLeft = cursorX;

  // Prefer RIGHT
  if (spaceRight >= tooltipWidth + SAFE_ZONE) {
    x = cursorX + SAFE_ZONE;
  }
  // Else LEFT
  else if (spaceLeft >= tooltipWidth + SAFE_ZONE) {
    x = cursorX - tooltipWidth - SAFE_ZONE;
  }
  // ❗ FORCE FIT (center fallback)
  else {
    x = Math.max(
      10,
      Math.min(
        cursorX - tooltipWidth / 2,
        window.innerWidth - tooltipWidth - 10
      )
    );
  }

  // ==========================
  // 🎯 VERTICAL (NO CUT GUARANTEE)
  // ==========================

  const spaceAbove = cursorY;
  const spaceBelow = window.innerHeight - cursorY;

  // Prefer BELOW
  if (spaceBelow >= tooltipHeight + SAFE_ZONE) {
    y = cursorY + SAFE_ZONE;
  }
  // Else ABOVE
  else if (spaceAbove >= tooltipHeight + SAFE_ZONE) {
    y = cursorY - tooltipHeight - SAFE_ZONE;
  }
  // ❗ FORCE FIT (center vertically)
  else {
    y = Math.max(
      10,
      Math.min(
        cursorY - tooltipHeight / 2,
        window.innerHeight - tooltipHeight - 10
      )
    );
  }

  // ==========================
  // 🧱 FINAL HARD CLAMP (CRITICAL)
  // ==========================

  // Horizontal safety
  if (x + tooltipWidth > window.innerWidth) {
    x = window.innerWidth - tooltipWidth - 10;
  }
  if (x < 10) x = 10;

  // Vertical safety (THIS FIXES YOUR ISSUE)
  if (y + tooltipHeight > window.innerHeight) {
    y = window.innerHeight - tooltipHeight - 10;
  }
  if (y < 10) y = 10;
}
 
  const fill = d.price > 0 ? "#22c55e" : "#ef4444";

  const isStock = d.stock !== undefined;

  return createPortal(
    <div
      ref={tooltipBoxRef}
      onMouseDown={handleMouseDown}
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 9999,
        pointerEvents: fixTooltip ? "auto" : "none",
        userSelect: "none",
        opacity: dragging ? 0.85 : 1,
        cursor: fixTooltip ? (dragging ? "grabbing" : "grab") : "default",

        background: "linear-gradient(180deg,#0b0b0c,#111)",
        border: "1px solid #333",
        borderRadius: 6,
        padding: "12px 14px",
        minWidth: 300,
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
      {/* SECTOR */}
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
      {/* DATE */}
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

      {/* TURNOVER */}
      {!isStock && (
        <div style={{ fontSize: 16 }}>
          Turnover:{" "}
          <b style={{ color: "#60a5fa" }}>{formatTurnoverCr(d.turnover)}</b>
        </div>
      )}
      {/* HEADER */}
      <div
        style={{
          fontSize: 22,
          color: "#c084fc",
          fontWeight: 600,
        }}
      >
        {d.stock}
      </div>

      <div
        style={{
          fontSize: 18,
          color: "#1bbbd7",
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        {new Date(d.x).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </div>

      {/* MAIN GRID */}
      <div
        style={{
          display: "flex",
          gap: 20,
        }}
      >
        <div style={{ flex: 1 }}>
          {/* STOCK */}
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
          {/* 🔥 OI */}
          {isStock && (
            <div
              style={{
                fontSize: 16,
              }}
            >
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
        <div
          style={{
            width: 1,
            background:
              "linear-gradient(to bottom, transparent, #facc15, transparent)",
            opacity: 0.6,
            marginTop: 40,
          }}
        />

        <div style={{ flex: 1 }}>
          {/* DATE */}
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
          {/* PRICE */}
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
          {/* PRICE % Change*/}
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
          {/* TURNOVER */}
          {isStock && (
            <div style={{ fontSize: 16 }}>
              Turnover:{" "}
              <b style={{ color: "#60a5fa" }}>{formatTurnoverCr(d.turnover)}</b>
            </div>
          )}
          {/* CHANGE */}
          {isStock && (
            <div style={{ fontSize: 16 }}>
              Change:{" "}
              <b style={{ color: fill }}>{d.turnoverChange?.toFixed(2)}%</b>
            </div>
          )}
          {/* Delivery % */}
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
          {isStock && (
            <div style={{ fontSize: 16 }}>
              OI Signal: <b style={{ color: "#a78bfa" }}>{d.oiAnalysis}</b>
            </div>
          )}
          {/* INTENT TAG 
                      {intent && (
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 14,
                            color: "#22c55e",
                            fontWeight: 600,
                            letterSpacing: 0.5,
                          }}
                        >
                          {intent}
                        </div>
                      )}
                        */}
          {/**
                       *  futPrice: f.FUT_PRICE || 0,
                          futPriceChange: f["FUT_PRICE CHANGE %"] || 0,
                          lotSize: f["Lot size"] ?? 0,
                          lots: f.Lots || 0,
                          openInterest: f.OI || 0,
                          oiChangePct: f["OI CHANGE %"] ?? 0,
                          fnoVolume: f.TtlTradgVol_contr || 0,
                          shares: f.TtlTradgVol_shares || 0,
                          fnoTurnover: f.TtlTrfVal || 0,
                          expiry: f["Near Expiry"] || null,
                          // 🔥 ADD THESE
                          totalTrades: f.TtlNbOfTxsExctd || 0,
                          contracts: f.TtlTradgVol_contr || 0,
                          avgTradeSize: f.AvgTradeSize || 0,
                          oiAnalysis: f["OI Analysis"] || "neutral",
                       */}
        </div>
      </div>

      {/* 🔥 ROLLOVER */}
      <div style={{ marginTop: 10 }}>
        <MemoMiniRolloverBars
          symbol={d.stock}
          data={d.rolloverData}
          currentDate={d.x}
          latestDate={latestDate}
        />
      </div>

      {/* 🔥 OI CHART */}
      <div style={{ marginTop: 10 }}>
        <MemoOIPriceChart
          symbol={d.stock}
          currentDate={d.x}
          canvasHeight={180}
          onClose={() => {}}
        />
      </div>
    </div>,
    document.body,
  );
}
