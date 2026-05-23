"use client";
import { useMemo, useState, useEffect } from "react";

export default function StockSearch({
  searchQuery,
  setSearchQuery,
  setSectorFilter,
  setSearchSymbol,
  allSymbols = [],
  setActiveSymbol,
  onSearch,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  /* 🔍 FILTER RESULTS */
  const results = useMemo(() => {
    if (!searchQuery) return [];

    const q = searchQuery.toUpperCase();

    return allSymbols
      .filter((s) => s?.symbol?.startsWith(q)) // ⚡ faster than includes
      .slice(0, 8);
  }, [searchQuery, allSymbols]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [searchQuery]);

  const handleKeyDown = (e) => {
    if (!results.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) {
        const r = results[activeIndex];

        // 🔥 SAME AS CLICK
        onSearch?.(r.symbol, r.sector);
        setSectorFilter?.(r.sector);
        setSearchSymbol?.(r.symbol);
        setActiveSymbol?.(r.symbol);

        setSearchQuery("");
        setActiveIndex(-1);
      }
    }
  };

  return (
    <div style={{ position: "relative", marginLeft: 14 }}>
      {/* INPUT WRAPPER */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: "flex",
          alignItems: "center",
          background: "#020617",
          borderRadius: 4,
          padding: "6px 12px",
          width: "100%",
          transition: "all .2s ease",
          border: `1px solid ${
            isFocused
              ? "#475569" // purple when typing
              : isHovered
                ? "#475569" // lighter border on hover
                : "#334155"
          }`,
          boxShadow:
            isFocused || isHovered
              ? "#475569"
              : isHovered
                ? "0 2px 2px rgba(0,0,0,.45)"
                : "0 1px 2px rgba(0,0,0,.3)",
          transform: isHovered ? "translateY(-1px)" : "translateY(0)",
        }}
      >
        {/* ICON */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isFocused ? "#00ffa2" : "#ffffff"}
          strokeWidth="2"
          style={{
            marginRight: 8,
            transition: "all .2s ease",
          }}
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="16.65" y1="16.65" x2="21" y2="21" />
        </svg>

        {/* INPUT */}
        <input
          value={searchQuery}
          onChange={(e) => {
            const val = e.target.value;
            setSearchQuery(val); // instant
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Search stock..."
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#fff",
            fontSize: 14,
            width: "100%",
            fontWeight: 500,
          }}
        />
      </div>

      {/* DROPDOWN */}
      {results.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 39,
            left: 0,
            background: "#020617",
            borderBottom: "1px solid #334155",
            borderLeft: "1px solid #334155",
            borderRight: "1px solid #334155",
            borderTop: "0px solid #334155",
            borderRadius: "0px 0px 4px 4px",
            width: 380,
            zIndex: 50,
            transform: isHovered ? "translateY(-1px)" : "translateY(0)",
          }}
        >
          {results.map((r, i) => (
            <div
              key={r.symbol}
              onClick={() => {
                // 🔥 NEW SYSTEM (preferred)
                if (onSearch) {
                  onSearch(r.symbol, r.sector);
                }

                // 🔁 OLD SYSTEM (fallback for other pages)
                setSectorFilter?.(r.sector);
                setSearchSymbol?.(r.symbol);
                setActiveSymbol?.(r.symbol);

                setSearchQuery("");
              }}
              style={{
                padding: "10px 12px",
                cursor: "pointer",
                fontSize: 14,
                borderBottom: "1px solid #111",
                background: i === activeIndex ? "#0f172a" : "transparent",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#0f172a")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <b>{r.symbol}</b>
              <span style={{ color: "#9ca3af", marginLeft: 6 }}>
                ({r.sector})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
