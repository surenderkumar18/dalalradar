// app\tools\bubbleChart\components\MiniRolloverBars.js

export default function MiniRolloverBars({
  data,
  symbol,
  currentDate,
  latestDate,
}) {
  if (!data) return null;

  /* =========================
     1️⃣ MONTHLY ROLLOVER (12)
  ========================== */
  const MONTH_MAP = {
    Jan: 1,
    Feb: 2,
    Mar: 3,
    Apr: 4,
    May: 5,
    Jun: 6,
    Jul: 7,
    Aug: 8,
    Sep: 9,
    Oct: 10,
    Nov: 11,
    Dec: 12,
  };

  let months = Object.entries(data)
    .filter(([k]) => /_[0-9]{2}$/.test(k))
    .map(([k, v]) => {
      const num = Number(v);
      if (!Number.isFinite(num)) return null;

      const [m, y] = k.split("_");

      return {
        key: k,
        oi: num,
        sortKey: Number("20" + y) * 100 + MONTH_MAP[m],
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.sortKey - b.sortKey)
    .slice(-12); // 🔥 last 12 months

  /* =========================
     2️⃣ TODAY OI
  ========================== */
  if (Number.isFinite(data.asOfTodayOi)) {
    months.push({
      key: "asOfTodayOi",
      oi: Number(data.asOfTodayOi),
    });
  }

  /* =========================
     3️⃣ DAILY MICRO (last 5 days)
  ========================== */
  const parseDateKey = (key) => {
    const [mon, day] = key.split("_");

    const MONTH_MAP = {
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

    const year = new Date(currentDate).getFullYear(); // ✅ dynamic

    return new Date(year, MONTH_MAP[mon.toLowerCase()], Number(day)).getTime();
  };

  const micro = (data.oiHistory || [])
    .filter((d) => parseDateKey(d.date) <= currentDate)
    .sort((a, b) => parseDateKey(a.date) - parseDateKey(b.date)) // 🔥 oldest → latest
    .slice(-5); // 🔥 last 5 relative to hover

  /* =========================
     4️⃣ SCALE
  ========================== */
  const allValues = [...months.map((m) => m.oi), ...micro.map((m) => m.oi)];

  const maxOI = Math.max(...allValues, 1);

  return (
    <div style={{ background: "#111827", padding: 12, borderRadius: 6, marginTop: 12 }}>
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h3 style={{ fontWeight: 700, color: "#c084fc", padding: 0,  margin: 0, }}>ROLLOVER</h3>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,

          marginTop: 16,
          padding: "10px 8px", // ✅ ADD

          borderRadius: 6, // ✅ ADD
          border: "1px solid rgba(255,255,255,0.06)", // ✅ ADD

          background: `
                repeating-linear-gradient(
                to right,
                rgba(255,255,255,0.06) 0px,
                rgba(255,255,255,0.06) 1px,
                transparent 1px,
                transparent 12px
                ),
                repeating-linear-gradient(
                to bottom,
                rgba(255,255,255,0.05) 0px,
                rgba(255,255,255,0.05) 1px,
                transparent 1px,
                transparent 12px
                ),
                linear-gradient(180deg,#0b0b0c,#111)
            `,

                    boxShadow: `
                inset 0 0 8px rgba(0,0,0,.5)
            `,
        }}
      >
        {months.map((m, i) => {
          const isToday = currentDate === latestDate && m.key === "asOfTodayOi";

          const isLastExpiry = i === months.length - 2;

          const isPrevExpiry = i === months.length - 3;

          let color = "#3b82f6";

          if (isPrevExpiry) color = "#f59e0b";
          if (isLastExpiry) color = "#69696b";
          if (isToday) color = "#22c55e";

          const widthPct = Math.max((m.oi / maxOI) * 100, 5);

          const insertMicro = i === months.length - 2 && micro.length > 1;

          return (
            <div key={m.key}>
              {/* 🔥 MAIN BAR */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  height: 8,
                }}
              >
                {/* LABEL */}
                <div style={{ width: 24, fontSize: 9 }}>
                  {m.key === "asOfTodayOi" ? "Tod" : m.key.split("_")[0]}
                </div>

                {/* BAR */}
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    background: "#111",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${widthPct}%`,
                      height: "100%",
                      background: color,
                      borderTopRightRadius: 3,
                      borderBottomRightRadius: 3,
                    }}
                  />
                </div>
              </div>

              {/* 🔥 MICRO BARS (INSERTED EXACTLY LIKE CARD) */}
              {insertMicro && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 2,
                  }}
                >
                  <div style={{ width: 24, fontSize: 9 }}>
                    -{micro.length - 1}D
                  </div>

                  <div style={{ flex: 1 }}>
                    {micro
                      .slice(1)
                      .reverse()
                      .map((m2, idx) => {
                        const w = Math.max((m2.oi / maxOI) * 100, 5);

                        return (
                          <div
                            key={idx}
                            style={{
                              height: 3,
                              width: `${w}%`,
                              background: "#a9865b",
                              marginTop: 2,
                              borderTopRightRadius: 2,
                              borderBottomRightRadius: 2,
                            }}
                          />
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
