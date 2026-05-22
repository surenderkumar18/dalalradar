"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { formatDateForDisplay } from "../utils/dateUtils";

/**
 * Build a distinguishable color scale for an arbitrary number of sectors.
 * Uses interpolateSinebow for >10 sectors so colors don't alias.
 */
function buildSectorColors(sectors){
  const colors = {};
  if(sectors.length <= 10){
    sectors.forEach((sec,i) => {
      colors[sec] = d3.schemeTableau10[i];
    });
  } else {
    sectors.forEach((sec,i) => {
      colors[sec] = d3.interpolateSinebow(i / sectors.length);
    });
  }
  return colors;
}

function getTextColor(bg){
  const c = d3.color(bg);
  if(!c) return "#fff";
  const brightness = (c.r*299 + c.g*587 + c.b*114)/1000;
  return brightness > 140 ? "#000" : "#fff";
}

export default function SectorMoneyRiver({ data, events, timeline }) {

  const ref = useRef();
  const [viewMode, setViewMode] = useState("stacked");

  const { sortedDates, sortedSectors, sectorColors, latestDate } = useMemo(() => {
    if(!data) return { sortedDates: [], sortedSectors: [], sectorColors: {}, latestDate: null };

    const sectorsRaw = Object.keys(data);

    // Dates are now ISO strings ("2026-01-27"), so default sort works correctly
    const dates = [...new Set(
      sectorsRaw.flatMap(s => Object.keys(data[s]))
    )].sort();

    const latest = dates[dates.length - 1];

    const sectors = [...sectorsRaw].sort((a,b) => {
      const vA = data[a][latest] || 0;
      const vB = data[b][latest] || 0;
      return vB - vA;
    });

    return {
      sortedDates: dates,
      sortedSectors: sectors,
      sectorColors: buildSectorColors(sectors),
      latestDate: latest
    };
  }, [data]);

  useEffect(() => {

    if(!data || sortedDates.length === 0) return;

    const container = ref.current;
    d3.select(container).selectAll("*").remove();

    const margin = { top:80, right:20, bottom:40, left:20 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    const defs = svg.append("defs");

    // ---------------- LEADER GLOW FILTER ----------------
    const glow = defs.append("filter")
      .attr("id","leader-glow")
      .attr("height","300%")
      .attr("width","300%")
      .attr("x","-100%")
      .attr("y","-100%");

    glow.append("feGaussianBlur")
      .attr("stdDeviation","4")
      .attr("result","coloredBlur");

    const merge = glow.append("feMerge");
    merge.append("feMergeNode").attr("in","coloredBlur");
    merge.append("feMergeNode").attr("in","SourceGraphic");

    // ---------------- ROTATION ARROW MARKER ----------------
    const arrow = defs.append("marker")
      .attr("id","rotation-arrow")
      .attr("viewBox","0 -5 10 10")
      .attr("refX",10)
      .attr("refY",0)
      .attr("markerWidth",6)
      .attr("markerHeight",6)
      .attr("orient","auto");

    arrow.append("path")
      .attr("d","M0,-5L10,0L0,5")
      .attr("fill","#c4b5fd");

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // ---------------- STACK ----------------
    const stacked = sortedDates.map(date => {
      const row = { date };
      sortedSectors.forEach(sec => {
        row[sec] = data[sec][date] || 0;
      });
      return row;
    });

    let stackOffset = d3.stackOffsetNone;
    let stackOrder  = d3.stackOrderDescending;

    if(viewMode === "share"){
      stackOffset = d3.stackOffsetExpand;
    } else if(viewMode === "stream"){
      stackOffset = d3.stackOffsetWiggle;
      stackOrder  = d3.stackOrderInsideOut;
    }

    const stack = d3.stack()
      .keys(sortedSectors)
      .offset(stackOffset)
      .order(stackOrder);

    const layers = stack(stacked);

    const x = d3.scaleBand()
      .domain(sortedDates)
      .range([0, width]);

    const HEADER_BAND = 70;

    const y = d3.scaleLinear()
      .domain([
        d3.min(layers, layer => d3.min(layer, d => d[0])),
        d3.max(layers, layer => d3.max(layer, d => d[1]))
      ])
      .range([height, HEADER_BAND]);

    const area = d3.area()
      .x(d => x(d.data.date) + x.bandwidth()/2)
      .y0(d => y(d[0]))
      .y1(d => y(d[1]))
      .curve(d3.curveMonotoneX);

    const leaderSector = timeline && timeline.length > 0
      ? timeline[timeline.length - 1].leader
      : sortedSectors[0];

    // ---------------- GRID LINES ----------------
    g.selectAll(".date-grid")
      .data(sortedDates)
      .enter()
      .append("line")
      .attr("class","date-grid")
      .attr("x1", d => x(d) + x.bandwidth()/2)
      .attr("x2", d => x(d) + x.bandwidth()/2)
      .attr("y1", HEADER_BAND)
      .attr("y2", height)
      .attr("stroke", "rgba(255,255,255,0.05)")
      .attr("stroke-width", 1);

    // ---------------- TOOLTIP ----------------
    const tooltip = d3.select(container)
      .append("div")
      .style("position","absolute")
      .style("padding","8px 10px")
      .style("font-size","12px")
      .style("border-radius","6px")
      .style("background","#0f172a")
      .style("color","#fff")
      .style("border-left","4px solid #7c3aed")
      .style("box-shadow","0 4px 12px rgba(0,0,0,0.4)")
      .style("pointer-events","none")
      .style("opacity",0)
      .style("z-index","100");

    // ---------------- RIVER ----------------
    const paths = g.selectAll("path.sector-path")
      .data(layers)
      .enter()
      .append("path")
      .attr("class", d => "sector-path sector-" + d.key)
      .attr("d", area)
      .attr("fill", d => sectorColors[d.key])
      .attr("opacity", 0.9);

    if(viewMode === "stacked"){
      paths
        .filter(d => d.key === leaderSector)
        .attr("stroke","#ffffff")
        .attr("style","mix-blend-mode:screen")
        .attr("filter","url(#leader-glow)")
        .attr("stroke-width",2)
        .attr("opacity",1);
    }

    function highlightSector(key){
      paths.transition()
        .duration(120)
        .attr("opacity", p => {
          if(p.key === key) return 1;
          if(p.key === leaderSector && viewMode === "stacked") return 0.9;
          return 0.15;
        });
    }

    function resetHighlight(){
      paths.transition()
        .duration(120)
        .attr("opacity", 0.9);
    }

    // ---------------- HOVER ----------------
    paths
      .on("mousemove", function(event, d){

        highlightSector(d.key);

        const [xPos] = d3.pointer(event, g.node());

        let index = Math.round(xPos / x.bandwidth() - 0.5);
        index = Math.max(0, Math.min(sortedDates.length - 1, index));

        const date = sortedDates[index];
        const value = data[d.key][date] || 0;

        const dateTotal = sortedSectors.reduce(
          (sum, sec) => sum + (data[sec][date] || 0),
          0
        );
        const share = dateTotal > 0 ? (value / dateTotal * 100).toFixed(1) : "0.0";

        tooltip
          .style("opacity", 1)
          .style("border-left-color", sectorColors[d.key])
          .html(`
            <div style="font-weight:600;margin-bottom:2px;">${d.key}</div>
            <div style="color:#94a3b8;font-size:11px;margin-bottom:4px;">${formatDateForDisplay(date)}</div>
            <div>₹${Math.round(value/1000).toLocaleString()} Cr</div>
            <div style="color:#94a3b8;font-size:11px;">${share}% of day total</div>
          `)
          .style("left", (event.offsetX + 14) + "px")
          .style("top",  (event.offsetY - 10) + "px");

      })
      .on("mouseleave", function(){
        tooltip.style("opacity", 0);
        resetHighlight();
      });

    // ---------------- X AXIS (format ISO back to "jan_27" for display) ----------------
    const tickEvery = Math.max(1, Math.floor(sortedDates.length / 25));
    const xAxis = d3.axisBottom(x)
      .tickValues(sortedDates.filter((d,i) => i % tickEvery === 0))
      .tickFormat(d => formatDateForDisplay(d));

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .selectAll("text")
      .attr("fill","#9ca3af")
      .style("font-size","10px")
      .attr("text-anchor","middle");

    // ---------------- LATEST DATE LINE ----------------
    g.append("line")
      .attr("x1", x(latestDate) + x.bandwidth()/2)
      .attr("x2", x(latestDate) + x.bandwidth()/2)
      .attr("y1", HEADER_BAND - 5)
      .attr("y2", height)
      .attr("stroke", "#000")
      .attr("stroke-width", 4)
      .attr("opacity", 0.4);

    g.append("line")
      .attr("x1", x(latestDate) + x.bandwidth()/2)
      .attr("x2", x(latestDate) + x.bandwidth()/2)
      .attr("y1", HEADER_BAND - 5)
      .attr("y2", height)
      .attr("stroke", "#facc15")
      .attr("stroke-width", 2)
      .attr("opacity", 1);

    // ---------------- LEADER LABELS ----------------
    if(timeline && timeline.length > 0){

      const leaderGroup = g.append("g").attr("class","leader-labels");

      let prevLabeled = null;
      let lastRightEdge = -Infinity;

      timeline.forEach(t => {

        if(t.leader === prevLabeled) return;

        const xPos = x(t.date);
        if(xPos === undefined) return;

        const xCenter = xPos + x.bandwidth()/2;

        const temp = leaderGroup.append("text")
          .attr("x", xCenter)
          .attr("y", 20)
          .attr("text-anchor","middle")
          .style("font-size","10px")
          .style("font-weight","600")
          .text(t.leader)
          .attr("opacity", 0);

        const bbox = temp.node().getBBox();
        const leftEdge = xCenter - bbox.width/2;
        const rightEdge = xCenter + bbox.width/2;

        if(leftEdge < lastRightEdge + 12){
          temp.remove();
          return;
        }

        temp.attr("fill", sectorColors[t.leader])
            .attr("opacity", 1);

        leaderGroup.append("line")
          .attr("x1", xCenter)
          .attr("x2", xCenter)
          .attr("y1", 28)
          .attr("y2", HEADER_BAND - 2)
          .attr("stroke", sectorColors[t.leader])
          .attr("stroke-width", 1)
          .attr("opacity", 0.4)
          .attr("stroke-dasharray","2,3");

        prevLabeled = t.leader;
        lastRightEdge = rightEdge;

      });

    }

    // ---------------- ROTATION EVENT MARKERS ----------------
    if(events && events.length){

      const markerGroup = g.append("g").attr("class","rotation-markers");

      events.slice(-12).forEach(e => {

        const xValue = x(e.date);
        if(xValue === undefined) return;

        const xPos = xValue + x.bandwidth()/2;

        markerGroup.append("line")
          .attr("x1", xPos)
          .attr("x2", xPos)
          .attr("y1", HEADER_BAND)
          .attr("y2", height)
          .attr("stroke", "rgba(167,139,250,0.25)")
          .attr("stroke-dasharray","3,4")
          .attr("stroke-width", 1);

        markerGroup.append("circle")
          .attr("cx", xPos)
          .attr("cy", HEADER_BAND - 8)
          .attr("r", 3.5)
          .attr("fill", "#a78bfa")
          .append("title")
          .text(`${formatDateForDisplay(e.date)}: ${e.from} → ${e.to}`);

      });

    }

  }, [data, events, timeline, sortedDates, sortedSectors, sectorColors, latestDate, viewMode]);

  // ---------------- PANELS ----------------
  const panelStyle = {
    background:"rgba(15,23,42,0.6)",
    border:"1px solid rgba(255,255,255,0.06)",
    borderRadius:10,
    padding:16,
    height:260,
    overflowY:"auto"
  };

  const headerStyle = {
    fontWeight:600,
    fontSize:16,
    marginBottom:12,
    color:"#c084fc"
  };

  const viewModeButton = (mode, label) => (
    <button
      key={mode}
      onClick={() => setViewMode(mode)}
      style={{
        padding:"6px 12px",
        fontSize:12,
        borderRadius:6,
        border:"1px solid " + (viewMode === mode ? "#7c3aed" : "rgba(255,255,255,0.1)"),
        background: viewMode === mode ? "rgba(124,58,237,0.2)" : "transparent",
        color: viewMode === mode ? "#c4b5fd" : "#9ca3af",
        cursor:"pointer",
        fontWeight: viewMode === mode ? 600 : 400
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ width:"100%" }}>

      <div style={{ display:"flex", gap:8, marginBottom:12, alignItems:"center" }}>
        <span style={{ fontSize:12, color:"#6b7280", marginRight:4 }}>View:</span>
        {viewModeButton("stacked", "Absolute")}
        {viewModeButton("share",   "Share %")}
        {viewModeButton("stream",  "Stream")}
      </div>

      <div
        ref={ref}
        style={{
          width:"100%",
          height:"900px",
          position:"relative"
        }}
      />

      <div
        style={{
          display:"grid",
          gridTemplateColumns:"1fr 1fr 1fr",
          gap:20,
          marginTop:24
        }}
      >

        {/* Legend */}
        <div style={panelStyle}>
          <div style={headerStyle}>Sector Legend</div>
          <div
            style={{
              display:"grid",
              gridTemplateColumns:"repeat(3,1fr)",
              gap:"10px 14px",
              fontSize:12
            }}
          >
            {sortedSectors.map(sec => (
              <div
                key={sec}
                style={{
                  display:"flex",
                  alignItems:"center",
                  gap:6,
                  cursor:"pointer"
                }}
                onMouseEnter={() => {
                  d3.select(ref.current)
                    .selectAll("path.sector-path")
                    .transition()
                    .duration(120)
                    .attr("opacity", d => d?.key === sec ? 1 : 0.15);
                }}
                onMouseLeave={() => {
                  d3.select(ref.current)
                    .selectAll("path.sector-path")
                    .transition()
                    .duration(120)
                    .attr("opacity", 0.9);
                }}
              >
                <div
                  style={{
                    width:12,
                    height:12,
                    background: sectorColors[sec],
                    borderRadius:2,
                    flexShrink:0
                  }}
                />
                <span style={{ fontSize:11 }}>{sec}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rotation Events */}
        <div style={panelStyle}>
          <div style={headerStyle}>Sector Rotation Events</div>
          {[...(events || [])].reverse().slice(0, 20).map((e, i) => (
            <div
              key={i}
              style={{
                display:"grid",
                gridTemplateColumns:"60px 20px 1fr",
                alignItems:"center",
                fontSize:13,
                marginBottom:6
              }}
            >
              <span style={{ color:"#9ca3af" }}>{formatDateForDisplay(e.date)}</span>
              <span style={{ textAlign:"center" }}>🔁</span>
              <span>
                <b style={{ color: sectorColors[e.from] }}>{e.from}</b>
                {" → "}
                <b style={{ color: sectorColors[e.to] }}>{e.to}</b>
              </span>
            </div>
          ))}
          {(!events || events.length === 0) && (
            <div style={{ color:"#6b7280", fontSize:12 }}>No rotation events detected.</div>
          )}
        </div>

        {/* Timeline */}
        <div style={panelStyle}>
          <div style={headerStyle}>Sector Leadership Timeline</div>
          {[...(timeline || [])].reverse().slice(0, 20).map((t, i) => (
            <div
              key={i}
              style={{
                display:"grid",
                gridTemplateColumns:"60px 1fr",
                alignItems:"center",
                fontSize:13,
                marginBottom:6
              }}
            >
              <span style={{ color:"#9ca3af" }}>{formatDateForDisplay(t.date)}</span>
              <span style={{
                borderLeft:"3px solid " + (sectorColors[t.leader] || "rgba(255,255,255,0.4)"),
                paddingLeft:10
              }}>
                <b style={{ color:"#fff" }}>{t.leader}</b>
              </span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
