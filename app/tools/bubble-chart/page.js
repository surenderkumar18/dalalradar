// app/tools/bubble-chart/page.js
//
// 🎯 UPDATED: Hardcoded PHARMA default + URL state (?sector=PHARMA)
//
// Changes from original:
// - Added useCallback to React imports
// - Added Next.js navigation imports
// - Added DEFAULT_SECTOR constant
// - Replaced selectedSector useState with URL-aware version
// - Added URL sync wrapper
// - Added sector validation useEffect
// - Added browser title useEffect (bonus)
//
// Everything else unchanged.

"use client";

// 🆕 FIX: Force dynamic rendering — required for useSearchParams() to work
// Without this, Next.js tries to pre-render the page at build time and fails
// because useSearchParams() needs a real browser context.
//
// Trade-off: No static caching of this page (which is correct for a
// data-heavy interactive tool anyway — we always want fresh data).
export const dynamic = "force-dynamic";

import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useDeferredValue,
  useCallback,
  Suspense, // 🆕 NEW: Required for useSearchParams() in Next.js 16
} from "react";

// 🆕 NEW: Next.js navigation hooks for URL state
import { useSearchParams, useRouter, usePathname } from "next/navigation";

import { mergeOiIntoRollover } from "@/app/utils/mergeOiIntoRollover";
import { buildSectorTimeline } from "@/app/utils/buildSectorTimeline";
import { loadMarketCaps } from "@/app/utils/loadMarketCaps";

import Sidebar from "../../../components/Sidebar";
import TimelineBubble from "./components/TimelineBubble";

import Header from "./components/Header";
import Footer from "./components/Footer";

import {
  buildBubbleFromTimeline,
  buildStockBubbleFromTimeline,
  buildAllStocksBubble,
} from "./utils/buildStockBubbleFromTimeline";

const MemoHeader = React.memo(Header);
const MemoFooter = React.memo(Footer);

// 🔥 PERF FIX P3: stable empty-array reference at module scope
const EMPTY_ARRAY = Object.freeze([]);

// 🆕 NEW: Default sector when no URL param is present or invalid sector requested
const DEFAULT_SECTOR = "PHARMA";

// ═══════════════════════════════════════════════════════════════════════
// 🆕 NEW: Outer wrapper with Suspense boundary
//
// Next.js 16 STRICTLY requires useSearchParams() to be inside a Suspense
// boundary. Even with "force-dynamic", the prerender step still runs
// briefly and trips on the hook.
//
// Solution: Split the component into TWO:
//   1. Page() — Outer component, just wraps inner in <Suspense>
//   2. BubbleChartContent() — Inner component, has all the logic
//
// This pattern is the OFFICIAL Next.js recommendation.
// ═══════════════════════════════════════════════════════════════════════
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen text-gray-400">
          Loading market data...
        </div>
      }
    >
      <BubbleChartContent />
    </Suspense>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT — all your existing logic is here.
// Renamed from Page() → BubbleChartContent()
// ═══════════════════════════════════════════════════════════════════════
function BubbleChartContent() {
  // 🆕 NEW: URL state hooks
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 🆕 NEW: Read sector from URL on mount, fallback to PHARMA
  // .trim() handles edge cases like "?sector=%20ENERGY%20" with whitespace
  const urlSector = searchParams.get("sector")?.trim();
  const initialSector = urlSector || DEFAULT_SECTOR;

  const [sectors, setSectors] = useState([]);
  const [ticks, setTicks] = useState([]);

  // 🆕 CHANGED: Default mode is "stock" since we have a default sector pre-selected
  const [mode, setMode] = useState(initialSector ? "stock" : "sector");

  // 🆕 CHANGED: Use private setter (_setSelectedSector) — public wrapper added below
  const [selectedSector, _setSelectedSector] = useState(initialSector);

  // 🆕 NEW: Public setter wrapper that syncs to URL
  const setSelectedSector = useCallback(
    (newSector) => {
      _setSelectedSector(newSector);

      // Update URL without page reload
      const params = new URLSearchParams(window.location.search);
      if (newSector) {
        params.set("sector", newSector);
      } else {
        params.delete("sector");
      }
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router],
  );

  const [timeline, setTimeline] = useState([]);

  const [useShouldApplyControls, setUseShouldApplyControls] = useState(false);
  const [useRelative, setUseRelative] = useState(false);

  const [bubbleControls, setBubbleControls] = useState({
    price: false,
    volume: false,
    delivery: false,
    oi: false,
  });
  const [rowPosition, setRowPosition] = useState("center");
  const [highlightStock, setHighlightStock] = useState(null);
  const [fixTooltip, setFixTooltip] = useState(false);
  const [showWatermark, setShowWatermark] = useState(false);
  const [hideBands, setHideBands] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [cameFromSector, setCameFromSector] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [draggingSector, setDraggingSector] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const [showTooltip, setShowTooltip] = useState(true);
  const [rolloverDataMap, setRolloverDataMap] = useState(null);
  const [pastDays, setPastDays] = useState(() => {
    if (typeof window === "undefined") return 90;
    const saved = localStorage.getItem("bubble_past_days");
    return saved === "all" ? null : saved ? Number(saved) : 90;
  });

  const [enableSignalEngine, setEnableSignalEngine] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("enable_signal_engine");
    return saved === null ? true : saved === "true";
  });

  useEffect(() => {
    localStorage.setItem("enable_signal_engine", String(enableSignalEngine));
  }, [enableSignalEngine]);

  useEffect(() => {
    localStorage.setItem(
      "bubble_past_days",
      pastDays === null ? "all" : String(pastDays),
    );
  }, [pastDays]);

  const filteredTimeline = useMemo(() => {
    if (!timeline?.length) return [];
    if (pastDays === null) return timeline;
    return timeline.slice(-pastDays);
  }, [timeline, pastDays]);

  const [favoriteStocks, setFavoriteStocks] = useState(() => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem("favorite_stocks_v1");
    return saved ? JSON.parse(saved) : [];
  });

  const moveSector = (from, to) => {
    setSectors((prev) => {
      const updated = [...prev];
      const [item] = updated.splice(from, 1);
      updated.splice(to, 0, item);
      return updated;
    });
  };

  const STORAGE_KEY = "sector_order_v1";

  const isTyping = searchQuery !== deferredSearchQuery;

  const allStocks = useMemo(() => {
    const set = new Set();
    timeline.forEach((day) => {
      (day.stocks || []).forEach((s) => {
        const sym = s.symbol || s.SYMBOL;
        if (sym) set.add(sym);
      });
    });
    return Array.from(set);
  }, [timeline]);

  const marketCapMap = useMemo(() => {
    if (!timeline.length) return {};
    const latest = timeline[timeline.length - 1];
    const map = {};
    (latest.stocks || []).forEach((s) => {
      const symbol = s.symbol || s.SYMBOL;
      map[symbol] = s.market_cap || s.mcap || s.marketCap || s.MARKET_CAP || 0;
    });
    return map;
  }, [timeline]);

  const stockToSectorMap = useMemo(() => {
    const map = {};
    timeline.forEach((day) => {
      (day.stocks || []).forEach((s) => {
        const symbol = s.symbol || s.SYMBOL;
        const sector = s.sector || "UNKNOWN";
        if (!map[symbol]) {
          map[symbol] = sector;
        }
      });
    });
    return map;
  }, [timeline]);

  const sectorStocksMap = useMemo(() => {
    const map = {};
    timeline.forEach((day) => {
      (day.stocks || []).forEach((s) => {
        const symbol = s.symbol || s.SYMBOL;
        const sector = s.sector || "UNKNOWN";
        if (!symbol) return;
        if (!map[sector]) map[sector] = new Set();
        map[sector].add(symbol);
      });
    });
    return map;
  }, [timeline]);

  function sortByMarketCap(list, map) {
    return [...list]
      .filter(Boolean)
      .sort((a, b) => (map[b] || 0) - (map[a] || 0));
  }

  function handleSectorClick(sec) {
    if (!timeline.length || !sectors.length) return;
    setActiveCategory(null);
    setHighlightStock(null);
    setSelectedSector(sec); // ← This now also updates URL automatically
    if (sec !== null) {
      setMode("stock");
    }
  }

  const allCategories = useMemo(() => {
    if (mode !== "all") return [];
    const result = [];
    Object.keys(sectorStocksMap)
      .sort((a, b) => {
        const aCap = Array.from(sectorStocksMap[a]).reduce(
          (sum, s) => sum + (marketCapMap[s] || 0),
          0,
        );
        const bCap = Array.from(sectorStocksMap[b]).reduce(
          (sum, s) => sum + (marketCapMap[s] || 0),
          0,
        );
        return bCap - aCap;
      })
      .forEach((sector) => {
        const symbols = Array.from(sectorStocksMap[sector]);
        const sorted = sortByMarketCap(symbols, marketCapMap);
        sorted.forEach((sym) => result.push(sym));
        result.push("");
      });
    return result;
  }, [mode, sectorStocksMap, marketCapMap]);

  const stockCategories = useMemo(() => {
    if (!selectedSector) return [];
    const symbolSet = sectorStocksMap[selectedSector];
    if (!symbolSet) return [];
    const arr = Array.from(symbolSet);
    return sortByMarketCap(arr, marketCapMap);
  }, [selectedSector, sectorStocksMap, marketCapMap]);

  const sectorBubbleData = useMemo(() => {
    if (mode !== "sector") return [];
    if (!filteredTimeline.length || !sectors.length) return [];
    return buildBubbleFromTimeline(
      filteredTimeline,
      sectors,
      useShouldApplyControls,
      bubbleControls,
      rowPosition,
      rolloverDataMap,
      enableSignalEngine,
    );
  }, [
    mode,
    filteredTimeline,
    sectors,
    useShouldApplyControls,
    bubbleControls,
    rowPosition,
    rolloverDataMap,
    enableSignalEngine,
  ]);

  const { bubbles: allBubbleData, sectorPositions } = useMemo(() => {
    if (mode !== "all") return { bubbles: [], sectorPositions: {} };
    if (!filteredTimeline.length || !allCategories.length || !rolloverDataMap)
      return { bubbles: [], sectorPositions: {} };
    return buildAllStocksBubble(
      filteredTimeline,
      allCategories,
      useRelative,
      useShouldApplyControls,
      bubbleControls,
      rolloverDataMap,
      rowPosition,
    );
  }, [
    mode,
    filteredTimeline,
    allCategories,
    useRelative,
    useShouldApplyControls,
    bubbleControls,
    rolloverDataMap,
    rowPosition,
  ]);

  const stockBubbleData = useMemo(() => {
    if (mode !== "stock" || !selectedSector) return [];
    if (!filteredTimeline.length || !stockCategories.length || !rolloverDataMap)
      return [];
    return buildStockBubbleFromTimeline(
      filteredTimeline,
      selectedSector,
      stockCategories,
      useRelative,
      useShouldApplyControls,
      bubbleControls,
      rolloverDataMap,
      rowPosition,
      enableSignalEngine,
    );
  }, [
    mode,
    selectedSector,
    filteredTimeline,
    stockCategories,
    useRelative,
    useShouldApplyControls,
    bubbleControls,
    rolloverDataMap,
    rowPosition,
    enableSignalEngine,
  ]);

  const allSymbols = useMemo(() => {
    const map = {};
    timeline.forEach((day) => {
      (day.stocks || []).forEach((s) => {
        const symbol = s.symbol || s.SYMBOL;
        const sector = s.sector || "UNKNOWN";
        if (symbol && !map[symbol]) {
          map[symbol] = { symbol, sector };
        }
      });
    });
    return Object.values(map);
  }, [timeline]);

  function handleBack() {
    setSelectedSector(null); // ← Also clears ?sector= from URL
    setMode("sector");
  }
  const sectorRefs = useRef({});

  const favoriteCategories = useMemo(() => {
    return sortByMarketCap(favoriteStocks, marketCapMap);
  }, [favoriteStocks, marketCapMap]);

  const favoriteBubbleData = useMemo(() => {
    if (mode !== "favorites") return [];
    if (
      !filteredTimeline.length ||
      !favoriteCategories.length ||
      !rolloverDataMap
    )
      return [];
    return buildStockBubbleFromTimeline(
      filteredTimeline,
      "FAVORITES",
      favoriteCategories,
      useRelative,
      useShouldApplyControls,
      bubbleControls,
      rolloverDataMap,
      rowPosition,
      enableSignalEngine,
    );
  }, [
    mode,
    filteredTimeline,
    favoriteCategories,
    useRelative,
    useShouldApplyControls,
    bubbleControls,
    rolloverDataMap,
    rowPosition,
    enableSignalEngine,
  ]);

  const chartData = useMemo(() => {
    if (mode === "favorites") return favoriteBubbleData;
    if (mode === "all") return allBubbleData;
    if (mode === "sector") return sectorBubbleData;
    if (mode === "stock") return stockBubbleData;
    return [];
  }, [
    mode,
    favoriteBubbleData,
    allBubbleData,
    sectorBubbleData,
    stockBubbleData,
  ]);

  const chartCategories = useMemo(() => {
    return mode === "sector"
      ? sectors
      : mode === "stock"
        ? stockCategories
        : mode === "favorites"
          ? favoriteCategories
          : allCategories;
  }, [mode, sectors, stockCategories, favoriteCategories, allCategories]);

  const memoChartData = useMemo(() => chartData, [chartData]);
  const memoCategories = useMemo(() => chartCategories, [chartCategories]);
  const memoTicks = useMemo(() => ticks, [ticks]);

  const memoFooterProps = useMemo(
    () => ({
      sectors,
      selectedSector,
      setActiveCategory,
      onSectorClick: handleSectorClick,
      sectorRefs,
      mode,
      setCameFromSector,
      onBack: handleBack,
      draggingSector,
      setDraggingSector,
      moveSector,
      dropIndex,
      setDropIndex,
      setMode,
      favoriteStocks,
    }),
    [sectors, selectedSector, mode, draggingSector, dropIndex, favoriteStocks],
  );

  const frozenDataRef = useRef({
    data: memoChartData,
    categories: memoCategories,
    ticks: memoTicks,
  });

  const displayData = isTyping ? frozenDataRef.current.data : memoChartData;

  const displayCategories = isTyping
    ? frozenDataRef.current.categories
    : memoCategories;

  const displayTicks = isTyping ? frozenDataRef.current.ticks : memoTicks;

  // ─── Initialize sectors from market data ───
  useEffect(() => {
    async function init() {
      const market = await loadMarketCaps("LOCAL");
      const marketRows = market?.rows || [];

      if (!marketRows.length) return;

      const timeline = buildSectorTimeline(marketRows, "1D");
      setTimeline(timeline);
      if (!timeline.length) return;

      const sectorSet = new Set();
      timeline.forEach((d) => {
        d.sectors.forEach((s) => sectorSet.add(s.name));
      });

      const sectorsArr = Array.from(sectorSet);

      const tickArr = timeline
        .filter((_, i) => i % 3 === 0)
        .map((d) => new Date(d.date).getTime());

      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        try {
          const savedOrder = JSON.parse(saved);
          const ordered = savedOrder.filter((s) => sectorsArr.includes(s));
          const missing = sectorsArr.filter((s) => !ordered.includes(s));
          setSectors([...ordered, ...missing]);
        } catch {
          setSectors(sectorsArr);
        }
      } else {
        setSectors(sectorsArr);
      }
      setTicks(tickArr);
    }

    init();
  }, []);

  // 🆕 UPDATED: Validate URL sector once sectors data is loaded
  // If invalid sector in URL, switch to "sector" mode (show all sectors view)
  // This lets user pick from the full list instead of being dumped into PHARMA
  useEffect(() => {
    if (!sectors || sectors.length === 0) return;

    // Skip validation if no sector is currently selected (already in sector mode)
    if (!selectedSector) return;

    // Check if current selectedSector is valid
    const isValid = sectors.includes(selectedSector);

    if (!isValid) {
      console.log(
        `⚠️ Invalid sector "${selectedSector}", switching to sector overview`,
      );

      // Clear the selected sector and switch to "all sectors" view
      _setSelectedSector(null);
      setMode("sector");

      // Remove ?sector= from URL
      const params = new URLSearchParams(window.location.search);
      params.delete("sector");
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    }
  }, [sectors, selectedSector, pathname, router]);

  // 🆕 NEW: Bonus polish — browser tab title shows current sector
  useEffect(() => {
    if (selectedSector) {
      document.title = `${selectedSector} — DalalRadar`;
    } else {
      document.title = "Bubble Chart — DalalRadar";
    }
  }, [selectedSector]);

  useEffect(() => {
    if (!isTyping) {
      frozenDataRef.current = {
        data: memoChartData,
        categories: memoCategories,
        ticks: memoTicks,
      };
    }
  }, [isTyping, memoChartData, memoCategories, memoTicks]);

  const handleSearch = (stock, sectorFromSearch) => {
    const sector = sectorFromSearch || stockToSectorMap[stock];
    if (!sector) return;
    setSelectedSector(sector); // ← also updates URL
    setMode("stock");
    setHighlightStock(stock);
  };

  useEffect(() => {
    if (!sectors.length) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sectors));
  }, [sectors]);

  useEffect(() => {
    localStorage.setItem("favorite_stocks_v1", JSON.stringify(favoriteStocks));
  }, [favoriteStocks]);

  function toggleFavorite(symbol) {
    setFavoriteStocks((prev) =>
      prev.includes(symbol)
        ? prev.filter((s) => s !== symbol)
        : [...prev, symbol],
    );
  }

  useEffect(() => {
    let mounted = true;

    Promise.all([
      import("@/data/rolloverData.json"),
      import("@/data/fno.json"),
    ]).then(([rollover, oi]) => {
      if (!mounted) return;
      const merged = mergeOiIntoRollover(rollover.default, oi.default);
      setRolloverDataMap(merged);
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!rolloverDataMap) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        Loading market data...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100">
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <section className="h-screen flex flex-col">
          <div className="flex-1">
            <div
              style={{
                width: "100%",
                height: "100%",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                }}
              >
                <MemoHeader
                  useShouldApplyControls={useShouldApplyControls}
                  setUseShouldApplyControls={setUseShouldApplyControls}
                  useRelative={useRelative}
                  setUseRelative={setUseRelative}
                  bubbleControls={bubbleControls}
                  setBubbleControls={setBubbleControls}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  setSelectedSector={setSelectedSector}
                  allSymbols={allSymbols}
                  onSearch={handleSearch}
                  rowPosition={rowPosition}
                  setRowPosition={setRowPosition}
                  fixTooltip={fixTooltip}
                  setFixTooltip={setFixTooltip}
                  hideBands={hideBands}
                  setHideBands={setHideBands}
                  mode={mode}
                  setMode={setMode}
                  setActiveCategory={setActiveCategory}
                  showWatermark={showWatermark}
                  setShowWatermark={setShowWatermark}
                  showTooltip={showTooltip}
                  setShowTooltip={setShowTooltip}
                  setHighlightStock={setHighlightStock}
                  pastDays={pastDays}
                  setPastDays={setPastDays}
                  enableSignalEngine={enableSignalEngine}
                  setEnableSignalEngine={setEnableSignalEngine}
                />
                <TimelineBubble
                  data={displayData}
                  categories={displayCategories}
                  ticks={displayTicks}
                  mode={mode}
                  setMode={setMode}
                  selectedSector={selectedSector}
                  onSectorClick={handleSectorClick}
                  onBack={handleBack}
                  sectors={sectors}
                  setSelectedSector={setSelectedSector}
                  sectorPositions={sectorPositions}
                  allowedSectors={EMPTY_ARRAY}
                  useRelative={useRelative}
                  setUseRelative={setUseRelative}
                  useShouldApplyControls={useShouldApplyControls}
                  setUseShouldApplyControls={setUseShouldApplyControls}
                  bubbleControls={bubbleControls}
                  setBubbleControls={setBubbleControls}
                  rowPosition={rowPosition}
                  setRowPosition={setRowPosition}
                  onSearch={handleSearch}
                  stockToSectorMap={stockToSectorMap}
                  allStocks={allStocks}
                  highlightStock={highlightStock}
                  allSymbols={allSymbols}
                  hideBands={hideBands}
                  fixTooltip={fixTooltip}
                  activeCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                  showWatermark={showWatermark}
                  toggleFavorite={toggleFavorite}
                  favoriteStocks={favoriteStocks}
                  showTooltip={showTooltip}
                  enableSignalEngine={enableSignalEngine}
                  setEnableSignalEngine={setEnableSignalEngine}
                />
              </div>
              <MemoFooter {...memoFooterProps} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
