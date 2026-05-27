"use client";

// ════════════════════════════════════════════════════════════
//  MASTER ALPHA COMMANDER — Dashboard Page (v5 — expandable)
//  Place at: app/tools/market-alpha/page.js
//
//  New in v5: Click a sector row to expand and see all stocks
//  in that sector with their performance over the selected period.
// ════════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea, LabelList,
} from "recharts";
import {
  TrendingUp, Flame, Layers, Activity, AlertTriangle,
  ShieldCheck, Waves, RefreshCw, Sun, Moon, Loader2, Zap,
  ChevronDown, ChevronRight,
} from "lucide-react";

import DashboardHeader from "@/app/components/DashboardHeader";
import SiteFooter from "@/components/SiteFooter";

/* ════════════════════════════════════════════════════════════
   COLOR PALETTES
═══════════════════════════════════════════════════════════ */
const PALETTE_DARK = [
  "#FF6B6B", "#4ECDC4", "#FFE66D", "#A8E6CF", "#FF8B94",
  "#95E1D3", "#FFA07A", "#C7CEEA", "#FFDAC1", "#B5EAD7",
  "#9B89B3", "#F8B195", "#F67280", "#C06C84", "#6C5B7B",
  "#FFB7B2", "#FFDFD3", "#84B6F4", "#FDFD96", "#FF9AA2",
  "#B5B9FF", "#97A2FF", "#9D8DF1", "#FFD700", "#7FFF00", "#00CED1",
];
const PALETTE_LIGHT = [
  "#D32F2F", "#1976D2", "#388E3C", "#F57C00", "#7B1FA2",
  "#0097A7", "#C2185B", "#5D4037", "#455A64", "#E64A19",
  "#303F9F", "#689F38", "#FBC02D", "#0288D1", "#7C4DFF",
  "#00796B", "#AFB42B", "#512DA8", "#D81B60", "#827717",
  "#3949AB", "#00897B", "#6D4C41", "#1565C0", "#558B2F", "#BF360C",
];

function classifyAction(val) {
  if (val >= 115) return { label: "🚀 STRONG BUY", tone: "buy-strong" };
  if (val >= 105) return { label: "✅ BUY", tone: "buy" };
  if (val >= 100) return { label: "✅ ACCUMULATE", tone: "accum" };
  if (val >= 95) return { label: "⚖️ HOLD", tone: "hold" };
  if (val >= 88) return { label: "⚠️ WEAK", tone: "weak" };
  return { label: "💀 AVOID", tone: "avoid" };
}

const TONE_DARK = {
  "buy-strong": "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
  "buy": "bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30",
  "accum": "bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/30",
  "hold": "bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30",
  "weak": "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30",
  "avoid": "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30",
};
const TONE_LIGHT = {
  "buy-strong": "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300",
  "buy": "bg-cyan-100 text-cyan-800 ring-1 ring-cyan-300",
  "accum": "bg-teal-100 text-teal-800 ring-1 ring-teal-300",
  "hold": "bg-slate-100 text-slate-700 ring-1 ring-slate-300",
  "weak": "bg-amber-100 text-amber-800 ring-1 ring-amber-300",
  "avoid": "bg-rose-100 text-rose-800 ring-1 ring-rose-300",
};

/* ════════════════════════════════════════════════════════════
   SECTOR DETAIL — expandable sub-panel for one sector
═══════════════════════════════════════════════════════════ */
function SectorDetail({ sector, period, isDark, subText, periodLabel }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(
      `/api/market-alpha/sector-stocks?sector=${encodeURIComponent(sector)}&period=${period}&_t=${Date.now()}`,
      { cache: "no-store" }
    )
      .then(async (res) => {
        const json = await res.json();
        if (!json.success) throw new Error(json.error || `HTTP ${res.status}`);
        return json;
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [sector, period]);

  if (loading) {
    return (
      <div className={`px-3 py-4 flex items-center justify-center gap-2 text-xs ${subText}`}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading {sector} stocks…
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-3 py-3 text-xs text-rose-400 flex items-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5" /> {error}
      </div>
    );
  }

  const stocks = data?.stocks || [];
  if (stocks.length === 0) {
    return <div className={`px-3 py-3 text-xs ${subText}`}>No stocks loaded.</div>;
  }

  const benchChg = data?.benchmarkPctChg;

  return (
    <div className={`px-2 py-2 ${isDark ? "bg-slate-950/60" : "bg-slate-100/70"}`}>
      {/* Sub-header */}
      <div className="flex items-center justify-between px-2 py-1.5 mb-1">
        <div className={`text-[10px] uppercase tracking-wider font-bold ${subText}`}>
          Stocks · {periodLabel}
        </div>
        {benchChg != null && (
          <div className={`text-[10px] font-mono ${subText}`}>
            Nifty:{" "}
            <span className={benchChg >= 0 ? "text-emerald-400" : "text-rose-400"}>
              {benchChg >= 0 ? "+" : ""}{benchChg.toFixed(2)}%
            </span>
            {data.fromCache && (
              <span className="ml-2 text-[9px] text-emerald-500/70">CACHED</span>
            )}
          </div>
        )}
      </div>

      {/* Column labels */}
      <div className={`grid grid-cols-12 gap-1 px-2 py-1 text-[9px] uppercase tracking-wider font-bold ${subText}`}>
        <span className="col-span-4">Ticker</span>
        <span className="col-span-2 text-right">Price</span>
        <span className="col-span-2 text-right">% Chg</span>
        <span className="col-span-2 text-right">vs Nifty</span>
        <span className="col-span-2 text-right">5D</span>
      </div>

      {/* Stock rows */}
      <div className="space-y-0.5">
        {stocks.map((s) => {
          if (s.status === "no-data") {
            return (
              <div
                key={s.ticker}
                className={`grid grid-cols-12 gap-1 items-center px-2 py-1.5 text-[11px] rounded ${subText}`}
              >
                <span className="col-span-4 font-mono truncate font-medium">
                  {s.ticker.replace(".NS", "")}
                </span>
                <span className="col-span-8 text-right italic text-[10px] opacity-60">
                  no data
                </span>
              </div>
            );
          }
          const isOutperforming = benchChg != null && s.pctChg > benchChg;
          return (
            <div
              key={s.ticker}
              className={`grid grid-cols-12 gap-1 items-center px-2 py-1.5 text-[11px] rounded transition ${
                isDark ? "hover:bg-slate-800/60" : "hover:bg-white"
              }`}
            >
              <span className="col-span-4 font-mono truncate font-semibold">
                {s.ticker.replace(".NS", "")}
              </span>
              <span className="col-span-2 font-mono text-right tabular-nums">
                ₹{s.endPrice?.toFixed(0)}
              </span>
              <span
                className={`col-span-2 font-mono text-right tabular-nums font-bold ${
                  s.pctChg >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {s.pctChg >= 0 ? "+" : ""}
                {s.pctChg.toFixed(1)}%
              </span>
              <span
                className={`col-span-2 font-mono text-right tabular-nums ${
                  s.rsVsBench == null
                    ? subText
                    : s.rsVsBench >= 0
                    ? "text-cyan-400"
                    : "text-amber-400"
                }`}
              >
                {s.rsVsBench == null
                  ? "–"
                  : `${s.rsVsBench >= 0 ? "+" : ""}${s.rsVsBench.toFixed(1)}`}
              </span>
              <span
                className={`col-span-2 font-mono text-right tabular-nums text-[10px] ${
                  s.recentChg == null
                    ? subText
                    : s.recentChg >= 0
                    ? "text-emerald-400/80"
                    : "text-rose-400/80"
                }`}
              >
                {s.recentChg == null
                  ? "–"
                  : `${s.recentChg >= 0 ? "+" : ""}${s.recentChg.toFixed(1)}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PAGE COMPONENT
═══════════════════════════════════════════════════════════ */
export default function MarketAlphaPage() {
  const [theme, setTheme] = useState("dark");
  const [displayMode, setDisplayMode] = useState("filtered");
  const [topN] = useState(5);
  const [bottomN] = useState(5);
  const [period, setPeriod] = useState("3mo");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Whale tracker — lazy loaded
  const [whales, setWhales] = useState(null);
  const [whalesLoading, setWhalesLoading] = useState(false);
  const [whalesError, setWhalesError] = useState(null);

  // Expanded sectors — Set of sector names currently expanded
  const [expandedSectors, setExpandedSectors] = useState(new Set());

  /* ─── Fetch ranking ─── */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setWhales(null);
    setWhalesError(null);
    setExpandedSectors(new Set()); // collapse all on period change

    const cacheBuster = Date.now();
    fetch(`/api/market-alpha?period=${period}&_t=${cacheBuster}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    })
      .then(async (res) => {
        const text = await res.text();
        let json;
        try { json = JSON.parse(text); }
        catch (_) {
          throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
        }
        if (!json.success) throw new Error(json.error || `HTTP ${res.status}`);
        return json;
      })
      .then((json) => {
        if (cancelled) return;
        if (json.period && json.period !== period) {
          console.warn(`Period mismatch: requested ${period}, got ${json.period}`);
        }
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [period, refreshKey]);

  const isDark = theme === "dark";

  const toggleSector = (sector) => {
    setExpandedSectors((prev) => {
      const next = new Set(prev);
      if (next.has(sector)) next.delete(sector);
      else next.add(sector);
      return next;
    });
  };

  /* ─── VIX regime ─── */
  const vixRegime = useMemo(() => {
    const vix = data?.vix ?? 0;
    if (vix < 14) return {
      label: "SAFE", action: "Aggressive Sizing", icon: ShieldCheck,
      ring: "ring-emerald-500/40", bg: "bg-emerald-500/10",
      text: "text-emerald-400", solid: "bg-emerald-500",
    };
    if (vix < 18) return {
      label: "CAUTION", action: "Standard Sizing", icon: AlertTriangle,
      ring: "ring-amber-500/40", bg: "bg-amber-500/10",
      text: "text-amber-400", solid: "bg-amber-500",
    };
    return {
      label: "DANGER", action: "Reduce / Cash", icon: AlertTriangle,
      ring: "ring-rose-500/40", bg: "bg-rose-500/10",
      text: "text-rose-400", solid: "bg-rose-500",
    };
  }, [data]);

  const allSorted = useMemo(() => {
    if (!data?.finalScores) return [];
    return Object.entries(data.finalScores)
      .sort((a, b) => b[1] - a[1])
      .map(([s]) => s);
  }, [data]);

  const colorMap = useMemo(() => {
    const palette = isDark ? PALETTE_DARK : PALETTE_LIGHT;
    const m = {};
    allSorted.forEach((s, i) => { m[s] = palette[i % palette.length]; });
    return m;
  }, [allSorted, isDark]);

  const displayedSectors = useMemo(() => {
    if (displayMode === "all") return allSorted;
    if (allSorted.length <= topN + bottomN) return allSorted;
    return [...allSorted.slice(0, topN), ...allSorted.slice(-bottomN)];
  }, [allSorted, displayMode, topN, bottomN]);

  const chartData = useMemo(() => {
    if (!data?.sectorHistory) return [];
    const dateMap = new Map();
    allSorted.forEach((sector) => {
      (data.sectorHistory[sector] || []).forEach((p) => {
        if (!dateMap.has(p.date)) dateMap.set(p.date, { date: p.date });
        dateMap.get(p.date)[sector] = p.value;
      });
    });
    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [data, allSorted]);

  const yDomain = useMemo(() => {
    if (!chartData.length || !displayedSectors.length) return [80, 120];
    let lo = Infinity, hi = -Infinity;
    chartData.forEach((row) => {
      displayedSectors.forEach((s) => {
        const v = row[s];
        if (v != null) { if (v < lo) lo = v; if (v > hi) hi = v; }
      });
    });
    if (lo === Infinity) return [80, 120];
    const pad = Math.max(2, (hi - lo) * 0.08);
    return [Math.max(50, lo - pad), hi + pad];
  }, [chartData, displayedSectors]);

  const formatDateShort = (d) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  };

  const periodLabel = useMemo(() => {
    const map = {
      "1wk": "1 Week", "15d": "15 Days", "1mo": "1 Month",
      "3mo": "3 Months", "6mo": "6 Months", "1y": "1 Year", "2y": "2 Years",
    };
    return map[period] || period;
  }, [period]);

  /* ─── Lazy whale loader ─── */
  const loadWhales = async () => {
    if (!allSorted.length) return;
    setWhalesLoading(true);
    setWhalesError(null);
    const top5 = allSorted.slice(0, 5).join(",");
    try {
      const res = await fetch(`/api/market-alpha/whales?sectors=${encodeURIComponent(top5)}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Whale fetch failed");
      setWhales(json);
    } catch (e) {
      setWhalesError(e.message);
    } finally {
      setWhalesLoading(false);
    }
  };

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-500 animate-spin"></div>
          </div>
          <div className="font-mono text-sm tracking-wider text-cyan-400">
            📡 Loading sector ranking...
          </div>
          <div className="text-xs text-slate-500">
            First load: ~20s. Cached: instant.
          </div>
        </div>
      </div>
    );
  }

  /* ─── Error state ─── */
  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
        <div className="p-6 border border-rose-500/30 bg-rose-500/10">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="text-rose-400" />
            <h3 className="font-bold text-rose-400">Data fetch failed</h3>
          </div>
          <pre className="text-xs text-slate-400 mb-4 whitespace-pre-wrap break-words font-mono">{error}</pre>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="px-4 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-sm font-medium transition"
            >
              <RefreshCw className="inline w-4 h-4 mr-2" /> Retry
            </button>
            <a
              href={`/api/market-alpha?period=${period}`}
              target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-medium transition"
            >
              Open raw API →
            </a>
          </div>
        </div>
      </div>
    );
  }

  const themeBg = isDark ? "bg-slate-950" : "bg-slate-50";
  const themeText = isDark ? "text-slate-100" : "text-slate-900";
  const cardBg = isDark ? "bg-slate-900/70 backdrop-blur" : "bg-white";
  const cardBorder = isDark ? "border-slate-800" : "border-slate-200";
  const subText = isDark ? "text-slate-400" : "text-slate-500";
  const dividerColor = isDark ? "border-slate-800" : "border-slate-200";
  const gridStroke = isDark ? "#1e293b" : "#e2e8f0";
  const axisStroke = isDark ? "#64748b" : "#94a3b8";
  const benchmarkStroke = isDark ? "#f8fafc" : "#0f172a";
  const toneMap = isDark ? TONE_DARK : TONE_LIGHT;

  return (
    <div className={`min-h-screen ${themeBg} ${themeText} transition-colors duration-300`}>
      <DashboardHeader />
      {/* Atmospheric background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-3xl ${isDark ? "bg-cyan-500/5" : "bg-cyan-500/10"}`}></div>
        <div className={`absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full blur-3xl ${isDark ? "bg-purple-500/5" : "bg-purple-500/10"}`}></div>
      </div>

      <div className="relative p-4 md:p-6 lg:p-8 mx-auto">

        {/* ════════════════════════════════════════════════
            MERGED HEADER + VIX BAR (single row)
        ════════════════════════════════════════════════ */}
        <header
          className={`mb-6 border ${cardBg} ${cardBorder} border-l-4 ${vixRegime.ring.replace("ring-", "border-")} overflow-hidden`}
        >
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">

            {/* LEFT: Brand + meta */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex-shrink-0">
                <Layers className="text-cyan-500 w-6 h-6" />
                <div className="absolute inset-0 blur-md bg-cyan-500/40"></div>
              </div>
              <div className="min-w-0">
                <h1 className="flex items-center gap-2 text-base font-black tracking-tight leading-none">
                  <span className="whitespace-nowrap">MASTER ALPHA <span className="text-cyan-500">COMMANDER</span></span>
                  <span className="text-[9px] font-mono bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">v5</span>
                </h1>
                <div className={`mt-1 text-[10px] ${subText} flex items-center gap-1.5 flex-wrap leading-none`}>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 text-[9px] font-bold uppercase tracking-wider">
                    {data.period || period}
                  </span>
                  <span className="opacity-80">{data.dateRange.days}d</span>
                  {data.dateRange.start && (
                    <>
                      <span className="opacity-40">·</span>
                      <span className="opacity-80">{formatDateShort(data.dateRange.start)} → {formatDateShort(data.dateRange.end)}</span>
                    </>
                  )}
                  {data.fromCache && (
                    <>
                      <span className="opacity-40">·</span>
                      <span className="inline-flex items-center gap-0.5 text-emerald-400 font-bold">
                        <Zap className="w-2.5 h-2.5" /> {data.cacheAgeSec ? `${data.cacheAgeSec}s` : "cached"}
                      </span>
                    </>
                  )}
                  {!data.fromCache && data.elapsedSec != null && (
                    <>
                      <span className="opacity-40">·</span>
                      <span className="opacity-60 font-mono">{data.elapsedSec}s fresh</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* CENTER-RIGHT: VIX regime chip */}
            <div className={`flex items-center gap-3 px-3 py-1.5 rounded-md ${vixRegime.bg} ${vixRegime.ring} ring-1`}>
              <vixRegime.icon className={`w-4 h-4 ${vixRegime.text} flex-shrink-0`} />
              <div className="flex items-baseline gap-2">
                <span className={`text-xs font-black tracking-wide ${vixRegime.text}`}>
                  {vixRegime.label}
                </span>
                <span className={`text-[10px] font-mono opacity-90 ${vixRegime.text}`}>
                  VIX {data.vix?.toFixed(2)}
                </span>
                <span className={`text-[10px] ${subText} hidden sm:inline`}>
                  · {vixRegime.action}
                </span>
              </div>
            </div>

            {/* SPACER */}
            <div className="flex-1"></div>

            {/* RIGHT: Controls */}
            <div className="flex flex-wrap items-center gap-1.5">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className={`text-xs px-2.5 py-1.5 rounded-md border focus:outline-none focus:ring-2 focus:ring-cyan-500/30 ${
                  isDark ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-300 text-slate-700"
                }`}
              >
                <option value="1wk">1 Week</option>
                <option value="15d">15 Days</option>
                <option value="1mo">1 Month</option>
                <option value="3mo">3 Months</option>
                <option value="6mo">6 Months</option>
                <option value="1y">1 Year</option>
                <option value="2y">2 Years</option>
              </select>

              <button
                onClick={() => setDisplayMode((m) => (m === "all" ? "filtered" : "all"))}
                className="text-xs px-2.5 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition whitespace-nowrap"
              >
                {displayMode === "all" ? `All (${allSorted.length})` : `Top ${topN}+Bot ${bottomN}`}
              </button>

              <button
                onClick={() => setRefreshKey((k) => k + 1)}
                className={`text-xs px-2.5 py-1.5 rounded-md border transition flex items-center gap-1 ${
                  isDark ? "border-slate-700 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-100"
                }`}
                title="Refresh data"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                className={`text-xs px-2.5 py-1.5 rounded-md border transition flex items-center gap-1 ${
                  isDark ? "border-slate-700 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-100"
                }`}
                title={isDark ? "Switch to light" : "Switch to dark"}
              >
                {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </header>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

          {/* ─────────── RANKING TABLE (expandable) ─────────── */}
          <aside className={`xl:col-span-4 p-5 border ${cardBg} ${cardBorder} h-fit`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                <Flame className="text-amber-500 w-4 h-4" />
                Sector Rankings
              </h3>
              <div className="flex items-center gap-2">
                {expandedSectors.size > 0 && (
                  <button
                    onClick={() => setExpandedSectors(new Set())}
                    className={`text-[10px] px-2 py-0.5 rounded border transition ${
                      isDark
                        ? "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                        : "border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700"
                    }`}
                    title="Collapse all expanded sectors"
                  >
                    Collapse all
                  </button>
                )}
                <span className={`text-[10px] font-mono ${subText}`}>{allSorted.length} sectors</span>
              </div>
            </div>

            <p className={`text-[10px] mb-3 ${subText} italic`}>
              Click any sector to see its stocks over {periodLabel.toLowerCase()}.
            </p>

            <div className="space-y-1.5 max-h-[920px] overflow-y-auto pr-1 -mr-1 custom-scroll">
              {allSorted.map((sector, idx) => {
                const score = data.finalScores[sector];
                const action = classifyAction(score);
                const color = colorMap[sector];
                const isLeader = idx < topN;
                const isLaggard = idx >= allSorted.length - bottomN;
                const isExpanded = expandedSectors.has(sector);

                return (
                  <div
                    key={sector}
                    className={`rounded-lg border overflow-hidden transition ${
                      isDark
                        ? `bg-slate-950/50 ${isExpanded ? "border-cyan-500/40" : "border-slate-800/60 hover:border-slate-700"}`
                        : `bg-slate-50 ${isExpanded ? "border-cyan-500/60" : "border-slate-200 hover:border-slate-300"}`
                    }`}
                  >
                    {/* Clickable row */}
                    <button
                      onClick={() => toggleSector(sector)}
                      className={`w-full flex items-center gap-2 p-2.5 text-left transition ${
                        isDark ? "hover:bg-slate-900/40" : "hover:bg-white"
                      }`}
                      aria-expanded={isExpanded}
                    >
                      {/* Chevron */}
                      <div className={`flex items-center justify-center w-4 ${subText}`}>
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </div>

                      {/* Rank */}
                      <div className={`flex items-center justify-center w-7 h-7 rounded-md text-[11px] font-mono font-bold flex-shrink-0 ${
                        isLeader ? "bg-emerald-500/20 text-emerald-400" :
                        isLaggard ? "bg-rose-500/20 text-rose-400" :
                        isDark ? "bg-slate-800 text-slate-500" : "bg-slate-200 text-slate-500"
                      }`}>
                        {idx + 1}
                      </div>

                      {/* Color swatch + name */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-1 h-7 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></div>
                        <span className="text-sm font-semibold truncate">{sector}</span>
                      </div>

                      {/* Score */}
                      <div className="font-mono text-sm font-bold tabular-nums flex-shrink-0">
                        {score.toFixed(1)}
                      </div>

                      {/* Action badge */}
                      <div className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${toneMap[action.tone]}`}>
                        {action.label}
                      </div>
                    </button>

                    {/* Expanded panel */}
                    {isExpanded && (
                      <div className={`border-t ${isDark ? "border-slate-800" : "border-slate-200"}`}>
                        <SectorDetail
                          sector={sector}
                          period={period}
                          isDark={isDark}
                          subText={subText}
                          periodLabel={periodLabel}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>

          {/* ─────────── CHART ─────────── */}
          <main className={`xl:col-span-8 p-5 border ${cardBg} ${cardBorder}`}>
            <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2 mb-0" style={{marginBottom: 0}}>
                  <Activity className="w-5 h-5 text-cyan-500" />
                  Relative Strength vs Nifty (Base = 100)
                </h2>
                <p className={`text-xs mt-1 ${subText}`}  style={{marginBottom: 0}}>
                  Values &gt; 100 = outperforming Nifty • Showing {displayedSectors.length} of {allSorted.length} sectors
                </p>
                {(period === "1wk" || period === "15d") && (
                  <p className="text-[11px] mt-2 px-2 py-1 rounded bg-amber-500/10 text-amber-400 inline-flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" />
                    Short window: values cluster near 100 — use for very-short-term reads only.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className={subText}>Leaders &gt;110</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                  <span className={subText}>Neutral 90–110</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                  <span className={subText}>Laggards &lt;90</span>
                </div>
              </div>
            </div>

            <div className="h-[720px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 12, right: 110, left: -10, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <ReferenceArea y1={110} y2={yDomain[1]} fill="#10b981" fillOpacity={isDark ? 0.04 : 0.08} />
                  <ReferenceArea y1={yDomain[0]} y2={90} fill="#f43f5e" fillOpacity={isDark ? 0.04 : 0.08} />
                  <XAxis dataKey="date" stroke={axisStroke} fontSize={10} tickLine={false} tickFormatter={formatDateShort} minTickGap={40} />
                  <YAxis stroke={axisStroke} fontSize={10} tickLine={false} domain={yDomain} width={45} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.95)",
                      border: `1px solid ${isDark ? "#334155" : "#cbd5e1"}`,
                      borderRadius: "10px",
                      fontSize: "11px",
                      backdropFilter: "blur(8px)",
                    }}
                    labelStyle={{ color: isDark ? "#cbd5e1" : "#475569", fontWeight: 600 }}
                    itemSorter={(item) => -item.value}
                    formatter={(v) => v?.toFixed(1)}
                    labelFormatter={(l) => new Date(l).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  />
                  <ReferenceLine
                    y={100} stroke={benchmarkStroke} strokeDasharray="6 4" strokeWidth={1.5}
                    label={{ value: "NIFTY (BASE 100)", fill: axisStroke, fontSize: 10, fontWeight: 700, position: "insideTopLeft" }}
                  />
                  {displayedSectors.map((sector) => {
                    const val = data.finalScores[sector];
                    const strokeWidth = (val >= 115 || val <= 88) ? 2.8 :
                                        (val >= 105 || val <= 95) ? 2 : 1.4;
                    return (
                      <Line
                        key={sector} type="monotone" dataKey={sector}
                        stroke={colorMap[sector]} strokeWidth={strokeWidth}
                        dot={false} activeDot={{ r: 4, strokeWidth: 0 }} connectNulls
                      >
                        <LabelList
                          dataKey={sector}
                          position="right"
                          content={(props) => {
                            const { x, y, value, index } = props;
                            if (index !== chartData.length - 1) return null;
                            if (value == null || x == null || y == null) return null;
                            return (
                              <g>
                                <circle
                                  cx={x} cy={y} r={3}
                                  fill={colorMap[sector]}
                                  stroke={isDark ? "#0f172a" : "#fff"}
                                  strokeWidth={1.5}
                                />
                                <text
                                  x={x + 8} y={y}
                                  fill={colorMap[sector]}
                                  fontSize={11} fontWeight={700}
                                  dominantBaseline="middle"
                                  textAnchor="start"
                                  style={{ pointerEvents: "none" }}
                                >
                                  {sector} {value.toFixed(1)}
                                </text>
                              </g>
                            );
                          }}
                        />
                      </Line>
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {displayedSectors.map((sector) => {
                const val = data.finalScores[sector];
                return (
                  <div
                    key={sector}
                    className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-[11px] border ${
                      isDark ? "border-slate-800 bg-slate-950/50" : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: colorMap[sector] }}></div>
                    <span className="font-medium">{sector}</span>
                    <span className={`font-mono tabular-nums ${subText}`}>{val.toFixed(1)}</span>
                  </div>
                );
              })}
            </div>
          </main>
        </div>

        {/* ════════════════════════════════════════════════
            WHALE TRACKER — LAZY LOADED
        ════════════════════════════════════════════════ */}
        <section className={`mt-6 p-5 border ${cardBg} ${cardBorder}`}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Waves className="text-purple-500 w-5 h-5" />
                Whale Tracker
                <span className={`text-xs font-normal ${subText}`}>
                  — Scans top 5 sectors for institutional volume
                </span>
              </h3>
              <p className={`text-xs mt-1 ${subText}`}>
                Vol Ratio = today's volume vs 10-day average. &gt;2.5x = whale entry.
              </p>
            </div>

            {!whales && !whalesLoading && (
              <button
                onClick={loadWhales}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold transition flex items-center gap-2 shadow-lg shadow-purple-500/30"
              >
                <Waves className="w-4 h-4" />
                Load Whale Tracker Beta
              </button>
            )}
            {whales && (
              <button
                onClick={loadWhales}
                className={`px-3 py-1.5 text-xs rounded-lg border transition flex items-center gap-1.5 ${
                  isDark ? "border-slate-700 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-100"
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh whales
              </button>
            )}
          </div>

          {!whales && !whalesLoading && !whalesError && (
            <div className={`p-8 rounded-xl border-2 border-dashed text-center ${
              isDark ? "border-slate-800 bg-slate-950/30" : "border-slate-200 bg-slate-50"
            }`}>
              <Waves className={`w-12 h-12 mx-auto mb-3 ${subText} opacity-50`} />
              <p className={`text-sm ${subText}`}>
                Click <strong>Load Whale Tracker</strong> to scan ~50 stocks across the top 5 sectors.
              </p>
              <p className={`text-[11px] ${subText} mt-1 opacity-70`}>
                Takes ~10–15 seconds. Cached for 8 minutes after first run.
              </p>
            </div>
          )}

          {whalesLoading && (
            <div className={`p-8 rounded-xl text-center ${isDark ? "bg-slate-950/30" : "bg-slate-50"}`}>
              <Loader2 className="w-8 h-8 mx-auto mb-3 text-purple-400 animate-spin" />
              <p className={`text-sm ${subText}`}>Scanning institutional volume across ~50 stocks...</p>
            </div>
          )}

          {whalesError && (
            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10">
              <div className="flex items-center gap-2 text-rose-400 text-sm">
                <AlertTriangle className="w-4 h-4" /> {whalesError}
              </div>
              <button
                onClick={loadWhales}
                className="mt-3 px-3 py-1.5 text-xs rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300"
              >
                Retry
              </button>
            </div>
          )}

          {whales && (
            <>
              {whales.topWhaleSignals?.length > 0 && (
                <div className={`mb-6 p-4 rounded-xl border ${
                  isDark ? "border-purple-500/30 bg-purple-500/5" : "border-purple-300 bg-purple-50"
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Flame className="w-4 h-4 text-purple-400" />
                    <h4 className="text-sm font-bold uppercase tracking-wider text-purple-400">
                      🔥 Strongest Signals
                    </h4>
                    {whales.fromCache && (
                      <span className="text-[10px] font-bold text-emerald-400 ml-1">CACHED</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
                    {whales.topWhaleSignals.map((sig) => (
                      <div
                        key={sig.ticker}
                        className={`p-3 rounded-lg border ${
                          isDark ? "bg-slate-950/60 border-slate-800" : "bg-white border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm truncate">{sig.ticker.replace(".NS", "")}</span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                            isDark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-600"
                          }`}>
                            {sig.sector}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between mt-2">
                          <span className="text-xs font-mono">₹{sig.price?.toFixed(2)}</span>
                          <span className={`text-xs font-bold font-mono ${sig.priceChg5d >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {sig.priceChg5d >= 0 ? "+" : ""}{sig.priceChg5d?.toFixed(1)}%
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className={`text-[11px] font-bold font-mono ${
                            sig.vRatio > 2.5 ? "text-purple-400" :
                            sig.vRatio > 1.8 ? "text-cyan-400" : "text-slate-400"
                          }`}>
                            {sig.vRatio.toFixed(1)}x
                          </span>
                          <span className={`text-[10px] font-bold ${
                            sig.score >= 5 ? "text-purple-400" :
                            sig.score >= 4 ? "text-cyan-400" : "text-slate-400"
                          }`}>
                            {sig.signal}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Object.entries(whales.whalePerSector || {}).map(([sector, stocks]) => {
                  const rsVal = data.finalScores[sector];
                  return (
                    <div
                      key={sector}
                      className={`p-4 rounded-xl border ${
                        isDark ? "bg-slate-950/50 border-slate-800" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/40">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: colorMap[sector] }}></div>
                          <h5 className="font-bold text-sm">
                            #{allSorted.indexOf(sector) + 1} {sector}
                          </h5>
                        </div>
                        <span className={`text-xs font-mono ${subText}`}>RS {rsVal?.toFixed(1)}</span>
                      </div>
                      <div className="space-y-1 max-h-[260px] overflow-y-auto custom-scroll pr-1">
                        {stocks.map((stock) => (
                          <div
                            key={stock.ticker}
                            className={`grid grid-cols-12 gap-1 items-center text-[11px] py-1 px-1.5 rounded ${
                              stock.score >= 4 ? (isDark ? "bg-purple-500/5" : "bg-purple-50") : ""
                            }`}
                          >
                            <span className="col-span-4 font-mono truncate font-medium">{stock.ticker.replace(".NS", "")}</span>
                            <span className="col-span-2 font-mono text-right tabular-nums">₹{stock.price?.toFixed(0)}</span>
                            <span className={`col-span-2 font-mono text-right tabular-nums ${stock.priceChg5d >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {stock.priceChg5d >= 0 ? "+" : ""}{stock.priceChg5d?.toFixed(1)}
                            </span>
                            <span className={`col-span-2 font-mono text-right tabular-nums font-bold ${
                              stock.vRatio > 2.5 ? "text-purple-400" :
                              stock.vRatio > 1.8 ? "text-cyan-400" :
                              stock.vRatio > 1.2 ? "text-emerald-400" : subText
                            }`}>
                              {stock.vRatio.toFixed(1)}x
                            </span>
                            <span className="col-span-2 text-right text-[10px]">{stock.signal.split(" ")[0]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>

      <SiteFooter />
      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: ${isDark ? "rgba(100,116,139,0.3)" : "rgba(148,163,184,0.4)"};
          border-radius: 3px;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: ${isDark ? "rgba(100,116,139,0.5)" : "rgba(148,163,184,0.6)"};
        }
      `}</style>
    </div>
  );
}