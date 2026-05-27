"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  useLayoutEffect,
} from "react";

import { resolveSignalStyle } from "../utils/signalStyles.js";

import { resolveBubbleColor } from "@/app/tools/smart-money/utils/bubbleEngineSub.js";
import CustomTooltip from "./CustomTooltip.js";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";

// =====================================================================
// 🔥 PERF FIX P7: hoist CURSOR_STYLE as frozen module-level constant
// =====================================================================
const CURSOR_STYLE = Object.freeze({
  stroke: "#ffd40c",
  strokeWidth: 2,
  strokeDasharray: "1 1",
  opacity: 0.5,
});

// 🔥 HOVER HIT AREA — minimum hit radius regardless of bubble size.
// Tiny bubbles get a generous 18px hit zone so they're easy to hover.
const MIN_HIT_RADIUS = 18;
// Multiplier applied to visual radius for hit zone.
// 🔧 TUNED: 1.4 = forgiving without being absurdly large.
// Combined with overlap-tracking logic below, dense clusters still work.
const HIT_RADIUS_MULT = 1.4;

// =====================================================================
// 🔥 SMART ENTRY COLOR + OPACITY MATRIX
//
// Combines F2 (tier: strict vs relaxed delivery) with F3 (validation:
// confirmed / tentative / failed) into a final visual:
//
//   strict + confirmed  → BRIGHT GOLD, full opacity         (best signal)
//   strict + tentative  → BRIGHT GOLD, mid opacity          (waiting)
//   strict + failed     → DIM GRAY-GOLD, low opacity        (faded out)
//   relaxed + confirmed → MUTED YELLOW, full opacity        (worked but weak)
//   relaxed + tentative → MUTED YELLOW, mid opacity         (waiting)
//   relaxed + failed    → DIM GRAY, very low opacity        (failed)
//
// `validation === null` means F3 hasn't run (e.g. sector mode) → treat
// as tentative.
// =====================================================================
function resolveSmartEntryStyle(payload) {
  const tier = payload.smartTier || "strict";
  const validation = payload.smartValidation || "tentative";

  // STRICT TIER — bright gold base
  if (tier === "strict") {
    if (validation === "confirmed") {
      return { fill: "#FBB724", opacity: 1.0, glow: true };
    }
    if (validation === "failed") {
      return { fill: "#6b6b5c", opacity: 0.35, glow: false };
    }
    // tentative
    return { fill: "#FBB724", opacity: 0.7, glow: false };
  }

  // RELAXED TIER — muted yellow base (delivery was weak at entry)
  if (validation === "confirmed") {
    return { fill: "#bf9a3a", opacity: 0.85, glow: false };
  }
  if (validation === "failed") {
    return { fill: "#5e5e54", opacity: 0.25, glow: false };
  }
  // tentative
  return { fill: "#bf9a3a", opacity: 0.55, glow: false };
}

// =====================================================================
// 🔥 PERF FIX P2: DateTick — extracted memoized component for x-axis ticks
// =====================================================================
const DateTick = React.memo(
  function DateTick({
    x,
    y,
    payload,
    expiryColorMap,
    activeDate,
    onTickClick,
    onTickEnter,
    onTickLeave,
    onTickRegister,
    dateLabelRefs,
    viewportScale,
  }) {
    const date = Number(payload.value);

    onTickRegister(payload.value, x);

    const expiryIndex = expiryColorMap[date] ?? 0;
    const color = expiryIndex === 0 ? "#60a5fa" : "#c084fc";

    const isActive = activeDate === date;

    return (
      <g
        transform={`translate(${x + 12},${y})`}
        style={{ cursor: "pointer", pointerEvents: "all" }}
        onClick={(e) => onTickClick(e, date)}
        onMouseEnter={(e) => onTickEnter(e, date)}
        onMouseLeave={(e) => onTickLeave(e, date)}
      >
        <text
          ref={(el) => {
            if (el) dateLabelRefs.current[date] = el;
            else delete dateLabelRefs.current[date];
          }}
          data-date={date}
          transform="rotate(-45)"
          textAnchor="end"
          fill={isActive ? "#FFD700" : color}
          fontSize={
            viewportScale < 0.55
              ? isActive
                ? 9
                : 7
              : viewportScale < 0.75
                ? isActive
                  ? 11
                  : 9
                : viewportScale < 1
                  ? isActive
                    ? 13
                    : 11
                  : isActive
                    ? 14
                    : 12
          }
          fontWeight={isActive ? 800 : 400}
        >
          {new Date(date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          })}
        </text>
      </g>
    );
  },
  (a, b) =>
    a.x === b.x &&
    a.y === b.y &&
    a.payload.value === b.payload.value &&
    a.activeDate === b.activeDate &&
    a.expiryColorMap === b.expiryColorMap,
);

// =====================================================================
// 🔥 PERF FIX P1: hoisted bubble event handlers
// Previously every bubble had inline arrow-function handlers — 64,000
// closures per render. Now ONE function reference shared by all bubbles.
//
// Handlers read state via DOM data-* attributes and a per-instance context
// stored in a WeakMap (looked up by climbing the DOM).
//
// 🔥 HIT-AREA UPDATE: handlers now accept the *visible* bubble element by
// reading `data-target` from the hover-overlay <circle>. The overlay is
// the LARGER transparent circle that catches hover events; the visible
// bubble is its sibling. We highlight the SIBLING by ID lookup.
// =====================================================================

const bubbleContext = new WeakMap();

function findVisibleBubble(overlayEl) {
  // Strategy: overlay and visible bubble share a parent <g>.
  // Visible bubble has data-id, overlay has data-target equal to visible's id.
  const targetId = overlayEl.getAttribute("data-target");
  if (!targetId) return null;
  const ctx = bubbleContextLookup(overlayEl);
  if (!ctx) return null;
  return ctx.bubbleRefs.current.get(targetId) || null;
}

function handleBubbleEnter(e) {
  const overlayEl = e.currentTarget;
  const visibleEl = findVisibleBubble(overlayEl);
  if (!visibleEl) return;

  const key = visibleEl.getAttribute("data-id");
  if (!key) return;

  const ctx = bubbleContextLookup(overlayEl);
  if (!ctx) return;

  // 🔧 OVERLAP FIX: bail early if we're already highlighting this same bubble.
  // We re-fire this on every onMouseMove (see onHitMove below) to track which
  // of multiple overlapping bubbles is under the cursor. Without this guard
  // we'd thrash the DOM on every pixel of mouse movement over the same bubble.
  if (ctx.hoveredKeyRef.current === key) return;

  const date = String(visibleEl.getAttribute("data-x"));

  // === Date label highlight ===
  const prev = ctx.lastHighlightedRef.current;
  if (prev) {
    const prevDate = prev.getAttribute("data-date");
    const idx = ctx.expiryColorMap[Number(prevDate)] ?? 0;
    const originalColor = idx === 0 ? "#60a5fa" : "#c084fc";

    prev.setAttribute("fill", originalColor);
    prev.setAttribute("font-size", "12");
    prev.setAttribute("font-weight", "400");
  }

  const ele = ctx.dateLabelRefs.current[date];
  if (ele) {
    ele.setAttribute("fill", "#ffd40c");
    ele.setAttribute("font-size", "14");
    ele.setAttribute("font-weight", "800");
    ctx.lastHighlightedRef.current = ele;
  }

  // === Reset previously-hovered bubble ===
  const prevKey = ctx.hoveredKeyRef.current;
  if (prevKey && ctx.bubbleRefs.current.has(prevKey)) {
    const prevEl = ctx.bubbleRefs.current.get(prevKey);
    if (prevEl) {
      const wasWeak = prevEl.getAttribute("data-weak") === "1";
      prevEl.setAttribute(
        "stroke",
        wasWeak ? prevEl.getAttribute("fill") : "none",
      );
      prevEl.setAttribute("stroke-width", wasWeak ? "1.2" : "0");
      prevEl.style.transform = "scale(1)";
      prevEl.style.opacity = wasWeak ? "0.45" : "";
      prevEl.style.filter = "none";
    }
  }

  ctx.hoveredKeyRef.current = key;

  // === Highlight current bubble (visible sibling) ===
  visibleEl.setAttribute("stroke", "#ffffff");
  visibleEl.setAttribute("stroke-width", "2");
  visibleEl.style.transform = "scale(1.25)";
  visibleEl.style.opacity = "1";

  // 🔥 Restore hover glow
  const glowColor = visibleEl.getAttribute("fill") || "#ffffff";

  visibleEl.style.filter = `
  drop-shadow(0 0 4px ${glowColor})
  drop-shadow(0 0 8px ${glowColor})
  drop-shadow(0 0 14px ${glowColor})
`;
}

function handleBubbleLeave(e) {
  const overlayEl = e.currentTarget;
  const visibleEl = findVisibleBubble(overlayEl);
  const ctx = bubbleContextLookup(overlayEl);
  if (!ctx) return;

  // 🔧 OVERLAP FIX: only reset if we're leaving the bubble we were tracking.
  // When bubbles overlap, the mouse can fire:
  //   1. Enter on A    → hoveredKey = "A"
  //   2. Enter on B    → hoveredKey = "B"
  //   3. Leave on A    ← stale! mouse is still over B
  // Without this guard, step 3 would erase B's highlight even though the
  // cursor is still over B.
  if (visibleEl) {
    const leavingKey = visibleEl.getAttribute("data-id");
    if (leavingKey && ctx.hoveredKeyRef.current !== leavingKey) {
      return;
    }
  }

  // Also: if mouse is moving directly to ANOTHER bubble's hit-area,
  // skip the reset — the next Enter will swap the highlight smoothly.
  const related = e.relatedTarget;
  if (
    related &&
    related.nodeType === 1 &&
    related.getAttribute &&
    related.getAttribute("data-target")
  ) {
    return;
  }

  // === Reset date label highlight ===
  const prev = ctx.lastHighlightedRef.current;
  if (prev) {
    const prevDate = prev.getAttribute("data-date");
    const idx = ctx.expiryColorMap[Number(prevDate)] ?? 0;
    const originalColor = idx === 0 ? "#60a5fa" : "#c084fc";
    prev.setAttribute("fill", originalColor);
    prev.setAttribute("font-size", "12");
    prev.setAttribute("font-weight", "400");
  }
  ctx.lastHighlightedRef.current = null;

  // === Reset bubble visuals ===
  if (visibleEl) {
    const isWeak = visibleEl.getAttribute("data-weak") === "1";
    visibleEl.setAttribute(
      "stroke",
      isWeak ? visibleEl.getAttribute("fill") : "none",
    );
    visibleEl.setAttribute("stroke-width", isWeak ? "1.2" : "0");
    visibleEl.style.transform = "scale(1)";
    visibleEl.style.opacity = isWeak ? "0.45" : "";
    visibleEl.style.filter = "none";
  }

  ctx.hoveredKeyRef.current = null;
}

function bubbleContextLookup(el) {
  let n = el;
  while (n) {
    if (bubbleContext.has(n)) return bubbleContext.get(n);
    n = n.parentNode;
  }
  return null;
}

function getRowOffset(position, value) {
  if (position === "top") {
    return -value;
  }

  if (position === "bottom") {
    return value;
  }

  return 0;
}

const BAND_COLORS = [
  "rgba(30, 41, 59, 0.85)",
  "rgba(15, 23, 42, 0.85)",
  "rgba(17, 24, 39, 0.85)",
  "rgba(20, 30, 48, 0.85)",
  "rgba(28, 25, 45, 0.85)",
  "rgba(22, 28, 36, 0.85)",
  "rgba(18, 32, 47, 0.85)",
  "rgba(24, 24, 27, 0.85)",
];

const layerStyles = {
  strong: { opacity: 1 },
  early: { opacity: 0.7 },
  mid: { opacity: 0.5 },
  weak: { opacity: 0.85 },
  momentum: { opacity: 0.9 },
};

function getTimeOpacity({ isRecent, mode, activeCategory, key, baseOpacity }) {
  if (mode === "all") {
    return isRecent ? 1 : 0.25;
  }

  const isActive = activeCategory === key;
  const isDim = activeCategory && activeCategory !== key;

  if (!activeCategory) {
    return isRecent ? 1 : 0.33;
  } else if (isActive) {
    return 1;
  } else if (isDim) {
    return 0.1;
  }

  return 1;
}

function formatTurnover(val) {
  if (!val) return "";
  return (val / 100).toFixed(1) + " Cr";
}

function TimelineBubble({
  data = [],
  categories = [],
  mode,
  selectedSector,
  onSectorClick,
  sectors,
  sectorPositions,
  allowedSectors,
  rowPosition,
  highlightStock,
  hideBands,
  fixTooltip,
  activeCategory,
  setActiveCategory,
  showWatermark,
  toggleFavorite,
  favoriteStocks,
  showTooltip,
  enableSignalEngine,
  setEnableSignalEngine,
}) {
  const rafRef = useRef(null);
  const bubbleRefs = useRef(new Map());
  const activeSectorRef = useRef(null);
  const [isAllHover, setIsAllHover] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [cameFromSector, setCameFromSector] = useState(false);
  const tooltipTimeoutRef = useRef(null);
  const [hoveredBubble, setHoveredBubble] = useState(null);
  const [dragPos, setDragPos] = useState({ x: null, y: null });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [activeIndex, setActiveIndex] = useState(0);
  const sectorRefs = useRef({});
  const lastHighlightedRef = useRef(null);
  const [activeExpiry, setActiveExpiry] = useState(null);
  const [hoveredExpiry, setHoveredExpiry] = useState(null);
  const chartRef = useRef(null);
  const xScaleRef = useRef(null);
  const dateLabelRefs = useRef({});
  const activeCategoryRef = useRef(activeCategory);
  const activeExpiryRef = useRef(activeExpiry);
  const [activeDate, setActiveDate] = useState(null);
  const hoveredDateRef = useRef(null);
  const lineRef = useRef(null);
  const [activeStockIndex, setActiveStockIndex] = useState(0);

  const activeDateRef = useRef(activeDate);
  const expiryColorMapRef = useRef({});
  const hoveredKeyRef = useRef(null);

  const [viewportScale, setViewportScale] = useState(1);

  useEffect(() => {
    let rafId = null;

    function compute() {
      const w = window.innerWidth;
      if (w < 600) return 0.4; // XS mobile (Galaxy S20 class — India's #1 at 14.1%)
      if (w < 768) return 0.5; // Mobile
      if (w < 1024) return 0.58; // Tablet portrait (iPad)
      if (w < 1280) return 0.62; // Small laptop
      if (w < 1440) return 0.68; // Mid laptop (1366×768 — India's #1 desktop at 8.28%)
      if (w < 1600) return 0.72; // Large laptop
      if (w < 1920) return 0.8; // Desktop
      if (w < 2240) return 0.7; // 1920×1080 desktop (pro traders, 5.7%)
      return 1; // Ultra-wide
    }

    function updateScale() {
      setViewportScale(compute());
    }

    function onResize() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateScale);
    }

    updateScale();
    window.addEventListener("resize", onResize);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    activeDateRef.current = activeDate;
  }, [activeDate]);

  useEffect(() => {
    const wrapperEl = chartRef.current;
    if (!wrapperEl) return;

    bubbleContext.set(wrapperEl, {
      bubbleRefs,
      hoveredKeyRef,
      lastHighlightedRef,
      dateLabelRefs,
      get expiryColorMap() {
        return expiryColorMapRef.current;
      },
    });

    return () => {
      bubbleContext.delete(wrapperEl);
    };
  }, []);

  const isSectorAllowed = (sector) => {
    if (!allowedSectors || !allowedSectors.length) return true;
    return allowedSectors.includes(sector);
  };

  useEffect(() => {
    setActiveCategory(null);
  }, [mode, selectedSector]);

  useEffect(() => {
    if (!selectedSector) return;

    const idx = sectors.findIndex((s) => s === selectedSector);
    if (idx >= 0) setActiveIndex(idx);
  }, [selectedSector, sectors]);

  useEffect(() => {
    const sec = sectors[activeIndex];
    const el = sectorRefs.current[sec];

    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [activeIndex]);

  useEffect(() => {
    const handler = (e) => {
      const { stock, sector } = e.detail;
      setSearchTarget({ stock, sector });
    };
  }, []);

  useEffect(() => {
    if (!highlightStock) return;

    if (mode === "stock" && categories.includes(highlightStock)) {
      setActiveCategory(highlightStock);
    }
  }, [highlightStock, mode, categories]);

  useEffect(() => {
    const handleKey = (e) => {
      if (!categories.length) return;

      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        if (!sectors.length) return;

        if (e.key === "ArrowRight") {
          e.preventDefault();

          setActiveIndex((prev) => {
            const next = Math.min(prev + 1, sectors.length - 1);
            const sec = sectors[next];

            setTimeout(() => {
              setActiveCategory(null);
              onSectorClick?.(sec);
            }, 0);

            return next;
          });
        }

        if (e.key === "ArrowLeft") {
          e.preventDefault();

          setActiveIndex((prev) => {
            const next = Math.max(prev - 1, 0);
            const sec = sectors[next];

            setTimeout(() => {
              setActiveCategory(null);
              onSectorClick?.(sec);
            }, 0);

            return next;
          });
        }
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();

        setActiveStockIndex((prev) => {
          const next = Math.min(prev + 1, categories.length - 1);
          const stock = categories[next];

          setActiveCategory(stock);

          return next;
        });
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();

        setActiveStockIndex((prev) => {
          const next = Math.max(prev - 1, 0);
          const stock = categories[next];

          setActiveCategory(stock);

          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [categories, sectors]);

  useEffect(() => {
    const t = setTimeout(() => setIsReady(true), 0);
    return () => clearTimeout(t);
  }, []);

  if (!Array.isArray(data) || !Array.isArray(categories)) return null;

  const { ticks, latestDate } = useMemo(() => {
    const t = [...new Set(data.map((d) => d.x))].sort((a, b) => a - b);
    return {
      ticks: t,
      latestDate: t.length ? t[t.length - 1] : null,
    };
  }, [data]);

  useEffect(() => {
    activeCategoryRef.current = activeCategory;
  }, [activeCategory]);

  useEffect(() => {
    activeExpiryRef.current = activeExpiry;
  }, [activeExpiry]);

  const topSectorSet = useMemo(() => {
    if (!latestDate) return new Set();

    const arr = data.filter(
      (d) => d.x === latestDate && isSectorAllowed(d.sector),
    );

    arr.sort((a, b) => b.size - a.size);

    return new Set(arr.slice(0, 5).map((d) => d.sector));
  }, [data, latestDate, allowedSectors]);

  const topSectorSetRef = useRef(topSectorSet);

  useEffect(() => {
    topSectorSetRef.current = topSectorSet;
  }, [topSectorSet]);

  const { expiryGroupMap, expiryColorMap, finalDateExpiry } = useMemo(() => {
    if (!data?.length)
      return {
        expiryGroupMap: {},
        expiryColorMap: {},
        finalDateExpiry: {},
      };

    const dateExpiryMap = {};

    data.forEach((d) => {
      if (!d.expiry) return;

      if (!dateExpiryMap[d.x]) {
        dateExpiryMap[d.x] = {};
      }

      dateExpiryMap[d.x][d.expiry] = (dateExpiryMap[d.x][d.expiry] || 0) + 1;
    });

    const finalDateExpiry = {};

    Object.entries(dateExpiryMap).forEach(([date, expMap]) => {
      const sorted = Object.entries(expMap).sort((a, b) => b[1] - a[1]);
      finalDateExpiry[date] = sorted[0][0];
    });

    const uniqueExpiries = [...new Set(Object.values(finalDateExpiry))].sort();

    const expiryIndexMap = {};
    uniqueExpiries.forEach((exp, i) => {
      expiryIndexMap[exp] = i;
    });

    const expiryGroupMap = {};
    const expiryColorMap = {};

    Object.entries(finalDateExpiry).forEach(([date, exp]) => {
      const idx = expiryIndexMap[exp];

      expiryGroupMap[Number(date)] = idx;
      expiryColorMap[Number(date)] = idx % 2;
    });

    return { expiryGroupMap, expiryColorMap, finalDateExpiry };
  }, [data]);

  useEffect(() => {
    expiryColorMapRef.current = expiryColorMap;
  }, [expiryColorMap]);

  const expiryBands = useMemo(() => {
    if (!ticks?.length) return [];

    const bands = [];

    let currentIndex = expiryGroupMap[Number(ticks[0])] ?? 0;
    let start = ticks[0];

    for (let i = 1; i < ticks.length; i++) {
      const curr = ticks[i];
      const idx = expiryGroupMap[Number(curr)];

      if (idx !== currentIndex) {
        bands.push({
          start,
          end: ticks[i - 1],
          index: currentIndex,
          expiry: finalDateExpiry[start],
        });

        start = curr;
        currentIndex = idx;
      }
    }

    bands.push({
      start,
      end: ticks[ticks.length - 1],
      index: currentIndex,
      expiry: finalDateExpiry[start],
    });

    return bands;
  }, [ticks, expiryGroupMap, finalDateExpiry]);

  useEffect(() => {
    activeSectorRef.current = null;
  }, [mode]);

  const handleTickRegister = useCallback((value, x) => {
    if (!xScaleRef.current) {
      xScaleRef.current = {};
    }
    xScaleRef.current[value] = x;
  }, []);

  const handleTickClick = useCallback((e, date) => {
    setActiveDate((prev) => {
      const next = prev === date ? null : date;

      const x = xScaleRef.current?.[date];

      if (lineRef.current && x != null) {
        if (next) {
          lineRef.current.setAttribute("x1", x);
          lineRef.current.setAttribute("x2", x);
          lineRef.current.setAttribute("stroke-width", "1.5");
          lineRef.current.style.opacity = 1;
        } else {
          lineRef.current.style.opacity = 0;
        }
      }

      return next;
    });
  }, []);

  const handleTickEnter = useCallback((e, date) => {
    hoveredDateRef.current = date;

    const el = e.currentTarget.querySelector("text");
    if (el) {
      el.setAttribute("fill", "#FFD700");
      el.setAttribute("font-size", "14");
      el.setAttribute("font-weight", "800");
    }

    const x = xScaleRef.current?.[date];
    if (!lineRef.current || x == null) return;

    lineRef.current.setAttribute("x1", x);
    lineRef.current.setAttribute("x2", x);
    lineRef.current.style.opacity = 1;

    lineRef.current.setAttribute(
      "stroke-width",
      activeDateRef.current ? "1" : "2",
    );
  }, []);

  const handleTickLeave = useCallback((e, date) => {
    hoveredDateRef.current = null;

    const isActive = activeDateRef.current === date;

    const el = e.currentTarget.querySelector("text");

    if (el && !isActive) {
      const expiryIndex = expiryColorMapRef.current[Number(date)] ?? 0;
      const color = expiryIndex === 0 ? "#60a5fa" : "#c084fc";

      el.setAttribute("fill", color);
      el.setAttribute("font-size", "12");
      el.setAttribute("font-weight", "400");
    }

    const active = activeDateRef.current;

    if (!lineRef.current) return;

    if (active) {
      const x = xScaleRef.current?.[active];

      if (x != null) {
        lineRef.current.setAttribute("x1", x);
        lineRef.current.setAttribute("x2", x);
        lineRef.current.style.opacity = 1;
        lineRef.current.setAttribute("stroke-width", "1.5");
      }
    } else {
      lineRef.current.style.opacity = 0;
    }
  }, []);

  const bubbleRefCallback = useCallback((el) => {
    if (!el) return;
    const key = el.getAttribute("data-id");
    if (key) {
      bubbleRefs.current.set(key, el);
    }
  }, []);
  // =====================================================================
  // 🔥 SIGNAL-AWARE bubble renderer
  // Identical to renderBubble but adds:
  //   - Outer ring for strict signals
  //   - Glow halo for confirmed strict signals
  //   - Centered icon (▲ BUY, ▼ SELL, ! WARN)
  // =====================================================================
  const renderBubbleWithSignal = useCallback(
    (sigStyle, baseOpacity = 1) =>
      (props) => {
        const { cx, cy, payload, size } = props;
        if (!payload) return null;

        const key =
          mode === "all" || mode === "sector" ? payload.sector : payload.stock;

        const currentActiveDate = activeDateRef.current;
        const isActiveDate =
          currentActiveDate && Number(currentActiveDate) === Number(payload.x);

        const isDateDimmed =
          currentActiveDate && Number(currentActiveDate) !== Number(payload.x);

        const isExpiryDimmed =
          activeExpiryRef.current &&
          expiryGroupMap[Number(payload.x)] !== activeExpiryRef.current.index;

        const isRecent = Math.abs(payload.x - latestDate) < 1000;

        const timeOpacity = getTimeOpacity({
          isRecent,
          mode,
          activeCategory: activeCategoryRef.current,
          key,
        });

        let opacity = baseOpacity * timeOpacity;
        if (size <= 6) opacity = Math.min(opacity, 0.4);

        const isLeader = topSectorSetRef.current.has(payload.sector);
        const SAFE_R = mode === "all" ? 18 * viewportScale : 40 * viewportScale;
        const rBase = size / 2;

        let r =
          mode === "all"
            ? Math.min(rBase * 0.5 * viewportScale, 18 * viewportScale)
            : Math.min(rBase * 0.7 * viewportScale, 40 * viewportScale);

        if (isLeader) r = r * 1.2;
        r = Math.min(r, SAFE_R);

        // Signal bubbles get a size boost based on strength (like smart entry)
        const sigStrength = payload.bubbleSignal?.strength || 0;
        const boost = 1.15 + sigStrength * 0.4;
        r = Math.min(r * boost, SAFE_R + 8);

        const cy_r = getRowOffset(rowPosition, r);

        // Use the signal style's opacity, modulated by time
        const finalOpacity = sigStyle.opacity * timeOpacity;

        const bubbleKey = (payload.stock ?? payload.sector) + "-" + payload.x;
        const hitR = Math.max(MIN_HIT_RADIUS, r * HIT_RADIUS_MULT);

        const onHitEnter = (e) => {
          handleBubbleEnter(e);
          if (props.onMouseEnter) props.onMouseEnter(e);
          // 🔧 TOOLTIP ACTIVATION FIX:
          // Recharts ScatterChart's Tooltip needs a `mousemove` event to
          // compute the active data point — `mouseenter` alone is not enough.
          // When the cursor moves directly onto a bubble from outside the
          // chart (e.g. from a chart edge), no `mousemove` fires until the
          // user wiggles. Synthesize one by also calling onMouseMove here.
          if (props.onMouseMove) props.onMouseMove(e);
        };
        const onHitMove = (e) => {
          // 🔧 OVERLAP FIX: re-fire highlight on every move so when mouse
          // drifts from one overlapping bubble's hit-area into another's,
          // the highlight tracks the actual current target. handleBubbleEnter
          // early-returns if it's the same bubble, so this is cheap.
          handleBubbleEnter(e);
          if (props.onMouseMove) props.onMouseMove(e);
        };
        const onHitLeave = (e) => {
          handleBubbleLeave(e);
          if (props.onMouseLeave) props.onMouseLeave(e);
        };

        return (
          <g>
            {/* GLOW HALO — only for confirmed strict signals */}
            {sigStyle.glow && (
              <circle
                cx={cx}
                cy={cy - cy_r}
                r={r * 1.55}
                fill={sigStyle.glowColor || sigStyle.fill}
                opacity={
                  isDateDimmed || isExpiryDimmed
                    ? 0.02
                    : !activeCategoryRef.current
                      ? 0.18
                      : payload.stock === activeCategoryRef.current
                        ? 0.18
                        : 0.08
                }
                style={{ pointerEvents: "none" }}
              />
            )}

            {/* OUTER RING — strict signals get a ring for emphasis */}
            {sigStyle.ring && (
              <circle
                cx={cx}
                cy={cy - cy_r}
                r={r + 4}
                fill="none"
                stroke={sigStyle.fill}
                strokeWidth={2}
                opacity={
                  isDateDimmed || isExpiryDimmed
                    ? 0.03
                    : !activeCategoryRef.current
                      ? 0.7
                      : payload.stock === activeCategoryRef.current
                        ? 0.7
                        : 0.08
                }
                style={{ pointerEvents: "none" }}
              />
            )}

            {/* MAIN BUBBLE */}
            <circle
              cx={cx}
              cy={cy - cy_r}
              r={r}
              ref={bubbleRefCallback}
              fill={sigStyle.fill}
              opacity={
                isDateDimmed || isExpiryDimmed
                  ? 0.05
                  : !activeCategoryRef.current
                    ? finalOpacity
                    : payload.stock === activeCategoryRef.current
                      ? finalOpacity
                      : 0.08
              }
              data-id={bubbleKey}
              data-x={payload.x}
              data-weak="0"
              stroke="none"
              strokeWidth={0}
              style={{
                transition: "none",
                willChange: "transform",
                transformBox: "fill-box",
                transformOrigin: "center",
                pointerEvents: "none",
              }}
            />

            {/* SIGNAL ICON — only for bubbles big enough to fit */}
            {sigStyle.icon && r >= 8 && (
              <text
                x={cx}
                y={cy - cy_r}
                fontSize={Math.max(9, r * 0.85)}
                fontWeight="900"
                fill="#ffffff"
                textAnchor="middle"
                dominantBaseline="central"
                style={{
                  pointerEvents: "none",
                  userSelect: "none",
                  textShadow: "0 0 3px rgba(0,0,0,0.9)",
                  opacity:
                    isDateDimmed || isExpiryDimmed
                      ? 0.04
                      : !activeCategoryRef.current
                        ? 1
                        : payload.stock === activeCategoryRef.current
                          ? 1
                          : 0.08,
                }}
              >
                {sigStyle.icon}
              </text>
            )}

            {/* HIT AREA — same as renderBubble */}
            <circle
              cx={cx}
              cy={cy - cy_r}
              r={hitR}
              fill="transparent"
              data-target={bubbleKey}
              style={{ cursor: "pointer", pointerEvents: "all" }}
              onMouseEnter={onHitEnter}
              onMouseMove={onHitMove}
              onMouseLeave={onHitLeave}
            />
          </g>
        );
      },
    [mode, latestDate, rowPosition, bubbleRefCallback, viewportScale],
  );

  // =====================================================================
  // 🔥 HOVER FIX: Bubble renderer
  //
  // Two SVG circles per bubble:
  //   1. VISIBLE (small/colored) — what the user sees. NO event handlers.
  //      Has data-id used by the highlight logic.
  //   2. HIT-AREA (transparent, larger) — catches all hover events.
  //      Forwards Recharts' props.onMouseEnter/Move/Leave (so tooltip
  //      shows up) AND triggers our custom highlight via handleBubbleEnter.
  //      Has data-target pointing to the visible bubble's data-id.
  //
  // Hit radius = max(MIN_HIT_RADIUS, visible_r * HIT_RADIUS_MULT)
  // → tiny gray bubbles still get a 14px hover zone
  // → medium/large bubbles get 1.6× tolerance
  // =====================================================================
  const renderBubble = useCallback(
    (fill, baseOpacity = 1, smartStyle = null) =>
      (props) => {
        const { cx, cy, payload, size } = props;
        if (!payload) return null;

        const key =
          mode === "all" || mode === "sector" ? payload.sector : payload.stock;

        const currentActiveDate = activeDateRef.current;
        const isActiveDate =
          currentActiveDate && Number(currentActiveDate) === Number(payload.x);

        const isDateDimmed =
          currentActiveDate && Number(currentActiveDate) !== Number(payload.x);

        const isExpiryDimmed =
          activeExpiryRef.current &&
          expiryGroupMap[Number(payload.x)] !== activeExpiryRef.current.index;

        const isRecent = Math.abs(payload.x - latestDate) < 1000;

        const timeOpacity = getTimeOpacity({
          isRecent,
          mode,
          activeCategory: activeCategoryRef.current,
          key,
        });

        let opacity = baseOpacity * timeOpacity;

        if (size <= 6) {
          opacity = Math.min(opacity, 0.4);
        }

        const isLeader = topSectorSetRef.current.has(payload.sector);

        const SAFE_R = mode === "all" ? 18 * viewportScale : 40 * viewportScale;

        const rBase = size / 2;

        let r =
          mode === "all"
            ? Math.min(rBase * 0.5 * viewportScale, 18 * viewportScale)
            : Math.min(rBase * 0.7 * viewportScale, 40 * viewportScale);

        const maxSize =
          mode === "all" ? (isRecent ? 32 : 18) : isRecent ? 55 : 35;

        if (isLeader) r = r * 1.2;

        r = Math.min(r, SAFE_R);

        if (mode !== "all") {
          r = Math.min(r, SAFE_R);
        }

        r = Math.min(r, maxSize * (payload.isSmartEntry ? 1.3 : 1));

        const isSmart = payload.isSmartEntry;

        // Failed smart entries shrink back toward normal size — they're
        // not special anymore, just noise.
        const isFailed = isSmart && payload.smartValidation === "failed";

        if (isSmart && !isFailed) {
          const boost = 1.15 + (payload.smartStrength || 0) * 0.5;
          r = Math.min(r * boost, SAFE_R + 6);
        }
        const isWeak = payload.isWeak;
        const id = payload.stock ?? payload.sector;

        const cy_r = getRowOffset(rowPosition, r);

        const isInActiveExpiry =
          activeExpiryRef.current &&
          expiryGroupMap[Number(payload.x)] === activeExpiryRef.current.index;

        const isPurple =
          payload.finalScore > 1.0 || payload.intent === "MOMENTUM_BUYING";

        const computeOpacity = () => {
          if (currentActiveDate) {
            return isActiveDate ? 1 : 0.06;
          }

          if (activeCategoryRef.current) {
            return key === activeCategoryRef.current ? 0.8 : 0.08;
          }

          if (activeExpiryRef.current) {
            if (!isInActiveExpiry) return 0.05;
            // 🔥 SMART ENTRY: use validation-aware opacity here too
            if (isSmart) {
              if (smartStyle) return smartStyle.opacity * 0.85;
              return 0.6;
            }
            if (isPurple) return 0.5;
            return 0.3;
          }

          // 🔥 SMART ENTRY: opacity now driven by tier+validation matrix
          if (isSmart && smartStyle) {
            return smartStyle.opacity * timeOpacity;
          }

          if (isWeak) return 0.4;
          if (isPurple) return Math.min(1, opacity * 1.3);
          return opacity * 0.7;
        };

        const finalOpacity = computeOpacity();

        const bubbleKey = id + "-" + payload.x;

        // 🔥 HIT AREA — bigger transparent circle catches mouse events
        const hitR = Math.max(MIN_HIT_RADIUS, r * HIT_RADIUS_MULT);

        // Combined enter/leave: forwards Recharts handlers AND triggers our highlight
        const onHitEnter = (e) => {
          handleBubbleEnter(e);
          // Recharts attaches its own handler via props.onMouseEnter
          if (props.onMouseEnter) props.onMouseEnter(e);
          // 🔧 TOOLTIP ACTIVATION FIX: Recharts needs a mousemove to compute
          // the active data point. Synthesize one on every Enter so tooltips
          // appear immediately, even when entering a bubble from outside the
          // chart's plotting region.
          if (props.onMouseMove) props.onMouseMove(e);
        };
        const onHitMove = (e) => {
          // 🔧 OVERLAP FIX: same as signal bubbles — track current target
          // every frame so overlapping bubbles each get a chance.
          handleBubbleEnter(e);
          if (props.onMouseMove) props.onMouseMove(e);
        };
        const onHitLeave = (e) => {
          handleBubbleLeave(e);
          if (props.onMouseLeave) props.onMouseLeave(e);
        };

        return (
          <g>
            {/* 🔥 SMART ENTRY GLOW HALO — only for confirmed strict gold */}
            {isSmart && smartStyle?.glow && (
              <circle
                cx={cx}
                cy={cy - cy_r}
                r={r * 1.45}
                fill="#FBB724"
                opacity={0.18}
                style={{ pointerEvents: "none" }}
              />
            )}
            {/* 🔥 VISIBLE BUBBLE — purely visual, no events */}
            <circle
              cx={cx}
              cy={cy - cy_r}
              r={r}
              style={{
                transition: "none",
                willChange: "transform",
                transformBox: "fill-box",
                transformOrigin: "center",
                pointerEvents: "none",
              }}
              ref={bubbleRefCallback}
              fill={fill}
              data-id={bubbleKey}
              data-x={payload.x}
              data-weak={isWeak ? "1" : "0"}
              stroke={isWeak ? fill : "none"}
              strokeWidth={isWeak ? 1.2 : 0}
              opacity={isDateDimmed || isExpiryDimmed ? 0.05 : finalOpacity}
            />
            {/* 🔥 HIT AREA — bigger transparent circle, catches ALL hover */}
            <circle
              cx={cx}
              cy={cy - cy_r}
              r={hitR}
              fill="transparent"
              data-target={bubbleKey}
              style={{ cursor: "pointer", pointerEvents: "all" }}
              onMouseEnter={onHitEnter}
              onMouseMove={onHitMove}
              onMouseLeave={onHitLeave}
            />
          </g>
        );
      },
    [
      mode,
      latestDate,
      rowPosition,
      expiryGroupMap,
      bubbleRefCallback,
      viewportScale,
    ],
  );

  const sectorLabelData = useMemo(() => {
    if (mode !== "all" || !sectorPositions || !latestDate) return [];

    return Object.entries(sectorPositions)
      .filter(([sector]) => isSectorAllowed(sector))
      .map(([sector, pos]) => ({
        x: latestDate,
        y: pos.midY,
        sector,
      }));
  }, [mode, sectorPositions, latestDate, allowedSectors]);

  const sectorBandData = useMemo(() => {
    if (mode !== "all" || !sectorPositions) return [];

    return Object.entries(sectorPositions).map(([sector, pos], i) => ({
      y: pos.midY,
      minY: pos.minY,
      maxY: pos.maxY,
      sector,
      index: i,
    }));
  }, [mode, sectorPositions]);

  const memoBands = useMemo(() => {
    if (mode !== "all") return [];

    return Object.entries(sectorPositions)
      .filter(([sector]) => isSectorAllowed(sector))
      .flatMap(([sector, pos], i) => {
        return pos.groups.map((g, j) => ({
          sector,
          g,
          i,
          j,
        }));
      });
  }, [mode, sectorPositions, allowedSectors]);

  const latestLabels = useMemo(() => {
    if (!latestDate) return [];

    return data
      .filter((d) => d.x === latestDate)
      .sort((a, b) => b.size - a.size);
  }, [data, latestDate]);

  const pointMap = useMemo(() => {
    const map = new Map();
    data.forEach((p) => {
      map.set(p.x + "-" + p.y, p);
    });
    return map;
  }, [data]);

  const visibleData = useMemo(() => {
    if (!allowedSectors || !allowedSectors.length) return data;

    return data.filter((d) => isSectorAllowed(d.sector));
  }, [data, allowedSectors]);

  // =====================================================================
  // 🔥 SMART ENTRY-AWARE bubbleShape
  // For smart-entry bubbles, resolve the (tier × validation) style and
  // pass to renderBubble. For everything else, fall through to the
  // existing intent-based color system.
  // =====================================================================
  const bubbleShape = useCallback(
    (props) => {
      const d = props.payload;
      if (!d) return null;

      const style = layerStyles[d.layer] || layerStyles.mid;

      // 🔥 PRIORITY 1: BUY/SELL/WARN signal — ONLY if engine enabled
      if (enableSignalEngine && d.bubbleSignal) {
        const sigStyle = resolveSignalStyle(d);
        if (sigStyle) {
          return renderBubbleWithSignal(sigStyle, style.opacity)(props);
        }
      }

      // PRIORITY 2: existing smart entry (gold)
      if (d.isSmartEntry) {
        const smartStyle = resolveSmartEntryStyle(d);
        return renderBubble(smartStyle.fill, style.opacity, smartStyle)(props);
      }

      // PRIORITY 3: default intent-based coloring
      const fill = resolveBubbleColor(d);
      return renderBubble(fill, style.opacity, null)(props);
    },
    [renderBubble, renderBubbleWithSignal, enableSignalEngine], // 🔥 added dep
  );

  const handleBandClick = useCallback((sector) => {
    setActiveCategory((prev) => (prev === sector ? null : sector));
  }, []);

  useEffect(() => {
    if (!activeCategory) return;

    const idx = categories.indexOf(activeCategory);
    if (idx >= 0) {
      setActiveStockIndex(idx);
    }
  }, [activeCategory, categories]);

  const tooltipContent = useCallback(
    (props) => {
      if (!showTooltip) return null;
      if (!props.payload || !props.payload.length) return null;
      return (
        <CustomTooltip
          {...props}
          latestDate={latestDate}
          hoveredKeyRef={hoveredKeyRef}
          mode={mode}
          bubbleRefs={bubbleRefs}
        />
      );
    },
    [showTooltip, latestDate, mode],
  );

  const tooltipWrapperStyle = useMemo(
    () => ({
      display: showTooltip ? "block" : "none",
      pointerEvents: showTooltip ? "auto" : "none",
    }),
    [showTooltip],
  );

  const yStart = -0.5;
  const yEnd =
    mode === "all"
      ? categories.length
      : data.reduce((max, d) => Math.max(max, d.y), 0) + 1;

  return (
    <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
      <div
        ref={chartRef}
        data-tour="bubble"
        style={{ position: "relative", width: "100%", height: "100%" }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            style={{ position: "relative", zIndex: 5 }}
            onMouseLeave={() => {
              if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
              }

              const prevKey = hoveredKeyRef.current;

              if (prevKey && bubbleRefs.current.has(prevKey)) {
                const el = bubbleRefs.current.get(prevKey);

                if (el) {
                  const isWeak = el.getAttribute("data-weak") === "1";

                  el.setAttribute(
                    "stroke",
                    isWeak ? el.getAttribute("fill") : "none",
                  );
                  el.setAttribute("stroke-width", isWeak ? "1.2" : "0");

                  el.style.transform = "scale(1)";
                  el.style.opacity = isWeak ? "0.45" : "";
                }
              }

              hoveredKeyRef.current = null;
            }}
          >
            {expiryBands.map((band, i) => {
              const pad =
                ticks.length > 1 ? (ticks[1] - ticks[0]) * 0.5 : 43200000;

              return (
                <ReferenceArea
                  key={`expiry-line-${band.start}-${band.end}`}
                  x1={band.start}
                  yAxisId="right"
                  y1={yStart}
                  y2={yEnd}
                  ifOverflow="extendDomain"
                  fill={
                    band.index === 0
                      ? "rgba(255,255,255,0)"
                      : "rgba(168,85,247,0)"
                  }
                  stroke={band.index === 0 ? "#c084fc" : "#c084fc"}
                  strokeOpacity={hideBands ? 0 : 0.32}
                  strokeWidth={hideBands ? 0 : 2}
                  style={{ pointerEvents: "none" }}
                />
              );
            })}
            {mode !== "all" &&
              categories.map((sec, i) => {
                const isActive = activeCategory === sec;
                const isDim = activeCategory && activeCategory !== sec;

                return (
                  <React.Fragment key={sec}>
                    <ReferenceArea
                      key={sec}
                      y1={i}
                      y2={i + 1}
                      yAxisId="right"
                      x1={ticks.length ? ticks[0] : 0}
                      x2={ticks.length ? ticks[ticks.length - 1] : 0}
                      ifOverflow="extendDomain"
                      fill={BAND_COLORS[i % BAND_COLORS.length]}
                      fillOpacity={
                        hideBands ? 0 : isActive ? 1 : isDim ? 0.2 : 0.98
                      }
                      stroke={
                        isActive ? "var(--green)" : "rgba(255,255,255,0.08)"
                      }
                      strokeWidth={isActive ? 1.5 : 0}
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        setActiveCategory((prev) =>
                          prev === sec ? null : sec,
                        );
                      }}
                    />
                    <ReferenceLine
                      y={i + 1}
                      yAxisId="right"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth={1}
                      ifOverflow="extendDomain"
                    />
                  </React.Fragment>
                );
              })}

            {isReady &&
              mode === "all" &&
              !hideBands &&
              memoBands.map(({ sector, g, i, j }) => (
                <React.Fragment key={`${sector}-${j}`}>
                  <ReferenceArea
                    yAxisId="right"
                    x1={ticks?.[0]}
                    x2={ticks?.[ticks.length - 1]}
                    y1={g.minY}
                    y2={g.maxY}
                    onClick={() => handleBandClick(sector)}
                    style={{ cursor: "pointer" }}
                    fill={
                      topSectorSet.has(sector)
                        ? "rgba(34, 197, 94, 0.22)"
                        : i % 2 === 0
                          ? "rgba(30, 41, 59, 0.75)"
                          : "rgba(15, 23, 42, 0.95)"
                    }
                    fillOpacity={0.55}
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth={activeSectorRef.current === sector ? 2 : 0.2}
                    ifOverflow="extendDomain"
                  />
                </React.Fragment>
              ))}

            {latestDate && (
              <ReferenceLine
                x={latestDate}
                stroke="#ffffff"
                strokeOpacity={0.15}
              />
            )}
            {isReady &&
              mode === "all" &&
              latestLabels.map((d, i) => {
                const point = pointMap.get(d.x + "-" + d.y);
                if (!point) return null;

                return (
                  <Scatter
                    isAnimationActive={false}
                    key={"label-" + i}
                    data={[point]}
                    shape={({ cx, cy }) => {
                      const RIGHT_EDGE_X = cx + 120;

                      return (
                        <text
                          x={RIGHT_EDGE_X}
                          y={cy}
                          dy={4}
                          fontSize={10}
                          fill="#e5e7eb"
                          opacity={0.9}
                          textAnchor="end"
                        >
                          {d.stock}
                        </text>
                      );
                    }}
                  />
                );
              })}
            <XAxis
              type="number"
              dataKey="x"
              domain={[
                (dataMin) => dataMin - 1000,
                (dataMax) => dataMax + 1000,
              ]}
              ticks={ticks}
              interval={0}
              stroke="#6b7280"
              angle={-45}
              textAnchor="end"
              height={50}
              tickMargin={12}
              dx={-10}
              tick={(props) => (
                <DateTick
                  {...props}
                  viewportScale={viewportScale}
                  expiryColorMap={expiryColorMap}
                  activeDate={activeDate}
                  onTickClick={handleTickClick}
                  onTickEnter={handleTickEnter}
                  onTickLeave={handleTickLeave}
                  onTickRegister={handleTickRegister}
                  dateLabelRefs={dateLabelRefs}
                />
              )}
            />

            <YAxis
              yAxisId="left"
              orientation="left"
              type="number"
              domain={
                mode === "all"
                  ? [-0.5, categories.length - 0.5]
                  : [-0.5, categories.length]
              }
              ticks={
                mode === "all"
                  ? categories.map((_, i) => i)
                  : categories.map((_, i) => i + 0.5)
              }
              width={30}
              stroke="transparent"
              tick={({ x, y, payload }) => {
                const index = payload.value;

                return (
                  <text
                    x={x + 10}
                    y={y}
                    dy={4}
                    textAnchor="start"
                    fontSize={12}
                    fontWeight={600}
                    fill="#94a3b8"
                  >
                    {index + 1}
                  </text>
                );
              }}
            />

            <YAxis
              yAxisId="right"
              orientation="right"
              type="number"
              dataKey="y"
              domain={
                mode === "all"
                  ? [-0.5, categories.length - 0.5]
                  : [-0.5, categories.length]
              }
              stroke="#6b7280"
              width={mode === "all" ? 150 : 160}
              tickMargin={24}
              interval={0}
              ticks={
                mode === "all"
                  ? categories.map((_, i) => i)
                  : categories.map((_, i) => i + 0.5)
              }
              tick={
                mode === "all"
                  ? ({ x, y, payload }) => {
                      const sym = categories[payload.value];
                      if (!sym) return null;

                      return (
                        <g
                          className="axis-label-group"
                          onClick={() => {
                            setActiveCategory((prev) =>
                              prev === sym ? null : sym,
                            );

                            if (mode === "sector") {
                              onSectorClick?.(sym);
                            }
                          }}
                        >
                          <rect
                            className="axis-label-bg"
                            x={x}
                            y={y - 10}
                            width={100}
                            height={18}
                            rx={4}
                          />
                          <text
                            className="axis-label-text"
                            x={x}
                            y={y}
                            dx={6}
                            dy={4}
                            fontSize={7}
                            fill="#94a3b8"
                            textAnchor="start"
                            onMouseEnter={(e) => {
                              e.target.setAttribute("font-size", "12");
                              e.target.setAttribute("fill", "#ffffff");
                            }}
                            onMouseLeave={(e) => {
                              e.target.setAttribute("font-size", "7");
                              e.target.setAttribute("fill", "#94a3b8");
                            }}
                          >
                            {sym}
                          </text>
                        </g>
                      );
                    }
                  : ({ x, y, payload }) => {
                      const sec = categories[Math.floor(payload.value)];

                      const isActive = activeCategory === sec;
                      const isDim = activeCategory && activeCategory !== sec;
                      const isFirstSector = Math.floor(payload.value) === 0;
                      return (
                        <g
                          className="axis-label-group"
                          data-tour={isFirstSector ? "sector" : undefined} 
                          onClick={() => {
                            if (mode === "sector") {
                              setActiveCategory((prev) =>
                                prev === sec ? null : sec,
                              );
                              onSectorClick?.(sec);
                            } else {
                              setActiveCategory((prev) =>
                                prev === sec ? null : sec,
                              );
                            }
                          }}
                        >
                          <rect
                            className="axis-label-bg"
                            x={x - 4}
                            y={y - 14}
                            width={120}
                            height={28}
                            rx={4}
                            fill={
                              isActive
                                ? "rgba(250, 204, 21, 0.35)"
                                : "rgba(250, 204, 21, 0.15)"
                            }
                            strokeWidth={1}
                          />
                          <text
                            x={x + 120}
                            y={y}
                            dy={5}
                            textAnchor="middle"
                            style={{
                              cursor: "pointer",
                              fontSize: 18,
                              fontWeight: 700,
                              fill: favoriteStocks?.includes(sec)
                                ? "#facc15"
                                : "#334155",
                              transition: "all 0.15s ease",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite?.(sec);
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.fontSize = "28px";
                              e.currentTarget.style.fill = "#fde047";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.fontSize = "18px";
                              e.currentTarget.style.transform = "scale(1)";
                              e.currentTarget.style.fill =
                                favoriteStocks?.includes(sec)
                                  ? "#facc15"
                                  : "#334155";
                            }}
                          >
                            {favoriteStocks?.includes(sec) ? "★" : "☆"}
                          </text>
                          <text
                            x={x}
                            y={y}
                            dx={6}
                            dy={4}
                            textAnchor="start"
                            fontSize={14}
                            fontWeight={700}
                            fill={
                              isActive
                                ? "var(--green)"
                                : isDim
                                  ? "#555"
                                  : "#e5e7eb"
                            }
                            style={{ cursor: "pointer" }}
                          >
                            {sec}
                          </text>
                        </g>
                      );
                    }
              }
            />
            <ZAxis type="number" dataKey="size" range={[10, 90]} />
            {mode === "all" &&
              false &&
              [...new Set(data.map((d) => d.y))]
                .filter((_, i) => i % 12 === 0)
                .map((yVal, i) => (
                  <ReferenceLine
                    key={"band-" + i}
                    y={yVal}
                    yAxisId="right"
                    stroke="#334155"
                    strokeOpacity={0.7}
                    strokeWidth={1}
                  />
                ))}
            <Tooltip
              isAnimationActive={false}
              cursor={showTooltip ? CURSOR_STYLE : false}
              wrapperStyle={tooltipWrapperStyle}
              content={tooltipContent}
            />
            <Scatter
              isAnimationActive={mode === "all" ? false : true}
              yAxisId="right"
              data={sectorLabelData}
              shape={({ cx, cy, payload }) => {
                if (!payload) return null;

                return (
                  <g>
                    <rect
                      x={cx + 100}
                      y={cy - 10}
                      width={90}
                      height={16}
                      fill="rgba(0,0,0,0.6)"
                      rx={4}
                    />

                    <text
                      x={cx + 100}
                      y={cy + 2}
                      fontSize={14}
                      fontWeight="bold"
                      fill="#94a3b8"
                    >
                      {payload.sector}
                    </text>
                  </g>
                );
              }}
            />

            <CartesianGrid
              stroke="#6d8eb5"
              strokeOpacity={hideBands ? 0.1 : 0.4}
              strokeDasharray="3 3"
              vertical={mode !== "all"}
              horizontal={mode !== "all"}
            />
            <Scatter
              isAnimationActive={mode === "all" ? false : true}
              yAxisId="right"
              data={visibleData}
              shape={bubbleShape}
            />
            <svg
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 60,
                pointerEvents: hideBands ? "none" : "none",
                zIndex: 1,
              }}
            >
              {expiryBands.map((band, i) => {
                if (
                  !xScaleRef.current ||
                  Object.keys(xScaleRef.current).length < ticks.length
                ) {
                  return null;
                }

                const leftPx = xScaleRef.current?.[band.start];
                const rightPx = xScaleRef.current?.[band.end];

                if (leftPx == null || rightPx == null) return null;

                const widthPx = rightPx - leftPx;
                const centerX = leftPx + widthPx / 2;
                const chartHeight = chartRef.current?.offsetHeight || 0;

                const label = band.expiry
                  ? new Date(band.expiry).toLocaleDateString("en-IN", {
                      month: "short",
                    })
                  : "";

                const isActive = activeExpiry?.index === band.index;
                const isHover = hoveredExpiry === band.index;

                return (
                  <g key={`expiry-box-${band.start}-${band.end}`}>
                    {!hideBands && (
                      <rect
                        x={leftPx}
                        y={5}
                        width={widthPx}
                        height={chartHeight - 60}
                        fill={
                          isActive
                            ? "rgba(56,150,250,0.25)"
                            : isHover
                              ? "rgba(255,255,255,0.12)"
                              : "rgba(255,255,255,0.02)"
                        }
                        stroke={isActive ? "#3896fa" : "none"}
                        strokeWidth={1}
                        style={{
                          cursor: "pointer",
                          pointerEvents: "all",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={() => setHoveredExpiry(band.index)}
                        onMouseLeave={() => setHoveredExpiry(null)}
                        onClick={() => {
                          setActiveExpiry((prev) =>
                            prev?.index === band.index ? null : band,
                          );
                        }}
                      />
                    )}

                    {!hideBands && (
                      <rect
                        x={leftPx}
                        y={5}
                        width={widthPx}
                        height={60}
                        fill={
                          isActive
                            ? "rgba(56,150,250,0.25)"
                            : isHover
                              ? "rgba(255,255,255,0.10)"
                              : "rgba(255,255,255,0.03)"
                        }
                        pointerEvents="none"
                      />
                    )}

                    <text
                      x={centerX}
                      y={24}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={600}
                      fill={
                        hideBands
                          ? "#64748b"
                          : isActive
                            ? "#60a5fa"
                            : isHover
                              ? "#ffffff"
                              : "#94a3b8"
                      }
                      style={{
                        pointerEvents: "none",
                        userSelect: "none",
                      }}
                    >
                      {label} Expiry
                    </text>
                  </g>
                );
              })}
            </svg>
            <svg
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                zIndex: 10,
              }}
            >
              <line
                ref={lineRef}
                y1={0}
                y2="100%"
                stroke="#FFD700"
                strokeWidth={1}
                style={{
                  opacity: 0,
                  transition: "opacity 0.15s ease",
                }}
              />
            </svg>
          </ScatterChart>
        </ResponsiveContainer>
        {showWatermark && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) rotate(-28deg)",
              fontSize: 48,
              fontWeight: 500,
              color: "#ffffff",
              opacity: 0.6,

              pointerEvents: "none",
              userSelect: "none",
              whiteSpace: "nowrap",
              letterSpacing: 2,

              textShadow: `
              2px 2px 4px rgba(0,0,0,0.5),
              -2px -2px 4px rgba(255,255,255,0.2)
            `,
            }}
          >
            DALALRADAR - SMART MONEY RADAR
          </div>
        )}
      </div>
    </div>
  );
}
// 🔥 PERF FIX B7: complete React.memo equality check including missing deps
export default React.memo(TimelineBubble, (prev, next) => {
  return (
    prev.data === next.data &&
    prev.categories === next.categories &&
    prev.mode === next.mode &&
    prev.selectedSector === next.selectedSector &&
    prev.activeCategory === next.activeCategory &&
    prev.highlightStock === next.highlightStock &&
    prev.showWatermark === next.showWatermark &&
    prev.rowPosition === next.rowPosition &&
    prev.hideBands === next.hideBands &&
    prev.favoriteStocks === next.favoriteStocks &&
    prev.showTooltip === next.showTooltip &&
    prev.sectorPositions === next.sectorPositions &&
    prev.allowedSectors === next.allowedSectors &&
    prev.toggleFavorite === next.toggleFavorite &&
    prev.setActiveCategory === next.setActiveCategory &&
    prev.enableSignalEngine === next.enableSignalEngine
  );
});
