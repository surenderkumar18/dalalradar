// ════════════════════════════════════════════════════════════
//  PINNED TOOLTIP — click/tap to pin, retains hover for desktop
//
//  Appears on bubble CLICK/TAP (touch + mouse). Stays put,
//  dismissable (× / tap-outside / ESC), fully selectable text.
//
//  Desktop: floating card positioned near the bubble, measured
//           against the real panel size so it NEVER clips the
//           viewport (flips side / clamps vertically as needed).
//  Mobile (<768px): bottom sheet.
// ════════════════════════════════════════════════════════════

"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import CustomTooltip from "./CustomTooltip.js";

const VIEWPORT_PAD = 12; // min gap from any viewport edge
const BUBBLE_GAP = 16; // gap between bubble and panel

export default function PinnedTooltip({
  payload,
  anchor, // { x, y } screen coords of the tapped bubble center
  bounds, // { left, top, right, bottom } chart area in screen coords (optional)
  latestDate,
  mode,
  bubbleRefs,
  hoveredKeyRef,
  onClose,
}) {
  const panelRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  // Desktop computed position. Start hidden until measured so the user
  // never sees a flash at the wrong spot.
  const [pos, setPos] = useState(null); // { left, top } | null

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ESC to close
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Tap/click outside to close (ignore taps on bubbles — upstream re-pins)
  useEffect(() => {
    function onDown(e) {
      if (!panelRef.current) return;
      if (panelRef.current.contains(e.target)) return;
      const onBubble = e.target?.getAttribute?.("data-target") != null;
      if (!onBubble) onClose?.();
    }
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [onClose]);

  // ── DESKTOP: measure the panel, then position it inside the viewport ──
  useLayoutEffect(() => {
    if (isMobile) return;
    const el = panelRef.current;
    if (!el || !anchor) return;

    function place() {
      const rect = el.getBoundingClientRect();
      const pw = rect.width || 280;
      const ph = rect.height || 300;

      // Clamp region = the chart area if bounds provided, else the viewport.
      // The tooltip must never extend beyond this region on any edge.
      const region = bounds || {
        left: 0,
        top: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
      };
      const regionW = region.right - region.left;
      const regionH = region.bottom - region.top;

      // Horizontal: prefer right of bubble, else left, else clamp center —
      // all measured against the chart region, not the window.
      let left;
      const spaceRight = region.right - anchor.x - BUBBLE_GAP;
      const spaceLeft = anchor.x - region.left - BUBBLE_GAP;

      if (spaceRight >= pw + VIEWPORT_PAD) {
        left = anchor.x + BUBBLE_GAP;
      } else if (spaceLeft >= pw + VIEWPORT_PAD) {
        left = anchor.x - BUBBLE_GAP - pw;
      } else {
        left = anchor.x - pw / 2;
      }
      // Clamp inside the region (with pad), but if the panel is wider than
      // the region just pin to the region's left edge.
      const minLeft = region.left + VIEWPORT_PAD;
      const maxLeft = region.right - pw - VIEWPORT_PAD;
      left = maxLeft >= minLeft
        ? Math.max(minLeft, Math.min(left, maxLeft))
        : minLeft;

      // Vertical: center on bubble, clamp inside the region. If taller than
      // the region, pin to the region top and scroll internally.
      let top;
      const usableH = regionH - VIEWPORT_PAD * 2;
      if (ph >= usableH) {
        top = region.top + VIEWPORT_PAD;
      } else {
        top = anchor.y - ph / 2;
        const minTop = region.top + VIEWPORT_PAD;
        const maxTop = region.bottom - ph - VIEWPORT_PAD;
        top = Math.max(minTop, Math.min(top, maxTop));
      }

      setPos({ left, top, maxH: Math.max(120, regionH - VIEWPORT_PAD * 2) });
    }

    // Measure now, on next frame, and AGAIN after content settles.
    // The tooltip content (date, OI chart) can reflow after first paint,
    // changing the panel height — a single measure would clamp against a
    // stale (too-small) height and let the panel clip the viewport top.
    place();
    const raf1 = requestAnimationFrame(place);
    const raf2 = requestAnimationFrame(() =>
      requestAnimationFrame(place),
    );

    // ResizeObserver re-runs place() whenever the panel's real size
    // changes (image/chart load, text wrap, font swap, etc).
    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => place());
      ro.observe(el);
    }

    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      if (ro) ro.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [isMobile, anchor?.x, anchor?.y, bounds, payload]);

  if (!payload) return null;

  const tooltipProps = {
    payload: [{ payload }],
    latestDate,
    mode,
    bubbleRefs,
    hoveredKeyRef,
  };

  // ── MOBILE: bottom sheet ──
  if (isMobile) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 12000,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          background: "rgba(2,6,23,0.55)",
          pointerEvents: "auto",
          animation: "pin-fade 0.15s ease",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        <PinStyles />
        <div
          ref={panelRef}
          style={{
            maxHeight: "80vh",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            background: "#0b0b0c",
            borderTop: "1px solid rgba(0,255,162,0.3)",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
            padding: "8px 8px 24px",
            userSelect: "text",
            WebkitUserSelect: "text",
            animation: "pin-slideup 0.22s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <div
            style={{
              position: "sticky",
              top: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px 8px 10px",
              background: "#0b0b0c",
              zIndex: 2,
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: "rgba(148,163,184,0.4)",
              }}
            />
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                position: "absolute",
                right: 8,
                top: 0,
                background: "rgba(148,163,184,0.15)",
                border: 0,
                borderRadius: 999,
                width: 30,
                height: 30,
                color: "#e2e8f0",
                fontSize: 17,
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
          <div style={{ userSelect: "text", WebkitUserSelect: "text" }}>
            <CustomTooltip {...tooltipProps} />
          </div>
        </div>
      </div>
    );
  }

  // ── DESKTOP: floating card, hidden until measured & positioned ──
  return (
    <>
      <PinStyles />
      <div
        ref={panelRef}
        style={{
          position: "fixed",
          left: pos?.left ?? -9999,
          top: pos?.top ?? -9999,
          zIndex: 12000,
          width: "max-content",
          maxWidth: `min(420px, ${
            bounds
              ? `${bounds.right - bounds.left - VIEWPORT_PAD * 2}px`
              : `calc(100vw - ${VIEWPORT_PAD * 2}px)`
          })`,
          maxHeight: pos?.maxH
            ? `${pos.maxH}px`
            : `calc(100vh - ${VIEWPORT_PAD * 2}px)`,
          overflowY: "auto",
          userSelect: "text",
          WebkitUserSelect: "text",
          pointerEvents: "auto",
          visibility: pos ? "visible" : "hidden",
          animation: pos ? "pin-fade 0.15s ease" : "none",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            right: 6,
            top: 6,
            zIndex: 12001,
            background: "rgba(148,163,184,0.18)",
            border: 0,
            borderRadius: 999,
            width: 24,
            height: 24,
            color: "#e2e8f0",
            fontSize: 14,
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          ×
        </button>
        <CustomTooltip {...tooltipProps} />
      </div>
    </>
  );
}

function PinStyles() {
  return (
    <style>{`
      @keyframes pin-fade {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes pin-slideup {
        from { transform: translateY(100%); }
        to   { transform: translateY(0); }
      }
    `}</style>
  );
}