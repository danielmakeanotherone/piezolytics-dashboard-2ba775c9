import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { useFloorData } from "@/hooks/use-floor-data";
import { useUserTiles } from "@/hooks/use-user-tiles";
import { ZONE_ORDER, formatTime } from "@/lib/floor-data";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — Piezolytics" },
      { name: "description", content: "Per-tile event log of floor sensor activity." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { events, conn, lastUpdate, refresh, clearAll } = useFloorData();
  const { tiles, loading } = useUserTiles();
  const [filter, setFilter] = useState<number | "all">("all");

  // Map each event's sensor key → tile_# (sensor index in ZONE_ORDER + 1)
  const tagged = useMemo(
    () =>
      events.map((e) => {
        const idx = ZONE_ORDER.indexOf(e.sensor);
        const tileNumber = idx >= 0 ? idx + 1 : -1;
        return { ...e, tileNumber };
      }),
    [events],
  );

  const registeredNums = useMemo(() => new Set(tiles.map((t) => t.tile_number)), [tiles]);
  const labelByNum = useMemo(() => {
    const m = new Map<number, string>();
    for (const t of tiles) m.set(t.tile_number, t.label || `Tile ${t.tile_number}`);
    return m;
  }, [tiles]);

  // Each event is one VISIT on a tile; direction is which side (A or B) was stepped on first.
  const enriched = useMemo(() => {
    return tagged
      .filter((e) => registeredNums.has(e.tileNumber))
      .map((e) => {
        const dir: "A→B" | "B→A" | null =
          e.firstTile === 1 ? "A→B" : e.firstTile === 2 ? "B→A" : null;
        const dwellMs =
          (e.dwellAMs ?? 0) + (e.dwellBMs ?? 0) || null;
        return { ...e, direction: dir, dwellMs };
      });
  }, [tagged, registeredNums]);

  const rows = enriched
    .filter((e) => filter === "all" || e.tileNumber === filter)
    .sort((a, b) => b.epoch - a.epoch);

  const perTileCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const e of tagged) {
      if (!registeredNums.has(e.tileNumber)) continue;
      counts.set(e.tileNumber, (counts.get(e.tileNumber) ?? 0) + 1);
    }
    return counts;
  }, [tagged, registeredNums]);

  return (
    <div className="min-h-screen bg-bg text-text">
      <NavBar conn={conn} lastUpdate={lastUpdate} onRefresh={refresh} onClear={clearAll} />
      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-text" style={{ fontSize: 28, fontWeight: 600 }}>
              History
            </h1>
            <p className="text-text3 text-sm mt-1">
              Event history for each tile registered in Tile Manager.
            </p>
          </div>
          {tiles.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>
                All
              </FilterBtn>
              {tiles.map((t) => (
                <FilterBtn
                  key={t.id}
                  active={filter === t.tile_number}
                  onClick={() => setFilter(t.tile_number)}
                >
                  {t.label || `Tile ${t.tile_number}`}
                  <span className="ml-1.5 text-text3 font-mono text-[11px]">
                    tile_{t.tile_number}
                  </span>
                </FilterBtn>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-text3 text-sm">Loading tiles…</div>
        ) : tiles.length === 0 ? (
          <div className="panel p-10 text-center">
            <div className="text-text2 text-base mb-1">No tiles registered</div>
            <div className="text-text3 text-sm">
              Add tiles in Tile Manager to start tracking their history.
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
              {tiles.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setFilter(t.tile_number)}
                  className="panel p-4 text-left transition-colors"
                  style={{
                    borderColor: filter === t.tile_number ? "var(--acc)" : undefined,
                  }}
                >
                  <div className="font-display text-text truncate" style={{ fontSize: 16, fontWeight: 600 }}>
                    {t.label || `Tile ${t.tile_number}`}
                  </div>
                  <div className="font-mono text-text3 text-[11px] mt-0.5">
                    tile_{t.tile_number}
                  </div>
                  <div className="mt-2 text-text2 text-sm">
                    <span className="font-mono text-text" style={{ fontSize: 18, fontWeight: 600 }}>
                      {perTileCounts.get(t.tile_number) ?? 0}
                    </span>{" "}
                    <span className="text-text3 text-[11px] uppercase tracking-wider">events</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="panel p-6">
              <div
                className="grid text-text3 text-[11px] uppercase tracking-wider px-3 py-2"
                style={{ gridTemplateColumns: "180px 1.4fr 110px 120px", borderBottom: "1px solid var(--bord2)" }}
              >
                <div>Time</div>
                <div>Transition</div>
                <div>Dwell</div>
                <div className="text-right">Signal</div>
              </div>
              <div className="max-h-[60vh] overflow-auto">
                {rows.length === 0 && (
                  <div className="text-text3 text-sm py-12 text-center">
                    No events recorded for this selection yet.
                  </div>
                )}
                {rows.map((e, i) => {
                  const tileLabel = labelByNum.get(e.tileNumber) ?? `Tile ${e.tileNumber}`;
                  return (
                    <div
                      key={`${e.epoch}-${i}`}
                      className="grid items-center px-3 py-2 text-sm"
                      style={{ gridTemplateColumns: "180px 1.4fr 110px 120px", borderBottom: "1px solid rgba(74,60,42,.4)" }}
                    >
                      <div className="text-text2 font-mono text-[12px]">{formatTime(e.epoch)}</div>
                      <div className="text-text truncate">
                        <span className="text-text2">{tileLabel}</span>
                        {e.direction && (
                          <span
                            className="ml-2 inline-block px-2 py-0.5 rounded font-mono text-[11px]"
                            style={{
                              background: "rgba(200,168,118,0.10)",
                              color: "var(--acc)",
                              border: "1px solid rgba(200,168,118,0.20)",
                            }}
                          >
                            {e.direction === "A→B" ? "A → B" : "B → A"}
                          </span>
                        )}
                      </div>
                      <div className="text-text2 font-mono text-[12px]">
                        {e.dwellMs != null ? formatDuration(e.dwellMs) : "—"}
                      </div>
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
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return rs ? `${m}m ${rs}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
}

function FilterBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs transition-colors"
      style={{
        background: active ? "var(--surf3)" : "var(--surf2)",
        color: active ? "var(--acc)" : "var(--text2)",
        border: "1px solid var(--bord2)",
      }}
    >
      {children}
    </button>
  );
}
