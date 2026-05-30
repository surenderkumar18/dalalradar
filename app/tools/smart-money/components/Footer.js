// app/tools/smart-money/components/Footer.js
//
// 🔧 FOOTER FIXES (this revision):
//
//   1. Mouse-hover effect on sector tabs — FIXED via state-based hover.
//      The visible sector tabs and the MORE-dropdown items had inline
//      `style` props for background/color but no hover state, so even if
//      a `.sector-tab:hover` CSS rule existed, the inline style would
//      win (higher specificity). Now `hoveredSector` (visible row) and
//      `hoveredOverflow` (MORE list) drive the same `style` prop, so
//      hover is consistent and survives any parent re-render.
//
//   2. Clicking a sector in MORE now PROMOTES it into the visible row.
//      Previously the click only set selectedSector — but visibleSectors
//      vs. overflowSectors is computed from the `sectors` array order,
//      and the clicked sector stayed beyond the visible cutoff. So you'd
//      see the dropdown close, the chart switch, but the visible row
//      wouldn't show your selection. Now we splice the clicked sector
//      into the last-visible position via moveSector, pushing the
//      previously-last visible into the overflow. User's manual sector
//      order is otherwise preserved.
//
//   3. useEffect → useLayoutEffect for overflow calc, so the visible/
//      overflow recomputation runs before paint after a promotion (no
//      one-frame flicker showing the stale visible row).

"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

// Isomorphic layout effect — useLayoutEffect on the client, useEffect on
// the server (Next.js SSR would otherwise warn). Footer is "use client"
// so this mostly matters for the first render hydration step.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const indicatorStyle = {
  width: 3,
  height: 24,
  background: "var(--gold, #ffd40c)",
  borderRadius: 2,
  marginRight: 6,
  flexShrink: 0,
};

const Footer = React.memo(function Footer({
  sectors = [],
  selectedSector,
  setActiveCategory,
  onSectorClick,
  sectorRefs,
  mode,
  setCameFromSector,
  onBack,
  draggingSector,
  setDraggingSector,
  moveSector,
  dropIndex,
  setDropIndex,
  setMode,
  favoriteStocks,
}) {
  const [showMore, setShowMore] =
    useState(false);

  const [visibleSectors, setVisibleSectors] =
    useState([]);

  const [overflowSectors, setOverflowSectors] =
    useState([]);

  // 🔧 HOVER STATE — one source of truth per row (visible vs overflow).
  // Both feed the same `style` prop on the tabs, so a parent re-render
  // can't clobber the highlight the way an imperative
  //   e.currentTarget.style.background = "..."
  // approach would.
  const [hoveredSector, setHoveredSector] =
    useState(null);

  const [hoveredOverflow, setHoveredOverflow] =
    useState(null);

  const containerRef = useRef(null);

  const sectorMeasureRef = useRef({});

  // =========================================
  // 📏 DYNAMIC OVERFLOW CALCULATION
  //
  // useLayoutEffect (not useEffect) so the recomputation runs after the
  // DOM commits but BEFORE the browser paints. When we promote a sector
  // from MORE into the visible row (via moveSector), `sectors` changes,
  // this effect re-runs, and visibleSectors/overflowSectors update in
  // the same pre-paint pass — no one-frame flicker where the old visible
  // row paints first.
  // =========================================

  useIsoLayoutEffect(() => {
    function calculateOverflow() {
      if (!containerRef.current) return;

      const containerWidth =
        containerRef.current.offsetWidth;

      // Reserve space:
      // Favorites + Back Button + More Button
      const reservedWidth = 420;

      let usedWidth = 0;

      const visible = [];
      const overflow = [];

      sectors.forEach((sec) => {
        const el =
          sectorMeasureRef.current[sec];

        const width =
          (el?.offsetWidth || 100) + 14;

        if (
          usedWidth + width <
          containerWidth - reservedWidth
        ) {
          visible.push(sec);

          usedWidth += width;
        } else {
          overflow.push(sec);
        }
      });

      setVisibleSectors(visible);
      setOverflowSectors(overflow);
    }

    calculateOverflow();

    window.addEventListener(
      "resize",
      calculateOverflow
    );

    return () =>
      window.removeEventListener(
        "resize",
        calculateOverflow
      );
  }, [sectors]);

  // 🔧 PROMOTE: when user clicks a sector inside MORE, slot it into the
  // last visible position so the visible row reflects their selection.
  // The previously-last visible sector gets pushed into MORE. Everything
  // else keeps its relative order.
  const promoteOverflowSector = (sec) => {
    const from = sectors.indexOf(sec);
    if (from < 0) return;

    const to = Math.max(
      0,
      visibleSectors.length - 1
    );

    if (from > to) {
      moveSector(from, to);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();

        const rect =
          e.currentTarget.getBoundingClientRect();

        if (e.clientX > rect.right - 40) {
          if (dropIndex !== sectors.length) {
            setDropIndex(sectors.length);
          }
        }
      }}
      style={{
        position: "sticky",
        bottom: 0,
        zIndex: 100,

        display: "flex",
        gap: "14px",

        overflow: "visible",

        whiteSpace: "nowrap",

        padding: "12px 12px",

        background:
          "var(--bg-footer, rgba(11, 18, 32, 0.95))",

        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",

        borderTop: "1px solid var(--line)",

        fontWeight: 500,
        fontSize: 16,

        paddingLeft: 18,
        paddingRight: 160,
      }}
    >
      {/* =========================================
          📏 HIDDEN MEASURE LAYER
      ========================================== */}

      <div
        style={{
          position: "absolute",
          visibility: "hidden",
          pointerEvents: "none",
          display: "flex",
          top: -9999,
          left: -9999,
        }}
      >
        {sectors.map((sec) => (
          <span
            key={sec}
            ref={(el) =>
              (sectorMeasureRef.current[sec] =
                el)
            }
            style={{
              padding: "6px 12px",
              fontSize: 14,
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            {sec}
          </span>
        ))}
      </div>

      <div
        ref={containerRef}
        style={{
          display: "flex",
          justifyContent: "left",
          gap: "14px",

          whiteSpace: "nowrap",

          fontWeight: 500,
          fontSize: 14,

          width: "100%",

          alignItems: "center",

          overflow: "visible",
        }}
      >
        {/* =========================================
            ⭐ FAVORITES BUTTON
        ========================================== */}

        <button
          onClick={() => {
            setMode("favorites");

            onSectorClick?.(null);
          }}
          style={{
            padding: "6px 12px",

            borderRadius: 6,

            border: 0,

            fontWeight: 600,
            fontSize: 16,

            cursor: "pointer",

            flexShrink: 0,

            background:
              mode === "favorites"
                ? "var(--green)"
                : "var(--bg-3, #1e293b)",

            color:
              mode === "favorites"
                ? "#0a0a0c"
                : "var(--gold, #facc15)",

            boxShadow:
              mode === "favorites"
                ? "0 0 12px var(--green-glow)"
                : "none",

            transition: "all 0.2s ease",
          }}
        >
          ⭐ Favorites{" "}
          <span
            style={{
              color:
                mode === "favorites"
                  ? "#0a0a0c"
                  : "#ffffff",

              fontWeight: 700,
            }}
          >
            ({favoriteStocks?.length || 0})
          </span>
        </button>

        {/* =========================================
            🔘 VISIBLE SECTOR TABS
        ========================================== */}

        {visibleSectors.map((sec, index) => {
          const isActive =
            sec === selectedSector &&
            mode !== "favorites";

          // 🔧 Single source of truth for hover. Drives the same
          // `style` prop as `isActive`, so React renders can't
          // clobber the highlight.
          const isHovered =
            hoveredSector === sec && !isActive;

          return (
            <React.Fragment key={sec}>
              {dropIndex === index && (
                <div style={indicatorStyle} />
              )}

              <span
                ref={(el) =>
                  (sectorRefs.current[sec] = el)
                }
                className={`sector-tab ${
                  isActive ? "active" : ""
                }`}
                onClick={() => {
                  if (draggingSector) return;

                  setActiveCategory(null);

                  onSectorClick?.(sec);
                }}
                onMouseEnter={() =>
                  setHoveredSector(sec)
                }
                onMouseLeave={() =>
                  setHoveredSector((prev) =>
                    prev === sec ? null : prev
                  )
                }
                style={{
                  flexShrink: 0,

                  padding: "6px 12px",

                  borderRadius: 4,

                  background: isActive
                    ? "var(--green)"
                    : isHovered
                      ? "rgba(255,255,255,0.08)"
                      : "transparent",

                  color: isActive
                    ? "#0a0a0c"
                    : isHovered
                      ? "#ffffff"
                      : "#94a3b8",

                  fontWeight: isActive
                    ? 700
                    : 500,

                  transition:
                    "all 0.15s ease",

                  cursor: draggingSector
                    ? "grabbing"
                    : "pointer",

                  opacity:
                    draggingSector === sec
                      ? 0.5
                      : 1,
                }}
                draggable
                onDragStart={(e) => {
                  setDraggingSector(sec);

                  e.dataTransfer.effectAllowed =
                    "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();

                  if (dropIndex !== index) {
                    setDropIndex(index);
                  }
                }}
                onDrop={() => {
                  if (
                    dropIndex == null ||
                    !draggingSector
                  )
                    return;

                  const from =
                    sectors.indexOf(
                      draggingSector
                    );

                  const to = dropIndex;

                  moveSector(from, to);

                  setDraggingSector(null);

                  setDropIndex(null);
                }}
                onDragEnd={() => {
                  setDraggingSector(null);

                  setDropIndex(null);
                }}
              >
                {sec}
              </span>
            </React.Fragment>
          );
        })}

        {/* =========================================
            📱 MORE DROPDOWN
        ========================================== */}

        {overflowSectors.length > 0 && (
          <div
            style={{
              position: "relative",
              flexShrink: 0,
            }}
          >
            <button
              onClick={() =>
                setShowMore(!showMore)
              }
              style={{
                padding: "6px 12px",

                borderRadius: 6,

                border:
                  "1px solid rgba(255,255,255,0.1)",

                background:
                  "linear-gradient(180deg,#1e293b,#0f172a)",

                color: "#fff",

                fontWeight: 700,

                cursor: "pointer",

                flexShrink: 0,
              }}
            >
              MORE ▼
            </button>

            {showMore && (
              <div
                style={{
                  position: "absolute",

                  bottom: 48,
                  left: 0,

                  background: "#0f172a",

                  border:
                    "1px solid rgba(255,255,255,0.1)",

                  borderRadius: 8,

                  minWidth: 200,

                  maxHeight: 320,

                  overflowY: "auto",

                  zIndex: 999,

                  boxShadow:
                    "0 10px 40px rgba(0,0,0,0.5)",
                }}
              >
                {overflowSectors.map((sec) => {
                  const isActive =
                    sec === selectedSector;

                  // 🔧 Hover for overflow items — same pattern as
                  // visible tabs.
                  const isHovered =
                    hoveredOverflow === sec &&
                    !isActive;

                  return (
                    <div
                      key={sec}
                      onClick={() => {
                        setShowMore(false);

                        setActiveCategory(null);

                        // 🔧 Move clicked sector into the visible
                        // row BEFORE we notify the parent of the
                        // selection. Order: reorder first so the
                        // useLayoutEffect picks up the new sectors
                        // array on the same render as the
                        // selectedSector update from onSectorClick.
                        promoteOverflowSector(
                          sec
                        );

                        onSectorClick?.(sec);
                      }}
                      onMouseEnter={() =>
                        setHoveredOverflow(sec)
                      }
                      onMouseLeave={() =>
                        setHoveredOverflow(
                          (prev) =>
                            prev === sec
                              ? null
                              : prev
                        )
                      }
                      style={{
                        padding: "10px 14px",

                        cursor: "pointer",

                        background: isActive
                          ? "var(--green)"
                          : isHovered
                            ? "rgba(255,255,255,0.08)"
                            : "transparent",

                        color: isActive
                          ? "#0a0a0c"
                          : isHovered
                            ? "#ffffff"
                            : "#e2e8f0",

                        fontWeight: isActive
                          ? 700
                          : 500,

                        borderBottom:
                          "1px solid rgba(255,255,255,0.05)",

                        transition:
                          "background 0.12s ease, color 0.12s ease",
                      }}
                    >
                      {sec}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {dropIndex === sectors.length && (
          <div style={indicatorStyle} />
        )}

        {/* =========================================
            ← BACK BUTTON
        ========================================== */}

        {mode !== "sector" && (
          <span
            onClick={() => {
              setActiveCategory(null);

              setCameFromSector(false);

              onBack?.();
            }}
            style={{
              cursor: "pointer",

              color: "#0a0a0c",

              fontWeight: 600,
              fontSize: 16,

              position: "absolute",

              right: 16,

              flexShrink: 0,

              background:
                "var(--gold, #facc15)",

              borderRadius: 4,

              padding: "4px 12px",

              transition:
                "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                "#fde047";

              e.currentTarget.style.boxShadow =
                "0 0 12px rgba(250,204,21,0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                "var(--gold, #facc15)";

              e.currentTarget.style.boxShadow =
                "none";
            }}
          >
            <span
              style={{
                fontWeight: 800,
                fontSize: 22,
                lineHeight: "20px",
                marginRight: 2,
              }}
            >
              ←
            </span>

            Back to Sectors
          </span>
        )}
      </div>
    </div>
  );
});

export default Footer;