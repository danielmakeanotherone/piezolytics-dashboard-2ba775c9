import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { NavBar } from "@/components/NavBar";
import { useFloorData } from "@/hooks/use-floor-data";
import { useTiles } from "@/hooks/use-tiles";
import { formatTime, tileKey, tileLabel } from "@/lib/floor-data";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — Piezolytics" },
      { name: "description", content: "Full event log of floor sensor activity." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { tiles } = useTiles();
  const { events, conn, lastUpdate, refresh, clearAll } = useFloorData(tiles);
  const [filter, setFilter] = useState<string>("all");

  const labelByKey = new Map(tiles.map((t) => [tileKey(t.number), tileLabel(t)]));

  const rows = [...events]
    .filter((e) => filter === "all" || e.sensor === filter)
    .sort((a, b) => b.epoch - a.epoch);

  return (
    <div className="min-h-screen bg-bg text-text">
      <NavBar conn={conn} lastUpdate={lastUpdate} onRefresh={refresh} onClear={clearAll} />
      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="font-display text-text" style={{ fontSize: 28, fontWeight: 600 }}>
            History
          </h1>
          <div className="flex gap-1.5 flex-wrap">
            {(["all", ...tiles.map((t) => tileKey(t.number))]).map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                style={{
                  background: filter === k ? "var(--surf3)" : "var(--surf2)",
                  color: filter === k ? "var(--acc)" : "var(--text2)",
                  border: "1px solid var(--bord2)",
                }}
              >
                {k === "all" ? "All" : labelByKey.get(k) ?? k}
              </button>
            ))}
          </div>
        </div>

        <div className="panel p-6">
          <div
            className="grid text-text3 text-[11px] uppercase tracking-wider px-3 py-2"
            style={{ gridTemplateColumns: "200px 1fr 1fr 120px", borderBottom: "1px solid var(--bord2)" }}
          >
            <div>Time</div>
            <div>Tile</div>
            <div>Sensor key</div>
            <div className="text-right">Signal</div>
          </div>
          <div className="max-h-[70vh] overflow-auto">
            {rows.length === 0 && (
              <div className="text-text3 text-sm py-12 text-center">No events match this filter.</div>
            )}
            {rows.map((e, i) => (
              <div
                key={`${e.epoch}-${i}`}
                className="grid items-center px-3 py-2 text-sm"
                style={{ gridTemplateColumns: "200px 1fr 1fr 120px", borderBottom: "1px solid rgba(74,60,42,.4)" }}
              >
                <div className="text-text2 font-mono text-[12px]">{formatTime(e.epoch)}</div>
                <div className="text-text">{labelByKey.get(e.sensor) ?? e.sensor}</div>
                <div className="text-text3 font-mono text-[12px]">{e.sensor}</div>
                <div className="text-right">
                  <span
                    className="inline-block px-2.5 py-0.5 rounded-md font-mono text-[12px]"
                    style={{
                      background: "rgba(200,168,118,0.12)",
                      color: "var(--acc)",
                      border: "1px solid rgba(200,168,118,0.22)",
                    }}
                  >
                    {e.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
