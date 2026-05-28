// app/tools/smart-money/page.js
//
// 🔒 PROTECTED: Signal engine moved to backend API (/api/signals)
// - Bubbles render immediately (no signals first)
// - Signals fetched async from protected backend
// - Painted onto bubbles when API response arrives

"use client";

export const dynamic = "force-dynamic";

import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useDeferredValue,
  useCallback,
  Suspense,
} from "react";

import { useSearchParams, useRouter, usePathname } from "next/navigation";

import SiteFooter from "@/components/SiteFooter";
import { mergeOiIntoRollover } from "@/app/utils/mergeOiIntoRollover";
import { buildSectorTimeline } from "@/app/utils/buildSectorTimeline";
import { loadMarketCaps } from "@/app/utils/loadMarketCaps";

//import Sidebar from "../../../components/Sidebar";
import TimelineBubble from "./components/TimelineBubble";

import Header from "./components/Header";
import Footer from "./components/Footer";

// 🔥 NEW: shared brand loader
import { RadarLoaderScreen } from "@/app/components/RadarLoader";
import SmartMoneyTour from "./components/SmartMoneyTour";

import {
  buildBubbleFromTimeline,
  buildStockBubbleFromTimeline,
  buildAllStocksBubble,
} from "./utils/buildStockBubbleFromTimeline";

const MemoHeader = React.memo(Header);
const MemoFooter = React.memo(Footer);

const EMPTY_ARRAY = Object.freeze([]);
const DEFAULT_SECTOR = "METAL";

// ═══════════════════════════════════════════════════════════════════════
// Outer wrapper with Suspense boundary
// ═══════════════════════════════════════════════════════════════════════
export default function Page() {
  return (
    <Suspense
      fallback={
        <RadarLoaderScreen
          label="Loading Market Data"
          sublabel="Building the smart money radar…"
        />
      }
    >
      <BubbleChartContent />
    </Suspense>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
function BubbleChartContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlSector = searchParams.get("sector")?.trim();
  const initialSector = urlSector || DEFAULT_SECTOR;

  const [sectors, setSectors] = useState([]);
  const [ticks, setTicks] = useState([]);
  const [mode, setMode] = useState(initialSector ? "stock" : "sector");
  const [selectedSector, _setSelectedSector] = useState(initialSector);

  const setSelectedSector = useCallback(
    (newSector) => {
      _setSelectedSector(newSector);
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
    if (typeof window === "undefined") return 30;
    const saved = localStorage.getItem("bubble_past_days");
    return saved === "all" ? null : saved ? Number(saved) : 30;
  });

  // 🆕 Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 600);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [enableSignalEngine, setEnableSignalEngine] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("enable_signal_engine");
    return saved === null ? true : saved === "true";
  });

  // 🔒 NEW: signals fetched from protected backend
  const [signalsMap, setSignalsMap] = useState({});

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
    setSelectedSector(sec);
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
      false, // 🔒 enableSignalEngine = false (signals come from API)
    );
  }, [
    mode,
    filteredTimeline,
    sectors,
    useShouldApplyControls,
    bubbleControls,
    rowPosition,
    rolloverDataMap,
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
      false, // 🔒 enableSignalEngine = false (signals come from API)
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
    setSelectedSector(null);
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
      false, // 🔒 enableSignalEngine = false (signals come from API)
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
  ]);

  // 🔧 RENAMED: original chartData → baseChartData (without signals)
  const baseChartData = useMemo(() => {
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

  // 🔒 NEW: chartData = baseChartData + signals from API
  const chartData = useMemo(() => {
    if (!baseChartData?.length) return baseChartData;
    if (!enableSignalEngine || Object.keys(signalsMap).length === 0) {
      return baseChartData;
    }
    return baseChartData.map((b) => {
      const key = b.stock || b.sector;
      const lookupKey = `${key}-${b.x}`;
      const sig = signalsMap[lookupKey];
      if (!sig) return b;
      return {
        ...b,
        bubbleSignal: sig.bubbleSignal,
        signalValidation: sig.signalValidation,
        hasBuySignal: sig.bubbleSignal?.type === "BUY",
        hasSellSignal: sig.bubbleSignal?.type === "SELL",
        hasWarnSignal: sig.bubbleSignal?.type === "WARN",
      };
    });
  }, [baseChartData, signalsMap, enableSignalEngine]);

  // 🔒 NEW: Fetch signals from protected backend API
  useEffect(() => {
    if (!enableSignalEngine) {
      setSignalsMap({});
      return;
    }

    if (!baseChartData?.length) {
      setSignalsMap({});
      return;
    }

    // Group bubbles by key (stock or sector)
    const bubblesByKey = {};
    for (const b of baseChartData) {
      const key = b.stock || b.sector;
      if (!key) continue;
      if (!bubblesByKey[key]) bubblesByKey[key] = [];
      bubblesByKey[key].push({
        x: b.x,
        price: b.price,
        delivery: b.delivery,
        volume: b.volume,
        oi: b.oi,
        oiChangePct: b.oiChangePct,
        turnover: b.turnover,
        turnoverChange: b.turnoverChange,
        moneyFlowScore: b.moneyFlowScore,
      });
    }

    // Sort each key's bubbles chronologically
    for (const key of Object.keys(bubblesByKey)) {
      bubblesByKey[key].sort((a, b) => a.x - b.x);
    }

    let cancelled = false;
    fetch("/api/signals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bubblesByKey }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        // Build lookup: "STOCK-timestamp" → { bubbleSignal, signalValidation }
        const lookup = {};
        for (const [key, arr] of Object.entries(data.signals || {})) {
          const sortedX = bubblesByKey[key].map((b) => b.x);
          arr.forEach((sig, i) => {
            if (sig?.bubbleSignal) {
              lookup[`${key}-${sortedX[i]}`] = sig;
            }
          });
        }
        setSignalsMap(lookup);
      })
      .catch((err) => {
        console.warn("Signals fetch failed:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [enableSignalEngine, baseChartData]);

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

  // Validate URL sector once sectors data is loaded
  useEffect(() => {
    if (!sectors || sectors.length === 0) return;
    if (!selectedSector) return;

    const isValid = sectors.includes(selectedSector);

    if (!isValid) {
      console.log(
        `⚠️ Invalid sector "${selectedSector}", switching to sector overview`,
      );
      _setSelectedSector(null);
      setMode("sector");

      const params = new URLSearchParams(window.location.search);
      params.delete("sector");
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    }
  }, [sectors, selectedSector, pathname, router]);

  // Browser tab title shows current sector
  useEffect(() => {
    if (selectedSector) {
      document.title = `${selectedSector} — DalalRadar`;
    } else {
      document.title = "Smart Money Radar — DalalRadar";
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
    setSelectedSector(sector);
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
      <RadarLoaderScreen
        label="Loading Market Data"
        sublabel="Merging rollover + open interest…"
      />
    );
  }

  return (
    <div
      style={{
        overflowX: isMobile ? "auto" : "visible",
        WebkitOverflowScrolling: "touch",
        width: "100%",
      }}
    >
      {isMobile && (
        <div
          style={{
            position: "sticky",
            left: 0,
            background: "rgba(0,255,162,0.1)",
            borderBottom: "1px solid rgba(0,255,162,0.25)",
            padding: "6px 12px",
            fontSize: 11,
            color: "#00ffa2",
            textAlign: "center",
            fontWeight: 600,
            zIndex: 1000,
          }}
        >
          👆 Swipe horizontally · Best on desktop
        </div>
      )}
      <div
        style={{
          minWidth: isMobile ? 1280 : "auto",
          width: isMobile ? 1280 : "100%",
        }}
      >
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
      </div>
      <SiteFooter />
      <SmartMoneyTour />
    </div>
  );
}