"use client";
import React from "react";

const indicatorStyle = {
  width: 3,
  height: 24,
  background: "#ffd40c",
  borderRadius: 2,
  marginRight: 6,
  flexShrink: 0,
};

const Footer = React.memo(function Footer({
  sectors = [],
  selectedSector,
  setActiveCategory,
  onSectorClick,
  sectorRefs,
  mode,
  setCameFromSector,
  onBack,
  draggingSector,
  setDraggingSector,
  moveSector,
  dropIndex,
  setDropIndex,
  setMode,
  favoriteStocks,
}) {
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();

        const rect = e.currentTarget.getBoundingClientRect();

        // if dragging near right edge → treat as last position
        if (e.clientX > rect.right - 40) {
          if (dropIndex !== sectors.length) {
            setDropIndex(sectors.length);
          }
        }
      }}
      style={{
        position: "sticky",
        bottom: 0,
        zIndex: 100,
        display: "flex",
        gap: "14px",
        overflowX: "auto",
        whiteSpace: "nowrap",
        padding: "12px 12px",
        background: "rgba(2,6,23,0.95)",
        backdropFilter: "blur(6px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        fontWeight: 500,
        fontSize: 16,
        paddingLeft: 60,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "left",
          gap: "14px",
          whiteSpace: "nowrap",
          fontWeight: 500,
          fontSize: 14,
          width: "100%",
          alignItems: "center",
        }}
      >
        <button
          onClick={() => {
            setMode("favorites");
            onSectorClick?.(null); // 👈 Clear the selected sector when entering favorites
          }}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            background: "#111827",
            color: "#facc15",
            fontWeight: 600,
            fontSize: 16,
            cursor: "pointer",
            border: 0,
            background:
              mode === "favorites"
                ? "#6366f1" // 🔥 active
                : "#111827",
            color: mode === "favorites" ? "#000000" : "#facc15",
           
            transition: "all 0.2s ease",
          }}
        >
          ⭐ Favorites{" "}
          <span style={{ color: "#ffffff", fontWeight: 700 }}>
            ({favoriteStocks?.length || 0})
          </span>
        </button>
        {sectors.map((sec, index) => (
          <React.Fragment key={sec}>
            {/* 🔥 DROP INDICATOR */}
            {dropIndex === index && <div style={indicatorStyle} />}

            <span
              ref={(el) => (sectorRefs.current[sec] = el)}
              className={`sector-tab ${sec === selectedSector ? "active" : ""}`}
              onClick={() => {
                if (draggingSector) return;

                setActiveCategory(null);
                onSectorClick?.(sec);
              }}
              style={{
                flexShrink: 0,
                padding: "6px 8px",
                borderRadius: 4,
                background:
                  sec === selectedSector && mode !== "favorites"
                    ? "#3896fa"
                    : "transparent",
                color:
                  sec === selectedSector && mode !== "favorites"
                    ? "#ffffff"
                    : "#94a3b8",
                transition: "all 0.2s ease",
                cursor: draggingSector ? "grabbing" : "pointer",
                opacity: draggingSector === sec ? 0.5 : 1,
              }}
              draggable
              onDragStart={(e) => {
                setDraggingSector(sec);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (dropIndex !== index) {
                  setDropIndex(index);
                }
              }}
              onDrop={() => {
                if (dropIndex == null || !draggingSector) return;

                const from = sectors.indexOf(draggingSector);
                const to = dropIndex;

                moveSector(from, to);

                setDraggingSector(null);
                setDropIndex(null);
              }}
              onDragEnd={() => {
                setDraggingSector(null);
                setDropIndex(null);
              }}
            >
              {sec}
            </span>
          </React.Fragment>
        ))}

        {/* 🔥 LAST POSITION INDICATOR (end drop) */}
        {dropIndex === sectors.length && <div style={indicatorStyle} />}

        {mode !== "sector" && (
          <span
            onClick={() => {
              setActiveCategory(null);
              setCameFromSector(false);
              onBack?.();
            }}
            style={{
              cursor: "pointer",
              color: "#000000",
              fontWeight: 500,
              fontSize: 18,
              position: "absolute",
              right: 16,
              background: "#c8a502",
              borderRadius: 4,
              padding: "4px 10px",
            }}
          >
            <span
              style={{
                fontWeight: 800,
                fontSize: 24,
                lineHeight: "20px",
              }}
            >
              ←{" "}
            </span>
            Back to Sectors
          </span>
        )}
      </div>
    </div>
  );
});

export default Footer;
