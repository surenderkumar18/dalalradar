// ═══════════════════════════════════════════════════════════════════
//  PINNED TOOLTIP — click/tap to pin, retains hover for desktop
//
//  Appears on bubble CLICK/TAP (touch + mouse). Stays put,
//  dismissable (× / tap-outside / ESC), fully selectable text.
//
//  🆕 DRAGGABLE: on desktop, grab the top handle bar and drag the
//     panel anywhere INSIDE the chart bounds. Position is clamped to
//     the chart rect so it never leaves the chart area.
//
//  Desktop: floating card auto-positioned near the bubble (measured,
//           never clips), then user-draggable within chart bounds.
//  Mobile (<768px): bottom sheet (not draggable — sheet pattern).
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import CustomTooltip from "./CustomTooltip.js";

const VIEWPORT_PAD = 12; // min gap from any edge
const BUBBLE_GAP = 16; // gap between bubble and panel

export default function PinnedTooltip({
  payload,
  anchor, // { x, y } screen coords of the tapped bubble center
  bounds, // { left, top, right, bottom } chart rect — clamp target
  latestDate,
  mode,
  bubbleRefs,
  hoveredKeyRef,
  onClose,
}) {
  const panelRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  // Desktop computed position. Start hidden until measured.
  const [pos, setPos] = useState(null); // { left, top } | null

  // 🆕 Has the user manually dragged? Once true, we stop auto-positioning
  // so re-measures (resize/scroll) don't snap the panel back.
  const draggedRef = useRef(false);

  // 🆕 Drag state kept in a ref (no re-render per mouse move)
  const dragRef = useRef({
    active: false,
    startX: 0, // pointer x at drag start
    startY: 0, // pointer y at drag start
    baseLeft: 0, // panel left at drag start
    baseTop: 0, // panel top at drag start
  });

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

  // Tap/click outside to close (ignore taps on bubbles — upstream re-pins).
  // Skip while dragging so a drag that ends outside doesn't close it.
  useEffect(() => {
    function onDown(e) {
      if (dragRef.current.active) return;
      if (!panelRef.current) return;
      if (panelRef.current.contains(e.target)) return;
      const onBubble = e.target?.getAttribute?.("data-target") != null;
      if (!onBubble) onClose?.();
    }
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [onClose]);

  // Reset drag flag whenever a NEW bubble is pinned (anchor/payload change)
  useEffect(() => {
    draggedRef.current = false;
  }, [anchor?.x, anchor?.y, payload]);

  // ── Clamp a desired left/top to the chart bounds (fallback: viewport) ──
  function clampToBounds(left, top, pw, ph) {
    const minLeft = bounds ? bounds.left + VIEWPORT_PAD : VIEWPORT_PAD;
    const maxLeft = bounds
      ? bounds.right - pw - VIEWPORT_PAD
      : window.innerWidth - pw - VIEWPORT_PAD;
    const minTop = bounds ? bounds.top + VIEWPORT_PAD : VIEWPORT_PAD;
    const maxTop = bounds
      ? bounds.bottom - ph - VIEWPORT_PAD
      : window.innerHeight - ph - VIEWPORT_PAD;

    // If the panel is taller than the region, pin to top edge (it scrolls).
    const clampedTop =
      maxTop < minTop ? minTop : Math.max(minTop, Math.min(top, maxTop));
    const clampedLeft =
      maxLeft < minLeft ? minLeft : Math.max(minLeft, Math.min(left, maxLeft));

    return { left: clampedLeft, top: clampedTop };
  }

  // ── DESKTOP: measure + auto-position (skipped once user drags) ──
  useLayoutEffect(() => {
    if (isMobile) return;
    const el = panelRef.current;
    if (!el || !anchor) return;

    function place() {
      if (draggedRef.current) return; // user took over — don't snap back
      const rect = el.getBoundingClientRect();
      const pw = rect.width || 280;
      const ph = rect.height || 300;

      // region edges (chart bounds if provided, else viewport)
      const regLeft = bounds ? bounds.left : 0;
      const regRight = bounds ? bounds.right : window.innerWidth;

      // Horizontal: prefer right of bubble, else left, else clamp center
      let left;
      const spaceRight = regRight - anchor.x - BUBBLE_GAP;
      const spaceLeft = anchor.x - regLeft - BUBBLE_GAP;

      if (spaceRight >= pw + VIEWPORT_PAD) {
        left = anchor.x + BUBBLE_GAP;
      } else if (spaceLeft >= pw + VIEWPORT_PAD) {
        left = anchor.x - BUBBLE_GAP - pw;
      } else {
        left = anchor.x - pw / 2;
      }

      // Vertical: center on bubble
      let top = anchor.y - ph / 2;

      const c = clampToBounds(left, top, pw, ph);
      setPos(c);
    }

    const raf = requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [isMobile, anchor?.x, anchor?.y, payload, bounds]);

  // ── 🆕 DRAG handlers (desktop) ──
  const onDragPointerDown = (e) => {
    // only left mouse / primary pointer; ignore the close button
    if (e.button != null && e.button !== 0) return;
    const el = panelRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      baseLeft: rect.left,
      baseTop: rect.top,
    };
    draggedRef.current = true;

    // capture so we keep getting move events even off the handle
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}

    window.addEventListener("pointermove", onDragPointerMove);
    window.addEventListener("pointerup", onDragPointerUp);
    e.preventDefault();
  };

  const onDragPointerMove = (e) => {
    const d = dragRef.current;
    if (!d.active) return;
    const el = panelRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const pw = rect.width;
    const ph = rect.height;

    const nextLeft = d.baseLeft + (e.clientX - d.startX);
    const nextTop = d.baseTop + (e.clientY - d.startY);

    const c = clampToBounds(nextLeft, nextTop, pw, ph);
    setPos(c);
  };

  const onDragPointerUp = () => {
    dragRef.current.active = false;
    window.removeEventListener("pointermove", onDragPointerMove);
    window.removeEventListener("pointerup", onDragPointerUp);
  };

  // cleanup any stray listeners on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", onDragPointerMove);
      window.removeEventListener("pointerup", onDragPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!payload) return null;

  const tooltipProps = {
    payload: [{ payload }],
    latestDate,
    mode,
    bubbleRefs,
    hoveredKeyRef,
  };

  // ── MOBILE: bottom sheet (unchanged — not draggable) ──
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

  // ── DESKTOP: draggable floating card, hidden until measured ──
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
          maxHeight: bounds
            ? `${Math.max(120, bounds.bottom - bounds.top - VIEWPORT_PAD * 2)}px`
            : `calc(100vh - ${VIEWPORT_PAD * 2}px)`,
          overflowY: "auto",
          userSelect: "text",
          WebkitUserSelect: "text",
          pointerEvents: "auto",
          visibility: pos ? "visible" : "hidden",
          animation: pos ? "pin-fade 0.15s ease" : "none",
          // a hairline mint frame so the draggable panel reads as a "pinned card"
          borderRadius: 8,
          boxShadow: "0 0 0 1px rgba(0,255,162,0.18), 0 10px 40px rgba(0,0,0,0.55)",
        }}
      >
        {/* 🆕 DRAG HANDLE BAR — grab here to move the panel */}
        <div
          onPointerDown={onDragPointerDown}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "6px 8px 6px 10px",
            cursor: "grab",
            background: "linear-gradient(180deg, rgba(0,255,162,0.10), rgba(0,255,162,0.02))",
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            borderBottom: "1px solid rgba(0,255,162,0.15)",
            userSelect: "none",
            WebkitUserSelect: "none",
            touchAction: "none", // let pointer drag work without scroll interference
          }}
        >
          {/* grip dots + label */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span aria-hidden style={{ display: "flex", gap: 3 }}>
              <Dot /><Dot /><Dot />
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 0.4,
                color: "rgba(0,255,162,0.85)",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              DRAG
            </span>
          </div>

          {/* close button — stopPropagation so it doesn't start a drag */}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "rgba(148,163,184,0.18)",
              border: 0,
              borderRadius: 999,
              width: 22,
              height: 22,
              color: "#e2e8f0",
              fontSize: 13,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <CustomTooltip {...tooltipProps} />
      </div>
    </>
  );
}

function Dot() {
  return (
    <span
      style={{
        width: 4,
        height: 4,
        borderRadius: 999,
        background: "rgba(0,255,162,0.7)",
        display: "inline-block",
      }}
    />
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