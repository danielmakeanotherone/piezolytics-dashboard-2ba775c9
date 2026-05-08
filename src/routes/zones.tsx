import { createFileRoute } from "@tanstack/react-router";
import { NavBar } from "@/components/NavBar";
import { useFloorData } from "@/hooks/use-floor-data";
import { ZONE_LABELS, ZONE_ORDER, formatTime } from "@/lib/floor-data";

export const Route = createFileRoute("/zones")({
  head: () => ({
    meta: [
      { title: "Tile Manager — Piezolytics" },
      { name: "description", content: "Per-zone breakdown of floor traffic." },
    ],
  }),
  component: ZonesPage,
});

function ZonesPage() {
  const { events, stats, conn, lastUpdate, refresh, clearAll } = useFloorData();

  return (
    <div className="min-h-screen bg-bg text-text">
      <NavBar conn={conn} lastUpdate={lastUpdate} onRefresh={refresh} onClear={clearAll} />
      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <h1 className="font-display text-text mb-6" style={{ fontSize: 28, fontWeight: 600 }}>
          Tile Manager
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ZONE_ORDER.map((z) => {
            const c = stats.counts[z];
            const recent = events.filter((e) => e.sensor === z).sort((a, b) => b.epoch - a.epoch).slice(0, 8);
            const norm = stats.maxCount ? c / stats.maxCount : 0;
            return (
              <div key={z} className="panel p-6">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-text text-lg font-medium">{ZONE_LABELS[z]}</h2>
                  <span style={{ color: "var(--acc)", fontSize: 28, fontWeight: 700 }}>{c}</span>
                </div>
                <div className="mt-2 text-text3 text-xs">
                  {(stats.total ? (c / stats.total) * 100 : 0).toFixed(1)}% of total traffic
                </div>
                <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surf3)" }}>
                  <div
                    style={{
                      width: `${Math.max(4, norm * 100)}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, var(--acc3), var(--acc))",
                    }}
                  />
                </div>
                <div className="mt-5">
                  <div className="text-text3 text-[11px] uppercase tracking-wider mb-2">Recent events</div>
                  {recent.length === 0 && <div className="text-text3 text-sm">No events.</div>}
                  {recent.map((e, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm py-1.5 border-b last:border-b-0"
                      style={{ borderColor: "var(--bord2)" }}
                    >
                      <span className="text-text2 font-mono text-[12px]">{formatTime(e.epoch)}</span>
                      <span style={{ color: "var(--acc)", fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
                        {e.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
