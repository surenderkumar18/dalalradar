"use client";

// app/components/Search.js
//
// 🔧 SEARCH FIXES (this revision):
//
//   1. Input lag (1-2s while typing) — FIXED via local input state.
//      Originally the input was controlled by `searchQuery` from page.js.
//      Every keystroke fired the parent's setSearchQuery, forcing the
//      entire Header subtree (DashboardHeader, two CustomDropdowns,
//      PremiumFeature wrappers, BubbleSizeControl, etc.) to re-render
//      before React could paint the typed character. The parent's
//      `useDeferredValue` freeze didn't help because the lag was in the
//      Header, not in TimelineBubble.
//      Now the input is driven by a LOCAL `query` state. Parent's
//      searchQuery is only updated when the user actually PICKS a result
//      (commitPick). The parent's freeze mechanism is left intact for
//      backward compat — it just rarely activates now, which is correct.
//
//   2. Mouse-hover effect not visible — FIXED via state-based highlight.
//      Originally hover was applied imperatively
//        (e.currentTarget.style.background = "#0f172a")
//      AND the same property was set via the React `style` prop
//        (background: i === activeIndex ? "#0f172a" : "transparent")
//      Every parent re-render re-applied the style prop and clobbered
//      the imperative hover color. Now there is ONE source of truth:
//      `activeIndex`. Both keyboard arrows AND mouse-hover update it,
//      and the dropdown styles off it.
//
//   3. Dropdown didn't close when clicking outside — FIXED via a
//      document mousedown listener that clears focus.
//
//   4. Escape key didn't close the dropdown — FIXED.
//
//   5. Click-pick changed from onClick → onMouseDown so the pick fires
//      BEFORE the input's blur event, preventing a "blur closes dropdown
//      before click registers" race.

import { useMemo, useState, useEffect, useRef } from "react";

export default function StockSearch({
  searchQuery,        // parent-controlled — used for external clears only
  setSearchQuery,     // parent setter — called on commit
  setSectorFilter,    // legacy compat
  setSearchSymbol,    // legacy compat
  allSymbols = [],
  setActiveSymbol,    // legacy compat
  onSearch,
}) {
  // 🔧 Local input state. Decouples typing from parent re-renders.
  const [query, setQuery] = useState(searchQuery || "");

  // Mirror parent CLEARS (e.g. handleSearch in page.js calls
  // setSearchQuery("") after a pick) into local state. We deliberately
  // only sync the "" case so we don't echo our own writes back into a
  // loop.
  useEffect(() => {
    if (searchQuery === "" && query !== "") {
      setQuery("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // 🔧 Single source of truth for "which row is highlighted".
  // Updated by both keyboard arrows AND mouse hover. No more split
  // between activeIndex (keyboard) and an imperative hover style.
  const [activeIndex, setActiveIndex] = useState(-1);

  const wrapperRef = useRef(null);

  /* 🔍 FILTER RESULTS — uses local query, not the prop */
  const results = useMemo(() => {
    if (!query) return [];
    const q = query.toUpperCase();
    return allSymbols
      .filter((s) => s?.symbol?.startsWith(q)) // prefix match (can switch to includes)
      .slice(0, 8);
  }, [query, allSymbols]);

  // Reset highlight whenever the query changes.
  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  // 🔧 Close the dropdown when the user clicks anywhere outside the
  // search wrapper. mousedown fires BEFORE click, so the result row's
  // onMouseDown handler still gets a chance to commit before we close.
  useEffect(() => {
    function onDocMouseDown(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  // Picks a result: notifies parent, clears input, closes dropdown.
  const commitPick = (r) => {
    onSearch?.(r.symbol, r.sector);

    // 🔁 Legacy fallback callbacks for other pages that may still
    // pass these in.
    setSectorFilter?.(r.sector);
    setSearchSymbol?.(r.symbol);
    setActiveSymbol?.(r.symbol);

    setQuery("");
    setSearchQuery?.("");
    setActiveIndex(-1);
    setIsFocused(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setIsFocused(false);
      return;
    }
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
        commitPick(results[activeIndex]);
      }
    }
  };

  // 🎨 Border color: focused (mint) > hovered (light) > default
  const borderColor = isFocused
    ? "#00ffa2"
    : isHovered
      ? "#475569"
      : "#334155";

  // Only show dropdown when input is focused AND there are matches.
  const showDropdown = isFocused && results.length > 0;

  return (
    <div ref={wrapperRef} style={{ position: "relative", marginLeft: 14 }}>
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
          border: `1px solid ${borderColor}`,
          boxShadow: isFocused
            ? "0 0 0 2px rgba(0, 255, 162, 0.15)"
            : "0 1px 2px rgba(0,0,0,.3)",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
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
            transition: "stroke 0.2s ease",
          }}
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="16.65" y1="16.65" x2="21" y2="21" />
        </svg>

        {/* INPUT — driven by LOCAL state for instant updates */}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
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
      {showDropdown && (
        <div
          style={{
            position: "absolute",
            top: 39,
            left: 0,
            background: "#020617",
            borderBottom: "1px solid #334155",
            borderLeft: "1px solid #334155",
            borderRight: "1px solid #334155",
            borderTop: "0",
            borderRadius: "0 0 4px 4px",
            width: 380,
            maxWidth: "calc(100vw - 32px)",
            zIndex: 50,
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          }}
        >
          {results.map((r, i) => {
            const highlighted = i === activeIndex;
            return (
              <div
                key={r.symbol}
                // 🔧 onMouseDown (not onClick): fires BEFORE the input's
                // blur, so the pick commits even though the document-level
                // mousedown handler is trying to close the dropdown.
                // preventDefault keeps focus on the input across the click.
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  commitPick(r);
                }}
                // Mouse hover updates the same `activeIndex` used by
                // keyboard nav. ONE source of truth, no styling fight.
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() =>
                  setActiveIndex((prev) => (prev === i ? -1 : prev))
                }
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  fontSize: 14,
                  borderBottom: "1px solid #111",
                  background: highlighted ? "#0f172a" : "transparent",
                  transition: "background 0.12s ease",
                }}
              >
                <b>{r.symbol}</b>
                <span style={{ color: "#9ca3af", marginLeft: 6 }}>
                  ({r.sector})
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}