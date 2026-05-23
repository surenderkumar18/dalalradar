"use client";
import React, { useEffect, useRef, useState } from "react";
import { useUserPlan } from "@/context/UserPlanContext"; // ✨ NEW: import user plan

export default function CustomDropdown({
  label,
  value,
  onChange,
  options = [],
  width = 120,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const { isPremiumUser } = useUserPlan(); // ✨ NEW: read user plan

  const selected = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      ref={rootRef}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        position: "relative",
      }}
    >
      {label && (
        <span
          style={{
            fontSize: 14,
            color: "#e5e7eb",
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width,
          padding: "6px 12px",
          borderRadius: 4,
          border: open
            ? "1px solid rgba(250,204,21,0.6)"
            : "1px solid rgba(255,255,255,0.10)",
          background: open
            ? "rgba(15,23,42,0.98)"
            : "#131c2e",
          color: "#f8fafc",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: open
            ? "0 0 6px rgba(250,204,21,0.18)"
            : "inset 0 1px 0 rgba(255,255,255,0.04)",
          transition: "all 0.18s ease",
        }}
      >
        <span>{selected?.label || "Select"}</span>

        <span
          style={{
            fontSize: 12,
            color: open ? "#facc15" : "#94a3b8",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        >
          ▼
        </span>
      </button>

      {/* Menu */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: 30,
            left: label ? undefined : 0,
            right: 0,
            marginTop: 6,
            width,
            background: "rgba(2,6,23,0.98)",
            border: "1px solid rgba(250,204,21,0.5)",
            borderRadius: 4,
            overflow: "hidden",
            boxShadow: `
              0 12px 30px rgba(0,0,0,0.45),
              0 0 12px rgba(250,204,21,0.15)
            `,
            zIndex: 1000,
            backdropFilter: "blur(12px)",
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            // ✨ NEW: Check if option is premium and locked for current user
            const isLocked = opt.premium && !isPremiumUser;

            return (
              <div
                key={String(opt.value)}
                onClick={() => {
                  // ✨ NEW: Block selection for locked options
                  if (isLocked) {
                    // Optional: show upgrade prompt
                    // alert("This option is available for Premium users only");
                    return;
                  }
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  padding: "9px 12px",
                  cursor: isLocked ? "not-allowed" : "pointer", // ✨ NEW
                  fontSize: 14,
                  fontWeight: isSelected ? 700 : 500,
                  color: isLocked
                    ? "#64748b" // ✨ NEW: muted color for locked
                    : isSelected
                      ? "#ffffff"
                      : "#e2e8f0",
                  background: isSelected
                    ? "linear-gradient(90deg, rgba(59,130,246,0.35), rgba(168,85,247,0.35))"
                    : "transparent",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  transition: "all 0.15s ease",
                  opacity: isLocked ? 0.55 : 1, // ✨ NEW: faded for locked
                  // ✨ NEW: flex layout to push "PREMIUM" tag to the right
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  // ✨ NEW: skip hover effects for locked options
                  if (isLocked || isSelected) return;
                  e.currentTarget.style.background =
                    "rgba(250,204,21,0.10)";
                  e.currentTarget.style.color = "#ffffff";
                }}
                onMouseLeave={(e) => {
                  if (isLocked || isSelected) return;
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#e2e8f0";
                }}
              >
                <span>{opt.label}</span>

                {/* ✨ NEW: Premium tag */}
                {isLocked && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: 1,
                      color: "#facc15",
                      background: "rgba(250,204,21,0.08)",
                      padding: "2px 5px",
                      borderRadius: 2,
                      border: "1px solid rgba(250,204,21,0.25)",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    🔒 Pro
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}