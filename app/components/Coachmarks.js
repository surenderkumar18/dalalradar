// app/components/Coachmarks.js
// ════════════════════════════════════════════════════════════
//  COACHMARKS — Lightweight first-visit tour component
//  v1.1 — adds:
//    - Target retry loop (waits for DOM elements to appear before skipping)
//    - Mount-time diagnostic logging (look for [Coachmarks] in console)
// ════════════════════════════════════════════════════════════

"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
  forwardRef,
  useImperativeHandle,
} from "react";

// Set to true while developing; turns on console logs
const DEBUG = true;
function dlog(...args) {
  if (DEBUG) console.log("[Coachmarks]", ...args);
}

// SSR-safe localStorage helpers ────────────────────────────────────
function safeGet(key) {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key, val) {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(key, val);
  } catch {
    /* ignore quota / privacy mode */
  }
}

function findTarget(tourId) {
  if (typeof document === "undefined") return null;
  return document.querySelector(`[data-tour="${tourId}"]`);
}

// Wait for target to appear in DOM, up to maxMs. Returns element or null.
function waitForTarget(tourId, maxMs = 3000) {
  return new Promise((resolve) => {
    const start = Date.now();
    function tick() {
      const el = findTarget(tourId);
      if (el) return resolve(el);
      if (Date.now() - start > maxMs) return resolve(null);
      requestAnimationFrame(tick);
    }
    tick();
  });
}

function computePosition(targetRect, tipSize, preferredSide = "bottom") {
  const margin = 16;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  const sides = {
    bottom: {
      top: targetRect.bottom + margin,
      left: targetRect.left + targetRect.width / 2 - tipSize.width / 2,
      arrowSide: "top",
    },
    top: {
      top: targetRect.top - tipSize.height - margin,
      left: targetRect.left + targetRect.width / 2 - tipSize.width / 2,
      arrowSide: "bottom",
    },
    right: {
      top: targetRect.top + targetRect.height / 2 - tipSize.height / 2,
      left: targetRect.right + margin,
      arrowSide: "left",
    },
    left: {
      top: targetRect.top + targetRect.height / 2 - tipSize.height / 2,
      left: targetRect.left - tipSize.width - margin,
      arrowSide: "right",
    },
  };

  const order =
    preferredSide === "bottom"
      ? ["bottom", "top", "right", "left"]
      : preferredSide === "top"
      ? ["top", "bottom", "right", "left"]
      : preferredSide === "right"
      ? ["right", "left", "bottom", "top"]
      : ["left", "right", "bottom", "top"];

  for (const side of order) {
    const p = sides[side];
    const fits =
      p.top >= 8 &&
      p.left >= 8 &&
      p.top + tipSize.height <= viewportH - 8 &&
      p.left + tipSize.width <= viewportW - 8;
    if (fits) return p;
  }

  const fallback = sides.bottom;
  return {
    top: Math.max(8, Math.min(fallback.top, viewportH - tipSize.height - 8)),
    left: Math.max(8, Math.min(fallback.left, viewportW - tipSize.width - 8)),
    arrowSide: "top",
  };
}

function SpotlightOverlay({ targetRect, onDismiss }) {
  const padding = 8;
  const r = 6;
  const x = targetRect ? targetRect.left - padding : 0;
  const y = targetRect ? targetRect.top - padding : 0;
  const w = targetRect ? targetRect.width + padding * 2 : 0;
  const h = targetRect ? targetRect.height + padding * 2 : 0;

  return (
    <svg
      onClick={onDismiss}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "auto",
        cursor: "pointer",
        zIndex: 9998,
      }}
      aria-hidden="true"
    >
      <defs>
        <mask id="coachmark-mask">
          <rect width="100%" height="100%" fill="white" />
          {targetRect && (
            <rect x={x} y={y} width={w} height={h} rx={r} ry={r} fill="black" />
          )}
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="rgba(2,6,23,0.78)" mask="url(#coachmark-mask)" />
      {targetRect && (
        <rect
          x={x} y={y} width={w} height={h} rx={r} ry={r}
          fill="none" stroke="#00ffa2" strokeWidth="1.5"
          strokeDasharray="4 4" opacity="0.85"
          style={{ pointerEvents: "none", animation: "coachmark-dash 1.8s linear infinite" }}
        />
      )}
    </svg>
  );
}

const Coachmarks = forwardRef(function Coachmarks(
  { tourId, version = 1, steps, onComplete, onDismiss, startDelayMs = 600 },
  ref
) {
  const storageKey = `tour_${tourId}_v${version}`;
  const [open, setOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [tipPos, setTipPos] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const tipRef = useRef(null);

  const totalSteps = steps?.length ?? 0;
  const current = steps?.[stepIdx];

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // On mount: decide whether to start the tour
  useEffect(() => {
    if (!totalSteps) {
      dlog("No steps provided — tour disabled");
      return;
    }
    const seen = safeGet(storageKey);
    dlog(`Tour "${tourId}" v${version}:`, {
      storageKey,
      seen,
      willRun: !seen,
      totalSteps,
    });
    if (seen) {
      dlog(`Already ${seen} — skipping. To replay: localStorage.removeItem("${storageKey}")`);
      return;
    }
    const t = setTimeout(() => {
      dlog(`Starting tour after ${startDelayMs}ms delay`);
      setOpen(true);
    }, startDelayMs);
    return () => clearTimeout(t);
  }, [storageKey, totalSteps, startDelayMs, tourId, version]);

  useImperativeHandle(
    ref,
    () => ({
      replay: () => {
        dlog("Manual replay() called");
        setStepIdx(0);
        setOpen(true);
      },
      isOpen: () => open,
    }),
    [open]
  );

  // 🔥 IMPROVED: wait for target instead of giving up immediately
  const measure = useCallback(async () => {
    if (!open || !current) return;
    dlog(`Measuring target "${current.target}"...`);
    const el = await waitForTarget(current.target, 3000);
    if (!el) {
      console.warn(
        `[Coachmarks] Target "${current.target}" not found after 3s, advancing.`
      );
      next();
      return;
    }
    dlog(`Found target "${current.target}":`, el);
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    });
  }, [open, current]);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    const onResize = () => measure();
    const onScroll = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, stepIdx, measure]);

  useLayoutEffect(() => {
    if (!open || !targetRect || isMobile) {
      setTipPos(null);
      return;
    }
    const tipEl = tipRef.current;
    if (!tipEl) return;
    const tipRect = tipEl.getBoundingClientRect();
    const preferred = current?.placement || "bottom";
    const pos = computePosition(
      targetRect,
      { width: tipRect.width, height: tipRect.height },
      preferred
    );
    setTipPos(pos);
  }, [open, targetRect, stepIdx, isMobile, current?.placement]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") dismiss();
      else if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, stepIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  function next() {
    if (stepIdx >= totalSteps - 1) finish();
    else setStepIdx((i) => i + 1);
  }
  function prev() {
    setStepIdx((i) => Math.max(0, i - 1));
  }
  function finish() {
    safeSet(storageKey, "completed");
    setOpen(false);
    setStepIdx(0);
    onComplete?.();
  }
  function dismiss() {
    safeSet(storageKey, "dismissed");
    setOpen(false);
    setStepIdx(0);
    onDismiss?.();
  }

  if (!open || !current) return null;

  if (isMobile) {
    return (
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          display: "flex", flexDirection: "column",
          justifyContent: "flex-end", pointerEvents: "none",
        }}
        aria-modal="true" role="dialog"
      >
        <CoachmarkStyles />
        {targetRect && <SpotlightOverlay targetRect={targetRect} onDismiss={dismiss} />}
        <div
          ref={tipRef}
          style={{
            position: "relative", zIndex: 10000,
            margin: 12, padding: 16, borderRadius: 12,
            background: "#0f172a",
            border: "1px solid rgba(0,255,162,0.4)",
            boxShadow: "0 12px 40px rgba(0,255,162,0.15)",
            color: "#e2e8f0", pointerEvents: "auto",
            fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
          }}
        >
          <CoachmarkBody
            current={current} stepIdx={stepIdx} totalSteps={totalSteps}
            onNext={next} onPrev={prev} onDismiss={dismiss}
            isLast={stepIdx === totalSteps - 1}
          />
        </div>
      </div>
    );
  }

  const arrowSide = tipPos?.arrowSide || "top";
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none" }}
      aria-modal="true" role="dialog"
    >
      <CoachmarkStyles />
      {targetRect && <SpotlightOverlay targetRect={targetRect} onDismiss={dismiss} />}
      <div
        ref={tipRef}
        style={{
          position: "fixed",
          top: tipPos?.top ?? -9999,
          left: tipPos?.left ?? -9999,
          width: current?.width || 340, maxWidth: "calc(100vw - 32px)",
          zIndex: 10000, padding: 18, borderRadius: 10,
          background: "#0f172a",
          border: "1px solid rgba(0,255,162,0.4)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,255,162,0.1)",
          color: "#e2e8f0", pointerEvents: "auto",
          fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
          visibility: tipPos ? "visible" : "hidden",
          animation: "coachmark-fadein 0.2s ease",
        }}
      >
        <Arrow side={arrowSide} />
        <CoachmarkBody
          current={current} stepIdx={stepIdx} totalSteps={totalSteps}
          onNext={next} onPrev={prev} onDismiss={dismiss}
          isLast={stepIdx === totalSteps - 1}
        />
      </div>
    </div>
  );
});

function CoachmarkBody({ current, stepIdx, totalSteps, onNext, onPrev, onDismiss, isLast }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#34d399", fontWeight: 700 }}>
          {stepIdx + 1} of {totalSteps} · Tour
        </div>
        <button
          onClick={onDismiss} aria-label="Close tour"
          style={{ background: "transparent", border: 0, color: "#94a3b8", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 4, margin: -4 }}
        >×</button>
      </div>
      {current.title && (
        <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 18, fontWeight: 600, color: "#f1f5f9", marginBottom: 8, letterSpacing: "-0.01em" }}>
          {current.title}
        </div>
      )}
      <div style={{ fontSize: 13, lineHeight: 1.55, color: "#cbd5e1", marginBottom: 14 }}>
        {current.body}
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 14 }} aria-hidden="true">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1, height: 2, borderRadius: 2,
              background: i <= stepIdx ? "#00ffa2" : "rgba(148, 163, 184, 0.25)",
              transition: "background 0.2s",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <button
          onClick={onDismiss}
          style={{ background: "transparent", border: 0, color: "#64748b", cursor: "pointer", fontSize: 11, textDecoration: "underline", padding: 0, fontFamily: "inherit" }}
        >Skip tour</button>
        <div style={{ display: "flex", gap: 8 }}>
          {stepIdx > 0 && (
            <button
              onClick={onPrev}
              style={{ padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "#cbd5e1", background: "transparent", border: "1px solid rgba(148,163,184,0.3)", borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}
            >Back</button>
          )}
          <button
            onClick={onNext}
            style={{ padding: "6px 14px", fontSize: 12, fontWeight: 700, color: "#0b1220", background: "#00ffa2", border: 0, borderRadius: 6, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.02em" }}
          >{isLast ? "Got it →" : "Next →"}</button>
        </div>
      </div>
    </>
  );
}

function Arrow({ side }) {
  const size = 10;
  const common = { position: "absolute", width: 0, height: 0 };
  const styles = {
    top:    { ...common, top: -size,    left: `calc(50% - ${size}px)`, borderLeft: `${size}px solid transparent`, borderRight: `${size}px solid transparent`, borderBottom: `${size}px solid #0f172a`, filter: "drop-shadow(0 -1px 0 rgba(0,255,162,0.4))" },
    bottom: { ...common, bottom: -size, left: `calc(50% - ${size}px)`, borderLeft: `${size}px solid transparent`, borderRight: `${size}px solid transparent`, borderTop:    `${size}px solid #0f172a`, filter: "drop-shadow(0 1px 0 rgba(0,255,162,0.4))" },
    left:   { ...common, left: -size,   top:  `calc(50% - ${size}px)`, borderTop: `${size}px solid transparent`,  borderBottom: `${size}px solid transparent`, borderRight:  `${size}px solid #0f172a`, filter: "drop-shadow(-1px 0 0 rgba(0,255,162,0.4))" },
    right:  { ...common, right: -size,  top:  `calc(50% - ${size}px)`, borderTop: `${size}px solid transparent`,  borderBottom: `${size}px solid transparent`, borderLeft:   `${size}px solid #0f172a`, filter: "drop-shadow(1px 0 0 rgba(0,255,162,0.4))" },
  };
  return <div style={styles[side]} aria-hidden="true" />;
}

function CoachmarkStyles() {
  return (
    <style>{`
      @keyframes coachmark-fadein {
        from { opacity: 0; transform: translateY(4px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes coachmark-dash {
        to { stroke-dashoffset: -16; }
      }
    `}</style>
  );
}

export default Coachmarks;