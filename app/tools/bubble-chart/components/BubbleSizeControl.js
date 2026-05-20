"use client";

import { useState, useRef, useEffect } from "react";

export default function BubbleSizeControl({
  controls,
  setControls,
  useShouldApplyControls,
}) {
  useEffect(() => {
    function handleEsc(e) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const wrapperRef = useRef(null);
  const [open, setOpen] = useState(false);

  function toggle(key) {
    setControls((prev) => {
      const next = {
        ...prev,
        [key]: !prev[key],
      };

      if (Object.values(next).every((v) => !v)) {
        return prev; // prevent all off
      }
      return next; // ❌ prevent all false
    });
  }

  const items = [
    { key: "price", label: "📈 Price" },
    { key: "volume", label: "📊 Volume" },
    { key: "delivery", label: "📦 Delivery" },
    { key: "oi", label: "📑 Open Interest" },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        padding: "4px 8px",
        alignItems: "center",
        borderRadius: 4,
      }}
    >
      {useShouldApplyControls && (
        <div
          style={{
            fontSize: 11,
            opacity: 0.7,
            paddingRight: 20,
            paddingLeft: 10,
            position: "absolute",
            top: 0,
            color: "#fbd008",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: "#c9d4f6" }}>
            Active :{" "}
          </span>{" "}
          {Object.entries(controls)
            .filter(([_, v]) => v)
            .map(([k]) => k.toUpperCase())
            .join(" + ") || "None"}
        </div>
      )}
      <div
        ref={wrapperRef}
        style={{
          position: "relative",
          border: open ? "2px solid #facc15" : "2px solid transparent",
          borderRadius: 4,
        }}
      >
        {/* BUTTON */}
        <div
          onClick={(e) => {
            e.stopPropagation(); // ✅ IMPORTANT
            setOpen((p) => !p);
          }}
          style={{
            background: open ? "#111" : "#374151",
            padding: "6px 10px",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            zIndex: 51,
          }}
        >
          ⚙ Bubble Size
        </div>

        {/* DROPDOWN */}
        {open && (
          <div
            style={{
              position: "absolute",
              top: 30,
              left: -2,
              background: "#111",
              border: "2px solid #facc15",
              borderRadius: 6,
              padding: 10,
              minWidth: 220,
              zIndex: 50,
            }}
          >
            {items.map((item) => (
              <label
                key={item.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                  cursor: "pointer",
                  // ✅ ADD THESE
                  opacity: useShouldApplyControls ? 1 : 0.4,
                  cursor: useShouldApplyControls ? "pointer" : "not-allowed",
                  pointerEvents: useShouldApplyControls ? "auto" : "none",
                }}
              >
                <input
                  type="checkbox"
                  disabled={!useShouldApplyControls}
                  checked={controls[item.key] || false}
                  onChange={() => toggle(item.key)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={() =>
          setControls({
            price: true,
            volume: true,
            delivery: true,
            oi: true,
          })
        }
        style={{
          color: "#ea4264",
          padding: "6px 10px 6px 0px",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        ❌ Reset
      </button>
    </div>
  );
}
