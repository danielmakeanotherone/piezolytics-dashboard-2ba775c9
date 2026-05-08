import { createFileRoute } from "@tanstack/react-router";
import { type CSSProperties, useMemo, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { useFloorData } from "@/hooks/use-floor-data";
import { useUserTiles } from "@/hooks/use-user-tiles";
import { ZONE_ORDER } from "@/lib/floor-data";

export const Route = createFileRoute("/heatmap")({
  head: () => ({
    meta: [
      { title: "Heat Map — Piezolytics" },
      { name: "description", content: "Activity heat map across registered floor tiles." },
    ],
  }),
  component: HeatMapPage,
});

type RangeKey = "Day" | "Week" | "Month" | "Quarter" | "Year" | "All";
const RANGES: RangeKey[] = ["Day", "Week", "Month", "Quarter", "Year", "All"];

function HeatMapPage() {
  const { events, conn, lastUpdate, refresh, clearAll } = useFloorData();
  const { tiles, loading } = useUserTiles();
  const [range, setRange] = useState<RangeKey>("Week");

  const tagged = useMemo(
    () =>
      events.map((e) => {
        const idx = ZONE_ORDER.indexOf(e.sensor);
        return { ...e, tileNumber: idx >= 0 ? idx + 1 : -1 };
      }),
    [events],
  );

  const cfg = useMemo(() => {
    switch (range) {
      case "Day":
        return { count: 24, labels: (i: number) => (i % 3 === 0 ? `${i.toString().padStart(2, "0")}h` : "") };
      case "Week":
        return { count: 7, labels: (i: number) => ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i] };
      case "Month":
        return { count: 30, labels: (i: number) => (i % 5 === 0 ? `d${i + 1}` : "") };
      case "Quarter":
        return { count: 13, labels: (i: number) => `W${i + 1}` };
      case "Year":
        return { count: 12, labels: (i: number) => ["J","F","M","A","M","J","J","A","S","O","N","D"][i] };
      case "All":
        return { count: 5, labels: (i: number) => `${new Date().getFullYear() - (4 - i)}` };
    }
  }, [range]);

  const matrix = useMemo(() => {
    // rows = tiles, cols = cfg.count
    const rows = tiles.map((t) => {
      const buckets = new Array<number>(cfg.count).fill(0);
      const tileEvents = tagged.filter((e) => e.tileNumber === t.tile_number);
      const now = new Date();
      for (const e of tileEvents) {
        const d = new Date(e.epoch);
        let idx = -1;
        if (range === "Day") {
          if (d.toDateString() === now.toDateString()) idx = d.getHours();
        } else if (range === "Week") {
          const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
          if (diffDays >= 0 && diffDays < 7) idx = 6 - diffDays;
        } else if (range === "Month") {
          const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
          if (diffDays >= 0 && diffDays < 30) idx = 29 - diffDays;
        } else if (range === "Quarter") {
          const diffWeeks = Math.floor((now.getTime() - d.getTime()) / (86400000 * 7));
          if (diffWeeks >= 0 && diffWeeks < cfg.count) idx = cfg.count - 1 - diffWeeks;
        } else if (range === "Year") {
          if (d.getFullYear() === now.getFullYear()) idx = d.getMonth();
        } else {
          const diffYears = now.getFullYear() - d.getFullYear();
          if (diffYears >= 0 && diffYears < 5) idx = 4 - diffYears;
        }
        if (idx >= 0) buckets[idx]++;
      }
      return { tile: t, buckets };
    });
    return rows;
  }, [tiles, tagged, cfg.count, range]);

  const heatMax = Math.max(1, ...matrix.flatMap((r) => r.buckets));

  return (
    <div className="min-h-screen bg-bg text-text">
      <NavBar conn={conn} lastUpdate={lastUpdate} onRefresh={refresh} onClear={clearAll} />
      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-text" style={{ fontSize: 28, fontWeight: 600 }}>
              Heat Map
            </h1>
            <p className="text-text3 text-sm mt-1">
              Activity intensity across each registered tile over time.
            </p>
          </div>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--surf2)", border: "1px solid var(--bord2)" }}>
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                style={{
                  background: r === range ? "var(--surf3)" : "transparent",
                  color: r === range ? "var(--acc)" : "var(--text2)",
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-text3 text-sm">Loading tiles…</div>
        ) : tiles.length === 0 ? (
          <div className="panel p-10 text-center">
            <div className="text-text2 text-base mb-1">No tiles registered</div>
            <div className="text-text3 text-sm">
              Add tiles in Tile Manager to start visualizing the heat map.
            </div>
          </div>
        ) : (
          <div className="panel p-6">
            <div className="flex flex-col gap-2">
              {matrix.map(({ tile, buckets }) => (
                <div key={tile.id} className="grid items-center gap-3" style={{ gridTemplateColumns: "180px 1fr 64px" }}>
                  <div className="min-w-0">
                    <div className="text-text text-sm truncate">{tile.label || `Tile ${tile.tile_number}`}</div>
                    <div className="font-mono text-text3 text-[11px]">tile_{tile.tile_number}</div>
                  </div>
                  <div className="iso-heatstrip" style={{ gridTemplateColumns: `repeat(${cfg.count}, 1fr)` } as CSSProperties}>
                    {buckets.map((v, i) => (
                      <span
                        key={i}
                        className="iso-heatcell iso-heatcell-red"
                        style={{ "--t": (v / heatMax).toFixed(3) } as CSSProperties}
                        title={`${cfg.labels(i) || `#${i + 1}`}: ${v}`}
                      />
                    ))}
                  </div>
                  <div className="text-right font-mono text-text2 text-[12px]">
                    {buckets.reduce((s, v) => s + v, 0)}
                  </div>
                </div>
              ))}
            </div>
            <div
              className="iso-heatstrip-axis mt-3"
              style={{ gridTemplateColumns: `repeat(${cfg.count}, 1fr)`, marginLeft: 192, marginRight: 76 } as CSSProperties}
            >
              {Array.from({ length: cfg.count }).map((_, i) => (
                <span key={i} className="iso-heatstrip-tick">{cfg.labels(i)}</span>
              ))}
            </div>
            <div className="iso-heatlegend mt-4">
              <span className="iso-heatlegend-label">Less</span>
              <span className="iso-heatlegend-scale">
                {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => (
                  <span key={t} className="iso-heatcell iso-heatcell-red iso-heatlegend-cell" style={{ "--t": t.toFixed(2) } as CSSProperties} />
                ))}
              </span>
              <span className="iso-heatlegend-label">More events</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
