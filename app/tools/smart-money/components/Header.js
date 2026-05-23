// app\tools\smart-money\components\Header.js

"use client";

import DashboardHeader from "@/app/components/DashboardHeader";
import { canShowOnDevice } from "@/app/utils/deviceVisibility";
import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import BubbleSizeControl from "./BubbleSizeControl";
import StockSearch from "@/app/components/Search";
import CustomDropdown from "@/components/customDropDown";
import PremiumFeature from "@/components/PremiumFeature";

const MemoSearch = React.memo(StockSearch);

export default function Header({
  useShouldApplyControls,
  setUseShouldApplyControls,
  useRelative,
  setUseRelative,
  bubbleControls,
  setBubbleControls,
  searchQuery,
  setSearchQuery,
  setSelectedSector,
  allSymbols,
  onSearch,
  rowPosition,
  setRowPosition,
  fixTooltip,
  setFixTooltip,
  hideBands,
  setHideBands,
  mode,
  setMode,
  setActiveCategory,
  showWatermark,
  setShowWatermark,
  showTooltip,
  setShowTooltip,
  setHighlightStock,
  pastDays,
  setPastDays,
  enableSignalEngine,
  setEnableSignalEngine,
}) {
  const [showViewPanel, setShowViewPanel] = useState(false);
  const panelRef = useRef();
  const [screenWidth, setScreenWidth] = useState(1600);

  useEffect(() => {
    const update = () => {
      setScreenWidth(window.innerWidth);
    };

    update();

    window.addEventListener("resize", update);

    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowViewPanel(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function CheckboxItem({ label, checked, onChange }) {
    const [hover, setHover] = React.useState(false);

    return (
      <label
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "6px 8px",
          cursor: "pointer",

          // 🎯 TEXT COLOR
          color: hover ? "#ffffff" : "#e5e7eb",

          // 🎯 BACKGROUND HOVER
          background: hover
            ? "rgba(250,204,21,0.12)" // soft yellow
            : "transparent",

          // 🎯 BORDER GLOW
          borderRadius: 6,
          border: hover
            ? "1px solid rgba(250,204,21,0.5)"
            : "1px solid transparent",

          // 🎯 SMOOTH ANIMATION
          transition: "all 0.18s ease",
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{
            accentColor: "#facc15", // 🔥 yellow checkbox
            cursor: "pointer",
          }}
        />

        <span
          style={{
            fontWeight: hover ? 600 : 500,
            letterSpacing: 0.2,
          }}
        >
          {label}
        </span>
      </label>
    );
  }

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        alignItems: "center",
        justifyContent: "space-between",

        background: "rgba(2,6,23,0.95)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        gap: "12px",
      }}
    >
      <DashboardHeader>
        {/* 🔹 RIGHT: CONTROLS */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {canShowOnDevice("STOCK_SEARCH", screenWidth) && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                alignItems: "top",
              }}
            >
              <div className="search-wrapper">
                <div
                  style={{
                    position: "relative",
                    zIndex: 200,
                  }}
                >
                  <MemoSearch
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    setSectorFilter={setSelectedSector}
                    allSymbols={allSymbols}
                    onSearch={onSearch}
                  />
                </div>
              </div>
            </div>
          )}
          {canShowOnDevice("APPLY_CONTROLS", screenWidth) && (
            <PremiumFeature feature="APPLY_CONTROLS" showLocked>
              <label
                className="custom-checkbox"
                style={{
                  marginLeft: 20,
                }}
              >
                <input
                  type="checkbox"
                  checked={useShouldApplyControls}
                  onChange={(e) => {
                    const checked = e.target.checked;

                    setUseShouldApplyControls(checked);

                    if (checked) {
                      // ✅ ON → Enable full engine
                      setUseRelative(true);

                      setBubbleControls({
                        price: true,
                        volume: true,
                        delivery: true,
                        oi: true,
                      });
                    } else {
                      // ❌ OFF → Clean base state
                      setUseRelative(false);

                      setBubbleControls({
                        price: false,
                        volume: false,
                        delivery: false,
                        oi: false,
                      });
                    }
                  }}
                />
                <span className="checkmark" />
                <span className="label-text">Apply Controls</span>
              </label>
            </PremiumFeature>
          )}
          <PremiumFeature feature="APPLY_CONTROLS">
            <BubbleSizeControl
              controls={bubbleControls}
              setControls={setBubbleControls}
              useShouldApplyControls={useShouldApplyControls}
            />
            <label
              className="custom-checkbox"
              style={{
                marginLeft: 20,
                // ✅ ADD THESE
                opacity: useShouldApplyControls ? 1 : 0.4,
                cursor: useShouldApplyControls ? "pointer" : "not-allowed",
                pointerEvents: useShouldApplyControls ? "auto" : "none",
              }}
            >
              <input
                type="checkbox"
                checked={useRelative}
                disabled={!useShouldApplyControls}
                onChange={(e) => setUseRelative(e.target.checked)}
              />
              <span className="checkmark" />
              <span className="label-text">Relative Size</span>
            </label>
          </PremiumFeature>
        </div>

        {/* 🔘 Past Days */}
        {/* 🔘 Past Days */}
        <CustomDropdown
          label="Past Days"
          width={150}
          value={pastDays}
          onChange={setPastDays}
          options={[
            { value: 30, label: "30 Days" },
            { value: 45, label: "45 Days" },
            { value: 60, label: "60 Days" },
            { value: 75, label: "75 Days" },
            { value: 90, label: "90 Days" },
            { value: 120, label: "120 Days", premium: true }, // 🔒 Premium
            { value: 180, label: "180 Days", premium: true }, // 🔒 Premium
            { value: null, label: "All Data", premium: true }, // 🔒 Premium
          ]}
        />
        {canShowOnDevice("BUBBLE_POSITION", screenWidth) && (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <CustomDropdown
              label="Bubble Position"
              width={110}
              value={rowPosition}
              onChange={setRowPosition}
              options={[
                { value: "top", label: "Top" },
                { value: "center", label: "Center" },
                { value: "bottom", label: "Bottom" },
              ]}
            />

            <div ref={panelRef} style={{ position: "relative" }}>
              {/* 🔘 BUTTON */}
              <button
                onClick={() => setShowViewPanel((v) => !v)}
                style={{
                  padding: "6px 12px",
                  borderRadius: showViewPanel ? "4px 4px 0px 0px" : 4,
                  background: showViewPanel
                    ? "rgba(2,6,23,0.98)"
                    : "rgba(30,41,59,0.9)",
                  color: "#e5e7eb",

                  // 🔥 DYNAMIC BORDER
                  border: showViewPanel
                    ? "1px solid #facc15"
                    : "1px solid rgba(255,255,255,0.1)",

                  borderBottom: showViewPanel
                    ? "0px solid #facc15"
                    : "1px solid rgba(255,255,255,0.1)",

                  cursor: "pointer",
                  fontWeight: 600,
                  transition: "all 0.2s ease",
                }}
              >
                ⚙ View
              </button>

              {/* 📦 PANEL */}
              {showViewPanel && (
                <div
                  style={{
                    position: "absolute",
                    top: 33,
                    right: 0,
                    width: 220,
                    background: "rgba(2,6,23,0.98)",

                    // 🔥 YELLOW BORDER
                    border: "1px solid #facc15",

                    borderRadius: "2px 0px 2px 2px",
                    padding: 12,
                    zIndex: -1,

                    // 🔥 STRONG GLOW
                    boxShadow: `
                  0 6px 10px rgba(0,0,0,0.6),
                  0 0 6px rgba(250,204,21,0.4)
                `,
                  }}
                >
                  {/* 🔥 NEW: Signal Engine toggle — placed FIRST for prominence */}
                  <CheckboxItem
                    label="🎯 Signal Engine (BUY/SELL)"
                    checked={enableSignalEngine}
                    onChange={setEnableSignalEngine}
                  />

                  {/* Divider */}
                  <div
                    style={{
                      height: 1,
                      background: "rgba(250,204,21,0.2)",
                      margin: "6px 0",
                    }}
                  />
                  {/* ITEM */}
                  <CheckboxItem
                    label="Show Watermark"
                    checked={showWatermark}
                    onChange={setShowWatermark}
                  />
                   {/*
                    <CheckboxItem
                      label="Fix Tooltip"
                      checked={fixTooltip}
                      onChange={setFixTooltip}
                    />
                  */}
                  <CheckboxItem
                    label="Show Tooltip"
                    checked={showTooltip}
                    onChange={setShowTooltip}
                  />

                  <CheckboxItem
                    label="No Bands"
                    checked={hideBands}
                    onChange={setHideBands}
                  />
                </div>
              )}
            </div>
            <PremiumFeature feature="APPLY_CONTROLS" showLocked>
              <span
                onClick={() => {
                  setActiveCategory(null);
                  setHighlightStock(null);
                  setSelectedSector?.(null);
                  setMode?.("all");
                }}
                style={{
                  marginLeft: 20,
                  //marginRight: 150,
                  cursor: "pointer",
                  fontWeight: 700,
                  padding: "6px 14px",
                  fontSize: 14,
                  borderRadius: 6,
                  background:
                    mode === "all"
                      ? "linear-gradient(135deg, #6366f1, #a78bfa)" // 🔥 blue → purple
                      : "rgba(55, 65, 81, 0.6)",

                  color: mode === "all" ? "#ffffff" : "#cbd5f5",

                  border:
                    mode === "all"
                      ? "1px solid rgba(167,139,250,0.6)"
                      : "1px solid rgba(255,255,255,0.08)",

                  boxShadow:
                    mode === "all" ? "0 0 12px rgba(99,102,241,0.5)" : "none",

                  transition: "all 0.2s ease",
                }}
              >
                All Stocks
              </span>
            </PremiumFeature>
          </div>
        )}
      </DashboardHeader>
    </div>
  );
}
