// app\tools\rollover\components\OIPriceChart.js

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import rawData from "@/data/fno.json";

function formatIN(num) {
  if (!Number.isFinite(num)) return "-";
  return Number(num).toLocaleString("en-IN");
}

// 🔹 Parse label like "feb_27" → Date object
const parseLabelToDate = (label) => {
  const [mon, day] = label.split("_");

  const monthMap = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };

  return new Date(
    new Date().getFullYear(),
    monthMap[mon.toLowerCase()],
    Number(day),
  );
};
// 🔹 Format label for display: "Feb 27"
const formatLabel = (label) => {
  const dateObj = parseLabelToDate(label);

  return dateObj.toLocaleDateString("en-IN", {
    month: "short",
    day: "2-digit",
  });
};

const formatSmartLabel = (label, prevLabel) => {
  const current = parseLabelToDate(label);
  const prev = prevLabel ? parseLabelToDate(prevLabel) : null;

  const day = current.toLocaleDateString("en-IN", { day: "2-digit" });
  const month = current.toLocaleDateString("en-IN", { month: "short" });

  // 👉 First label OR month changed
  if (!prev || current.getMonth() !== prev.getMonth()) {
    return `${day} ${month}`; // 01 Mar
  }

  return day; // 05
};

export default function OIPriceChart({
  symbol,
  onClose,
  canvasHeight,
  currentDate,
  days = 30,
}) {
  const canvasRef = useRef(null);

  /* ================= CONFIG STATE ================= */
  const [priceOnLeft, setPriceOnLeft] = useState(false);
  const [oiColor, setOiColor] = useState("#3b82f6");
  const [priceColor, setPriceColor] = useState("#9d821e");
  const [tooltip, setTooltip] = useState(null);

  /* ================= DATA ================= */
  const rows = useMemo(() => {
    if (!symbol) return [];

    const temp = [];

    Object.entries(rawData).forEach(([date, stocks]) => {
      const found = stocks[symbol];
      if (!found) return;

      const ts = parseLabelToDate(date).getTime();

      // 🔥 FILTER BASED ON HOVER DATE
      if (currentDate && ts > currentDate) return;

      temp.push({
        date,
        ts,
        oi: Number(found.OI),
        price: Number(found.FUT_PRICE),
      });
    });

    // 🔥 CORRECT SORT (IMPORTANT FIX)
    temp.sort((a, b) => a.ts - b.ts);
    temp.sort((a, b) => a.ts - b.ts);

    // 🔥 CONFIGURABLE SLICE
    const sliced = temp.slice(-days);

    return sliced;

    return temp;
  }, [symbol, currentDate]);

  /* ================= DRAW ================= */
  useEffect(() => {
    if (!rows.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const width = rect.width;
    const height = rect.height;

    const paddingLeft = 70;
    const paddingRight = 70;
    const paddingTop = 40;
    const paddingBottom = 40;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const leftKey = priceOnLeft ? "price" : "oi";
    const rightKey = priceOnLeft ? "oi" : "price";

    const leftValues = rows.map((r) => r[leftKey]);
    const rightValues = rows.map((r) => r[rightKey]);

    const leftMin = Math.min(...leftValues);
    const leftMax = Math.max(...leftValues);
    const rightMin = Math.min(...rightValues);
    const rightMax = Math.max(...rightValues);

    const leftRange = leftMax - leftMin || 1;
    const rightRange = rightMax - rightMin || 1;

    const stepX = chartWidth / (rows.length - 1);
    const getX = (i) => paddingLeft + i * stepX;

    const getYLeft = (value) =>
      paddingTop + chartHeight - ((value - leftMin) / leftRange) * chartHeight;

    const getYRight = (value) =>
      paddingTop +
      chartHeight -
      ((value - rightMin) / rightRange) * chartHeight;

    const drawChart = (hoverIndex = null) => {
      ctx.clearRect(0, 0, width, height);

      ctx.strokeStyle = "#374151";
      ctx.lineWidth = 1;

      // Left axis
      ctx.beginPath();
      ctx.moveTo(paddingLeft, paddingTop);
      ctx.lineTo(paddingLeft, height - paddingBottom);
      ctx.stroke();

      // Right axis
      ctx.beginPath();
      ctx.moveTo(width - paddingRight, paddingTop);
      ctx.lineTo(width - paddingRight, height - paddingBottom);
      ctx.stroke();

      // Bottom axis
      ctx.beginPath();
      ctx.moveTo(paddingLeft, height - paddingBottom);
      ctx.lineTo(width - paddingRight, height - paddingBottom);
      ctx.stroke();

      const drawLine = (key, color, useLeftScale) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        rows.forEach((row, i) => {
          const x = getX(i);
          const y = useLeftScale ? getYLeft(row[key]) : getYRight(row[key]);

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });

        ctx.stroke();
      };

      drawLine(leftKey, leftKey === "price" ? priceColor : oiColor, true);
      drawLine(rightKey, rightKey === "price" ? priceColor : oiColor, false);

      /* ================= SCALES ================= */

      ctx.fillStyle = "#9ca3af";
      ctx.font = "11px Arial";

      // LEFT SCALE
      ctx.textAlign = "right";
      for (let i = 0; i <= 4; i++) {
        const value = leftMin + (leftRange / 4) * (4 - i);
        const y = paddingTop + (chartHeight / 4) * i;

        const label =
          leftKey === "price"
            ? `₹${value.toFixed(0)}`
            : formatIN(Math.round(value));

        ctx.fillText(label, paddingLeft - 10, y + 3);

        ctx.beginPath();
        ctx.moveTo(paddingLeft - 5, y);
        ctx.lineTo(paddingLeft, y);
        ctx.stroke();
      }

      // RIGHT SCALE
      ctx.textAlign = "left";
      for (let i = 0; i <= 4; i++) {
        const value = rightMin + (rightRange / 4) * (4 - i);
        const y = paddingTop + (chartHeight / 4) * i;

        const label =
          rightKey === "price"
            ? `₹${value.toFixed(0)}`
            : formatIN(Math.round(value));

        ctx.fillText(label, width - paddingRight + 10, y + 3);

        ctx.beginPath();
        ctx.moveTo(width - paddingRight, y);
        ctx.lineTo(width - paddingRight + 5, y);
        ctx.stroke();
      }

      // DATE TICKS
      ctx.textAlign = "center";
      const dateStep = Math.max(1, Math.floor(rows.length / 10));

      for (let i = 0; i < rows.length; i += dateStep) {
        const x = getX(i);
        const y = height - paddingBottom;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 5);
        ctx.stroke();

        const prevDate = i - dateStep >= 0 ? rows[i - dateStep].date : null;

        const label = formatSmartLabel(rows[i].date, prevDate);

        // 🎨 Set color BEFORE drawing text
        ctx.fillStyle = label.includes(" ")
          ? "#fbbf24" // month change → highlight
          : "#9ca3af";

        ctx.fillText(label, x, y + 18);
      }

      // Hover crosshair
      if (hoverIndex !== null) {
        const x = getX(hoverIndex);

        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "#6b7280";
        ctx.beginPath();
        ctx.moveTo(x, paddingTop);
        ctx.lineTo(x, height - paddingBottom);
        ctx.stroke();
        ctx.setLineDash([]);

        const leftY = getYLeft(rows[hoverIndex][leftKey]);
        const rightY = getYRight(rows[hoverIndex][rightKey]);

        ctx.fillStyle = leftKey === "price" ? priceColor : oiColor;
        ctx.beginPath();
        ctx.arc(x, leftY, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = rightKey === "price" ? priceColor : oiColor;
        ctx.beginPath();
        ctx.arc(x, rightY, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    drawChart();

    const handleMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const index = Math.round((mouseX - paddingLeft) / stepX);

      if (index < 0 || index >= rows.length) {
        drawChart();
        setTooltip(null);
        return;
      }

      drawChart(index);

      const row = rows[index];

      setTooltip({
        x: e.clientX,
        y: e.clientY,
        date: row.date,
        oi: row.oi,
        price: row.price,
      });
    };

    const handleLeave = () => {
      drawChart();
      setTooltip(null);
    };

    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("mouseleave", handleLeave);

    return () => {
      canvas.removeEventListener("mousemove", handleMove);
      canvas.removeEventListener("mouseleave", handleLeave);
    };
  }, [rows, priceOnLeft, oiColor, priceColor]);

  if (!rows.length) return null;

  return (
    <div style={{ background: "#111827", padding: 12, borderRadius: 6 }}>
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h3 style={{ fontWeight: 700, color: "#c084fc" }}>
          {symbol} –
          <span style={{ fontSize: 18, color: "#3b82f6" }}>
            {" "}
            OI
            <span style={{ color: "#999" }}> vs </span>
            <span style={{ color: "#9d821e" }}>Premium</span>
          </span>
        </h3>

        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            fontSize: 18,
            color: "#ef4444",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          ✕
        </button>
      </div>

      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: canvasHeight || 240,
          borderRadius: 6,
          background: "#1f2937",
        }}
      />

      {/* TOOLTIP */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            top: tooltip.y + 12,
            left: tooltip.x + 12,
            background: "#111827",
            border: "1px solid #374151",
            padding: "8px 12px",
            borderRadius: 6,
            fontSize: 12,
            pointerEvents: "none",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              fontWeight: 800,
              fontSize: 16,
              color: "#fbbf24",
              marginBottom: 8,
            }}
          >
            {formatLabel(tooltip.date)}
          </div>
          <div style={{ color: oiColor, fontSize: 16, fontWeight: 700 }}>
            OI: {formatIN(tooltip.oi)}
          </div>
          <div style={{ color: priceColor, fontSize: 16, fontWeight: 700 }}>
            Price: ₹{tooltip.price.toFixed(2)}
          </div>
        </div>
      )}

      {/* CONFIG CONTROLS */}
      <div
        style={{
          display: "flex",
          gap: 24,
          marginTop: 12,
          fontSize: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={priceOnLeft}
            onChange={() => setPriceOnLeft(!priceOnLeft)}
          />
          Price on Left
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          OI Color
          <input
            type="color"
            value={oiColor}
            onChange={(e) => setOiColor(e.target.value)}
            style={{ width: 24, height: 24 }}
          />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Price Color
          <input
            type="color"
            value={priceColor}
            onChange={(e) => setPriceColor(e.target.value)}
            style={{ width: 24, height: 24 }}
          />
        </label>
      </div>
    </div>
  );
}
